// ════════════════════════════════════════════════════════════════════════
// App state — every backend call goes through lib/backend.ts, which is the
// mock/live switch (DEV_USE_MOCKS): mock mode runs fully local exactly as the
// rebuild always has; live mode is Clerk + REST + RevenueCat with the same
// signatures. This module stays optimistic-local-first in both modes — remote
// mirrors reconcile behind the local writes; hydrate() replaces the local
// snapshot with the server's on boot/login when a session exists.
// ════════════════════════════════════════════════════════════════════════

import { FREE_DAILY_LIMIT, PERSONA_PRESETS, pickOpener } from '@aura/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { DEFAULT_COMPANIONS } from '@/constants/companions';
import { DEMO } from '@/constants/demo';
import { DEV_FORCE_PREMIUM, DEV_USE_MOCKS } from '@/constants/devFlags';
import { ApiError } from '@/lib/api';
import * as backend from '@/lib/backend';
import type {
  AccountStatus,
  Companion,
  Hydration,
  MemoryRow,
  Message,
  TurnResult,
} from '@/lib/models';
import { migrateProfile, type UserProfile } from '@/lib/profile';
import {
  canArchive,
  canCreate,
  canDelete,
  canRestore,
  inferPersonaKey,
  nextPrimaryAfter,
  planRestore,
  type RosterCheck,
} from '@/lib/roster';

// ── Types ──────────────────────────────────────────────────────────────────

// Companion and Message live in @/lib/models (shared with the seam layer);
// re-exported here for existing importers.
export type { Companion, Message } from '@/lib/models';

// UserProfile (and its storage migration) live in @/lib/profile — pure and
// unit-tested; re-exported here for existing importers.
export type { UserProfile } from '@/lib/profile';

export interface SafetyState {
  breakReminder: string | null;
  showDisclosure: boolean;
}

export interface Usage {
  used: number;
  limit: number;
  /** YYYY-MM-DD the counter belongs to; a new day resets `used`. */
  day: string;
}

export interface VoiceUsage {
  /** Seconds of voice-call time used this month (server meters this — GET /api/voice/usage). */
  seconds: number;
  /** YYYY-MM the meter belongs to; a new month resets it. */
  month: string;
}

/** What a completed send gives the chat screen (the reveal is presentation, state is here). */
export interface SendResult {
  assistant?: Message;
  limitReached?: { used: number; limit: number };
  /** The send never reached the server (network) — the user message is marked 'failed'. */
  failed?: boolean;
  /** Input moderation held the message back — the user message is marked 'blocked'. */
  blocked?: boolean;
}

/** Everything a create needs from the screen; lifecycle fields are the context's business. */
export type CreateCompanionInput = Omit<
  Companion,
  'id' | 'isDefault' | 'archivedAt' | 'lastMessage' | 'lastActiveAt' | 'messageCount'
>;

/** Create either lands (with the new local id) or names which at-limit sheet to show (spec §4). */
export type CreateCompanionResult = { ok: true; id: string } | { ok: false; block: 'active_full' | 'total_full' };

interface AppContextType {
  user: UserProfile | null;
  companions: Companion[];
  /** The companion pinned to Home. Backed by users.primaryCompanionId (PUT /api/auth/me). */
  primaryCompanionId: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  messages: Record<string, Message[]>;
  /** Companions with a reply currently in flight — surfaces "typing…" outside the chat. */
  typing: Record<string, boolean>;
  usage: Usage;
  voiceUsage: VoiceUsage;
  /** Add elapsed call seconds to this month's voice meter (mock of server-side metering). */
  addVoiceSeconds: (seconds: number) => void;
  /** Per-companion remembered facts. undefined = not loaded yet (show skeleton); [] = real zero state. */
  memories: Record<string, MemoryRow[] | undefined>;
  accountStatus: AccountStatus;
  safetyState: SafetyState;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;

  setPrimaryCompanion: (id: string) => void;
  /** Cap-gated create (spec §4). The first companion ever also seeds the persona's opener message
   * and pins itself to Home — that is the onboarding #1 path (spec §10). */
  createCompanion: (companion: CreateCompanionInput) => CreateCompanionResult;
  updateCompanion: (id: string, updates: Partial<Omit<Companion, 'id'>>) => void;
  /** Single + batch lifecycle ops — each returns why it refused (min-1-active, caps, base). */
  archiveCompanion: (id: string) => RosterCheck;
  restoreCompanion: (id: string) => RosterCheck;
  deleteCompanion: (id: string) => RosterCheck;
  archiveMany: (ids: string[]) => RosterCheck;
  deleteMany: (ids: string[]) => RosterCheck;
  /** Batch restore fills the remaining active slots and reports the rest (spec §6). */
  restoreMany: (ids: string[]) => { restored: number; blocked: number };
  /** Clear conversation: wipes the transcript, keeps the companion and its memories (spec §7). */
  clearConversation: (id: string) => void;
  /** Forget everything: wipes transcript + memories, keeps the companion shell (spec §7). */
  forgetEverything: (id: string) => void;

  getMessagesForCompanion: (companionId: string) => Message[];
  addMessage: (companionId: string, message: Omit<Message, 'id'>) => void;
  /** Remove a message (used by the failed-send retry, which re-sends the content). */
  removeMessage: (companionId: string, messageId: string) => void;
  /** Send a turn through the (mock) chat pipeline; appends both sides + returns the assistant turn. */
  sendTurn: (
    companionId: string,
    content: string,
    sessionTurnCount: number,
    opts?: { inputModality?: 'text' | 'voice'; audioUri?: string },
  ) => Promise<SendResult>;

  loadMemories: (companionId: string) => Promise<void>;
  editMemory: (companionId: string, id: string, fact: string) => Promise<void>;
  removeMemory: (companionId: string, id: string) => Promise<void>;

  softDelete: () => Promise<AccountStatus>;
  reactivate: () => Promise<void>;
  requestExport: () => Promise<void>;

  purchasePremium: (plan?: 'monthly' | 'yearly') => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  refreshEntitlements: () => Promise<void>;

  setBreakReminder: (message: string | null) => void;
  dismissDisclosure: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ── Demo fixtures → initial state ───────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

// First run tells Maya's canonical story (18/30 used); later days reset honestly.
// (DEFAULT_COMPANIONS — the canonical trio — now lives in constants/companions,
// shared with lib/live.ts for server-row mapping.)
const SEED_USAGE: Usage = { used: DEMO.user.usage.used, limit: FREE_DAILY_LIMIT, day: today() };

let seedCounter = 0;
const localId = () => `local-${Date.now().toString(36)}-${(seedCounter++).toString(36)}`;

/** Aurora's canonical in-progress conversation, timed to "earlier today". */
function seedConversation(): Record<string, Message[]> {
  const base = Date.now() - 1000 * 60 * 42; // started ~42 minutes ago
  return {
    aurora: DEMO.conversation.map((turn, i) => ({
      id: `seed-${i}`,
      role: turn.from === 'user' ? 'user' : 'assistant',
      content: turn.text,
      createdAt: new Date(base + i * 1000 * 60 * 4).toISOString(),
    })),
  };
}



// ── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [companions, setCompanions] = useState<Companion[]>(DEFAULT_COMPANIONS);
  const [primaryCompanionId, setPrimaryCompanionId] = useState('aurora');
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [usage, setUsage] = useState<Usage>(SEED_USAGE);
  const [voiceUsage, setVoiceUsage] = useState<VoiceUsage>({ seconds: 0, month: thisMonth() });
  const [memories, setMemories] = useState<Record<string, MemoryRow[] | undefined>>({});
  const [accountStatus, setAccountStatus] = useState<AccountStatus>({ status: 'active', deletedAt: null });
  const [safetyState, setSafetyState] = useState<SafetyState>({
    breakReminder: null,
    showDisclosure: true,
  });

  // Keep a live ref of usage for sendTurn's cap check (avoids a stale closure
  // without re-creating the callback per message).
  const usageRef = useRef(usage);
  usageRef.current = usage;
  const userRef = useRef(user);
  userRef.current = user;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const companionsRef = useRef(companions);
  companionsRef.current = companions;

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistMessages = (updated: Record<string, Message[]>) => {
    AsyncStorage.setItem('messages', JSON.stringify(updated)).catch(() => {});
  };
  const persistCompanions = (updated: Companion[]) => {
    AsyncStorage.setItem('companions', JSON.stringify(updated)).catch(() => {});
  };

  // Live mode: adopt the server snapshot wholesale (server ids, threads,
  // meters), merging server profile fields over the locally-stored ones so
  // client-only fields (thirdPartyAiConsentAt, avatarUri, bio) survive.
  const applyHydration = useCallback((h: Hydration) => {
    setUser((prev) => {
      const merged = { ...(prev ?? {}), ...h.user } as UserProfile;
      AsyncStorage.setItem('user', JSON.stringify(merged)).catch(() => {});
      return merged;
    });
    setCompanions(h.companions);
    persistCompanions(h.companions);
    setMessages(h.messages);
    persistMessages(h.messages);
    const primary = h.primaryCompanionId ?? '';
    setPrimaryCompanionId(primary);
    AsyncStorage.setItem('primaryCompanionId', primary).catch(() => {});
    if (h.usage) {
      const nextUsage: Usage = { used: h.usage.used, limit: h.usage.limit, day: today() };
      setUsage(nextUsage);
      AsyncStorage.setItem('usage', JSON.stringify(nextUsage)).catch(() => {});
    }
    if (h.voiceSeconds !== null) {
      const nextVoice: VoiceUsage = { seconds: h.voiceSeconds, month: thisMonth() };
      setVoiceUsage(nextVoice);
      AsyncStorage.setItem('voiceUsage', JSON.stringify(nextVoice)).catch(() => {});
    }
    setAccountStatus(h.accountStatus);
    // RevenueCat binds to the LOCAL user UUID (the server webhook validates it).
    void backend.configurePayments(h.user.id);
  }, []);

  const bootstrap = async () => {
    try {
      const [storedUser, storedMessages, storedCompanions, storedPrimary, storedUsage] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('messages'),
        AsyncStorage.getItem('companions'),
        AsyncStorage.getItem('primaryCompanionId'),
        AsyncStorage.getItem('usage'),
      ]);

      if (storedUser) setUser(migrateProfile(JSON.parse(storedUser)));
      if (storedCompanions) {
        // Migrations for rows persisted by earlier builds: `lastActive` display string →
        // ISO `lastActiveAt` (from the thread's newest message); missing first-class
        // `personaKey` → inferred once here (gallery id → name → traits heuristic); missing
        // `isDefault` → the anchor trio (their mock row id IS the persona key).
        const parsedCompanions = JSON.parse(storedCompanions) as (Companion & { lastActive?: string })[];
        const parsedMsgs: Record<string, Message[]> = storedMessages ? JSON.parse(storedMessages) : {};
        const migrated = parsedCompanions.map(({ lastActive: _legacy, ...c }) => {
          const next: Companion = {
            ...c,
            personaKey: c.personaKey ?? inferPersonaKey(c),
            isDefault: c.isDefault ?? ['aurora', 'orion', 'lyra'].includes(c.id),
          };
          if (!next.lastActiveAt) {
            const thread = parsedMsgs[c.id];
            const newest = thread?.[thread.length - 1]?.createdAt;
            if (newest) next.lastActiveAt = newest;
          }
          return next;
        });
        setCompanions(migrated);
      }
      if (storedPrimary) setPrimaryCompanionId(storedPrimary);

      // Seed Aurora's canonical thread on first run so every screen tells the
      // same story; real sessions accumulate on top and persist. (Mock mode
      // only — live threads come from hydrate() below.)
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      } else if (DEV_USE_MOCKS) {
        const seeded = seedConversation();
        setMessages(seeded);
        persistMessages(seeded);
        // Stamp the seeded thread's recency on the companion (kept in sync by
        // sendTurn from here on).
        const seedEnd = seeded.aurora?.[seeded.aurora.length - 1]?.createdAt;
        if (seedEnd) {
          setCompanions((prev) => {
            const updated = prev.map((c) => (c.id === 'aurora' ? { ...c, lastActiveAt: seedEnd } : c));
            persistCompanions(updated);
            return updated;
          });
        }
      }

      if (storedUsage) {
        const parsed = JSON.parse(storedUsage) as Usage;
        // New day → fresh counter (the server resets the daily cap).
        setUsage(parsed.day === today() ? parsed : { ...parsed, used: 0, day: today() });
      } else {
        AsyncStorage.setItem('usage', JSON.stringify(SEED_USAGE)).catch(() => {});
      }

      const storedVoice = await AsyncStorage.getItem('voiceUsage');
      if (storedVoice) {
        const parsed = JSON.parse(storedVoice) as VoiceUsage;
        // New month → fresh voice meter (the server resets the monthly cap).
        setVoiceUsage(parsed.month === thisMonth() ? parsed : { seconds: 0, month: thisMonth() });
      }

      if (DEV_USE_MOCKS) {
        setAccountStatus(await backend.fetchAccountStatus());
      } else {
        // Live: the server snapshot replaces the local paint when a session
        // exists; no session means the stored user is not a signed-in user.
        try {
          const h = await backend.hydrate();
          if (h) applyHydration(h);
          else setUser(null);
        } catch (err) {
          if (err instanceof ApiError && err.code === 'ACCOUNT_SUSPENDED') {
            setAccountStatus({ status: 'deactivated', deletedAt: null });
          }
          // Otherwise (server down, network): keep the local snapshot so the
          // app still opens; foreground refreshes reconcile later.
        }
      }
    } catch {}
    setIsLoading(false);
  };

  // ── Auth (backend.auth* — Clerk in live mode, instant no-ops in mock) ─────

  const login = useCallback(
    async (email: string, password: string) => {
      await backend.authLogin(email, password);

      if (!DEV_USE_MOCKS) {
        try {
          const h = await backend.hydrate();
          if (h) applyHydration(h);
          return;
        } catch (err) {
          if (err instanceof ApiError && err.code === 'ACCOUNT_SUSPENDED') {
            // Signed in to a soft-deleted account — surface the reactivate offer.
            setAccountStatus({ status: 'deactivated', deletedAt: null });
            return;
          }
          throw err;
        }
      }

      // Mock: a local session. firstName is a placeholder from the email until
      // the profile provides one.
      const profile: UserProfile = {
        firstName: email.split('@')[0],
        lastName: '',
        email,
        ageVerified: true,
        onboardingDone: true,
        aiDisclosureAccepted: true,
        thirdPartyAiConsentAt: new Date().toISOString(),
        isPremium: false,
      };
      setUser(profile);
      await AsyncStorage.setItem('user', JSON.stringify(profile));
      // Signing back in within the grace window reactivates a soft-deleted account.
      const status = await backend.fetchAccountStatus();
      if (status.status === 'deactivated') setAccountStatus(status);
    },
    [applyHydration],
  );

  const register = useCallback(async (email: string, password: string) => {
    // Live: Clerk signUp.create + email code (the verify-email screen attempts
    // it via backend.authVerifyEmail). Both modes keep a local profile mirror —
    // the onboarding steps that follow write names/DOB/consents into it.
    await backend.authRegister(email, password);
    const profile: UserProfile = {
      firstName: email.split('@')[0],
      lastName: '',
      email,
      ageVerified: false,
      onboardingDone: false,
      aiDisclosureAccepted: false,
      thirdPartyAiConsentAt: null,
      isPremium: false,
    };
    setUser(profile);
    await AsyncStorage.setItem('user', JSON.stringify(profile));
    // Onboarding seeds nothing (roster spec §1): a brand-new account starts with an EMPTY
    // roster; the 1-of-12 pick creates companion #1 (and its seeded opener). The demo trio
    // belongs to the sign-in path only.
    setCompanions([]);
    persistCompanions([]);
    setMessages({});
    persistMessages({});
    setPrimaryCompanionId('');
    await AsyncStorage.setItem('primaryCompanionId', '');
  }, []);

  const logout = useCallback(async () => {
    void backend.authSignOut();
    setUser(null);
    setCompanions(DEFAULT_COMPANIONS);
    setMessages({});
    setMemories({});
    await AsyncStorage.multiRemove(['user', 'companions', 'messages', 'primaryCompanionId']);
  }, []);

  const updateUser = useCallback(
    (updates: Partial<UserProfile>) => {
      setUser((prev) => {
        const updated = prev ? { ...prev, ...updates } : (updates as UserProfile);
        AsyncStorage.setItem('user', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
      // Live mirror: PUT /api/auth/me with whatever schema fields this update
      // carries. Completing onboarding seeds the default trio server-side, so
      // re-hydrate to adopt the server's companion ids before first chat.
      void backend
        .updateMe(updates)
        .then(() => {
          if (!DEV_USE_MOCKS && updates.onboardingDone === true) {
            return backend.hydrate().then((h) => {
              if (h) applyHydration(h);
            });
          }
        })
        .catch(() => {});
    },
    [applyHydration],
  );

  // ── Companions ────────────────────────────────────────────────────────────

  const setPrimaryCompanion = useCallback((id: string) => {
    setPrimaryCompanionId(id);
    AsyncStorage.setItem('primaryCompanionId', id).catch(() => {});
    void backend.remoteSetPrimary(id);
  }, []);

  const primaryRef = useRef(primaryCompanionId);
  primaryRef.current = primaryCompanionId;

  // Declared here (not in the Messages section below) because createCompanion seeds the opener.
  const appendMessage = useCallback((companionId: string, message: Message) => {
    setMessages((prev) => {
      const updated = { ...prev, [companionId]: [...(prev[companionId] ?? []), message] };
      persistMessages(updated);
      return updated;
    });
  }, []);

  const createCompanion = useCallback(
    (input: CreateCompanionInput): CreateCompanionResult => {
      const roster = companionsRef.current;
      const isPremium = !!(DEV_FORCE_PREMIUM || userRef.current?.isPremium);
      // The screens pre-check and show the at-limit sheets; this is the shared gate they use.
      const gate = canCreate(roster, isPremium);
      if (!gate.ok) return { ok: false, block: gate.block as 'active_full' | 'total_full' };

      // Partial-gate safety net (the server coerces authoritatively, spec §9): a free caller's
      // companion is the preset at its default traits + default look, renamed to taste.
      const preset = PERSONA_PRESETS.find((p) => p.id === input.personaKey);
      const companion: CreateCompanionInput =
        !isPremium && preset
          ? {
              ...input,
              traits: [preset.defaultTraits.warmth, preset.defaultTraits.energy, preset.defaultTraits.verbosity],
              lookId: undefined,
            }
          : input;

      // Onboarding #1 (spec §10): the very first companion greets first — a real, persisted
      // assistant message drawn from the persona's opener pool, {firstName} filled. Everyone
      // after starts from the user-initiated empty state.
      const isFirst = roster.length === 0;
      const opener = isFirst && preset ? pickOpener(preset, userRef.current?.firstName) : null;

      const localKey = localId();
      const now = new Date().toISOString();
      setCompanions((prev) => {
        const row: Companion = {
          ...companion,
          id: localKey,
          ...(opener ? { lastMessage: opener.slice(0, 80), lastActiveAt: now, messageCount: 1 } : {}),
        };
        const updated = [row, ...prev];
        persistCompanions(updated);
        return updated;
      });
      if (opener) appendMessage(localKey, { id: localId(), role: 'assistant', content: opener, createdAt: now });
      if (isFirst) setPrimaryCompanion(localKey); // Home needs a pin from day one

      // Remote mirror: adopt the server UUID (re-keying any messages already sent under the
      // local id), or roll the optimistic row back if a cap race slipped past the pre-check.
      void backend.remoteCreateCompanion(companion).then((remote) => {
        if (!remote) return;
        if ('limit' in remote) {
          setCompanions((prev) => {
            const updated = prev.filter((c) => c.id !== localKey);
            persistCompanions(updated);
            return updated;
          });
          setMessages((prev) => {
            if (!prev[localKey]) return prev;
            const rest = { ...prev };
            delete rest[localKey];
            persistMessages(rest);
            return rest;
          });
          return;
        }
        const server = remote.companion;
        setCompanions((prev) => {
          const updated = prev.map((c) => (c.id === localKey ? { ...c, ...server } : c));
          persistCompanions(updated);
          return updated;
        });
        setMessages((prev) => {
          if (!prev[localKey]) return prev;
          const { [localKey]: thread, ...rest } = prev;
          const updated = { ...rest, [server.id]: thread };
          persistMessages(updated);
          return updated;
        });
        if (primaryRef.current === localKey) setPrimaryCompanion(server.id);
      });
      return { ok: true, id: localKey };
    },
    [appendMessage, setPrimaryCompanion],
  );

  const updateCompanion = useCallback((id: string, updates: Partial<Omit<Companion, 'id'>>) => {
    const current = companionsRef.current.find((c) => c.id === id);
    setCompanions((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      persistCompanions(updated);
      return updated;
    });
    if (current) void backend.remoteUpdateCompanion({ ...current, ...updates });
  }, []);

  // Shared tail for archive/delete: apply the roster change, then re-pin Home to the next active
  // survivor when the pinned companion left (spec §6 — never leave Home pointing at nothing).
  // Batches land here once, after the whole batch settles.
  const applyLeaving = useCallback(
    (ids: string[], apply: (prev: Companion[]) => Companion[]) => {
      const roster = companionsRef.current;
      setCompanions((prev) => {
        const updated = apply(prev);
        persistCompanions(updated);
        return updated;
      });
      const nextPin = nextPrimaryAfter(roster, ids, primaryRef.current);
      if (nextPin !== primaryRef.current) setPrimaryCompanion(nextPin);
    },
    [setPrimaryCompanion],
  );

  // Archive: reversible soft-remove — hidden from the Active roster, messages/memory untouched,
  // restorable. Min-1-active is enforced here and again server-side.
  const archiveMany = useCallback(
    (ids: string[]): RosterCheck => {
      const gate = canArchive(companionsRef.current, ids);
      if (!gate.ok) return gate;
      const stamp = new Date().toISOString();
      applyLeaving(ids, (prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, archivedAt: stamp } : c)));
      for (const id of ids) void backend.remoteArchiveCompanion(id);
      return { ok: true };
    },
    [applyLeaving],
  );

  const archiveCompanion = useCallback((id: string): RosterCheck => archiveMany([id]), [archiveMany]);

  // Restore honors the active cap (spec §6/§8) — only re-activating consumes a slot.
  const restoreCompanion = useCallback((id: string): RosterCheck => {
    const isPremium = !!(DEV_FORCE_PREMIUM || userRef.current?.isPremium);
    const gate = canRestore(companionsRef.current, isPremium);
    if (!gate.ok) return gate;
    setCompanions((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, archivedAt: null } : c));
      persistCompanions(updated);
      return updated;
    });
    void backend.remoteRestoreCompanion(id);
    return { ok: true };
  }, []);

  // Batch restore fills up to the remaining slots and reports the rest, rather than
  // half-failing silently (spec §6).
  const restoreMany = useCallback((ids: string[]): { restored: number; blocked: number } => {
    const isPremium = !!(DEV_FORCE_PREMIUM || userRef.current?.isPremium);
    const { restoreIds, blockedCount } = planRestore(companionsRef.current, ids, isPremium);
    if (restoreIds.length > 0) {
      setCompanions((prev) => {
        const updated = prev.map((c) => (restoreIds.includes(c.id) ? { ...c, archivedAt: null } : c));
        persistCompanions(updated);
        return updated;
      });
      for (const id of restoreIds) void backend.remoteRestoreCompanion(id);
    }
    return { restored: restoreIds.length, blocked: blockedCount };
  }, []);

  // Delete: permanent — thread and memories go with it (the server cascades; the mock store
  // mirrors). Base personas are archive-only; min-1-active holds here too.
  const deleteMany = useCallback(
    (ids: string[]): RosterCheck => {
      const gate = canDelete(companionsRef.current, ids);
      if (!gate.ok) return gate;
      applyLeaving(ids, (prev) => prev.filter((c) => !ids.includes(c.id)));
      setMessages((prev) => {
        const updated = Object.fromEntries(Object.entries(prev).filter(([key]) => !ids.includes(key)));
        persistMessages(updated);
        return updated;
      });
      setMemories((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !ids.includes(key))));
      for (const id of ids) void backend.remoteDeleteCompanion(id);
      return { ok: true };
    },
    [applyLeaving],
  );

  const deleteCompanion = useCallback((id: string): RosterCheck => deleteMany([id]), [deleteMany]);

  // Clear conversation: a fresh page, same relationship — transcript wiped, memories kept (§7).
  const clearConversation = useCallback((id: string) => {
    setMessages((prev) => {
      const updated = { ...prev, [id]: [] };
      persistMessages(updated);
      return updated;
    });
    setCompanions((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, lastMessage: undefined, messageCount: 0 } : c));
      persistCompanions(updated);
      return updated;
    });
    void backend.remoteClearConversation(id);
  }, []);

  // Forget everything: transcript + memories wiped, the companion shell stays (§7).
  const forgetEverything = useCallback((id: string) => {
    setMessages((prev) => {
      const updated = { ...prev, [id]: [] };
      persistMessages(updated);
      return updated;
    });
    setMemories((prev) => ({ ...prev, [id]: [] }));
    setCompanions((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, lastMessage: undefined, messageCount: 0 } : c));
      persistCompanions(updated);
      return updated;
    });
    void backend.remoteForgetCompanion(id);
  }, []);

  // ── Messages ──────────────────────────────────────────────────────────────

  const getMessagesForCompanion = useCallback(
    (companionId: string): Message[] => messages[companionId] ?? [],
    [messages],
  );

  const addMessage = useCallback(
    (companionId: string, message: Omit<Message, 'id'>) => {
      appendMessage(companionId, { ...message, id: localId() });
    },
    [appendMessage],
  );

  const removeMessage = useCallback((companionId: string, messageId: string) => {
    setMessages((prev) => {
      const updated = {
        ...prev,
        [companionId]: (prev[companionId] ?? []).filter((m) => m.id !== messageId),
      };
      persistMessages(updated);
      return updated;
    });
  }, []);

  const setMessageStatus = useCallback((companionId: string, messageId: string, status: Message['status']) => {
    setMessages((prev) => {
      const updated = {
        ...prev,
        [companionId]: (prev[companionId] ?? []).map((m) => (m.id === messageId ? { ...m, status } : m)),
      };
      persistMessages(updated);
      return updated;
    });
  }, []);

  const sendTurn = useCallback(
    async (
      companionId: string,
      content: string,
      sessionTurnCount: number,
      opts?: { inputModality?: 'text' | 'voice'; audioUri?: string },
    ): Promise<SendResult> => {
      const currentUsage = usageRef.current;
      const isPremium = !!(DEV_FORCE_PREMIUM || userRef.current?.isPremium);

      // The server enforces the cap; the client checks first so the blocked
      // send never leaves the composer.
      if (!isPremium && currentUsage.used >= currentUsage.limit) {
        return { limitReached: { used: currentUsage.used, limit: currentUsage.limit } };
      }

      const companion = companionsRef.current.find((c) => c.id === companionId);
      const name = companion?.name ?? 'Your companion';
      // First-class base persona: every companion keeps its chosen gallery voice (fixed at
      // creation — identity is the voice pack). Legacy rows were migrated at bootstrap.
      const personaKey = companion?.personaKey ?? (companion ? inferPersonaKey(companion) : 'aurora');
      const assistantTurnCount = (messagesRef.current[companionId] ?? []).filter(
        (m) => m.role === 'assistant',
      ).length;

      // Optimistic user bubble.
      const userMsgId = localId();
      appendMessage(companionId, {
        id: userMsgId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        inputModality: opts?.inputModality,
        audioUri: opts?.audioUri,
      });

      setTyping((prev) => ({ ...prev, [companionId]: true }));
      let result: TurnResult;
      try {
        result = await backend.sendTurn({
          companionId,
          companionName: name,
          personaKey,
          content,
          assistantTurnCount,
          sessionTurnCount,
          usage: { used: currentUsage.used, limit: currentUsage.limit },
          isPremium,
        });
      } catch {
        // The send never reached the server — keep the bubble, mark it failed
        // so the thread offers a retry.
        setMessageStatus(companionId, userMsgId, 'failed');
        return { failed: true };
      } finally {
        setTyping((prev) => ({ ...prev, [companionId]: false }));
      }

      if (result.inputBlocked) {
        // Moderation held the message back (MESSAGE_STATUS 'blocked') — no reply.
        setMessageStatus(companionId, userMsgId, 'blocked');
        return { blocked: true };
      }

      if (result.limitReached) {
        // Server-side cap beat the client check — take the optimistic bubble
        // back (the composer restores the draft).
        removeMessage(companionId, userMsgId);
        return { limitReached: result.limitReached };
      }

      const assistant: Message = {
        // Live mode returns the server's message id — keeps the reply reportable.
        id: result.replyId ?? localId(),
        role: 'assistant',
        content: result.reply ?? '',
        createdAt: new Date().toISOString(),
        safetyFlagged: result.safetyFlagged,
        aiDisclosure: result.aiDisclosure,
      };
      appendMessage(companionId, assistant);

      if (!isPremium) {
        setUsage((prev) => {
          const next = { ...prev, used: prev.used + 1, day: today() };
          AsyncStorage.setItem('usage', JSON.stringify(next)).catch(() => {});
          return next;
        });
      }

      setCompanions((prev) => {
        const updated = prev.map((c) =>
          c.id === companionId
            ? {
                ...c,
                lastMessage: (result.reply ?? content).slice(0, 80),
                lastActiveAt: new Date().toISOString(),
                messageCount: (c.messageCount ?? 0) + 1,
              }
            : c,
        );
        persistCompanions(updated);
        return updated;
      });

      if (result.breakReminder) {
        setSafetyState((prev) => ({ ...prev, breakReminder: result.breakReminder! }));
      }

      return { assistant };
    },
    [appendMessage, removeMessage, setMessageStatus],
  );

  const addVoiceSeconds = useCallback((seconds: number) => {
    if (seconds <= 0) return;
    setVoiceUsage((prev) => {
      const next: VoiceUsage =
        prev.month === thisMonth()
          ? { seconds: prev.seconds + Math.round(seconds), month: prev.month }
          : { seconds: Math.round(seconds), month: thisMonth() };
      AsyncStorage.setItem('voiceUsage', JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  // ── Memories ──────────────────────────────────────────────────────────────

  const loadMemories = useCallback(async (companionId: string) => {
    const rows = await backend.fetchMemories(companionId);
    setMemories((prev) => ({ ...prev, [companionId]: rows }));
  }, []);

  const editMemory = useCallback(async (companionId: string, id: string, fact: string) => {
    // Optimistic edit, reconciled by the backend's response.
    setMemories((prev) => ({
      ...prev,
      [companionId]: (prev[companionId] ?? []).map((m) => (m.id === id ? { ...m, fact } : m)),
    }));
    await backend.updateMemory(id, { fact });
  }, []);

  const removeMemory = useCallback(async (companionId: string, id: string) => {
    setMemories((prev) => ({
      ...prev,
      [companionId]: (prev[companionId] ?? []).filter((m) => m.id !== id),
    }));
    await backend.deleteMemory(id);
  }, []);

  // ── Account lifecycle ─────────────────────────────────────────────────────

  const softDelete = useCallback(async () => {
    const status = await backend.softDeleteAccount();
    setAccountStatus(status);
    return status;
  }, []);

  const reactivate = useCallback(async () => {
    setAccountStatus(await backend.reactivateAccount());
  }, []);

  const requestExport = useCallback(async () => {
    await backend.requestDataExport();
  }, []);

  // ── Payments ──────────────────────────────────────────────────────────────

  const purchasePremium = useCallback(
    async (plan: 'monthly' | 'yearly' = 'monthly') => {
      const { isPremium } = await backend.purchasePremium(plan);
      if (isPremium) updateUser({ isPremium });
    },
    [updateUser],
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const { restored, isPremium } = await backend.restorePurchases();
    if (restored) updateUser({ isPremium });
    return restored;
  }, [updateUser]);

  const refreshEntitlements = useCallback(async () => {
    // GET /api/payments/entitlements — called on app foreground to reconcile
    // staleness. Best-effort: no session / server down is not an error state.
    try {
      const { isPremium } = await backend.fetchEntitlements();
      if (userRef.current && !!userRef.current.isPremium !== isPremium) updateUser({ isPremium });
    } catch {}
  }, [updateUser]);

  // Reconcile isPremium whenever the app returns to the foreground (the backend
  // fires its DB expiry check server-side on this call).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshEntitlements();
    });
    return () => sub.remove();
  }, [refreshEntitlements]);

  // ── Safety chrome ─────────────────────────────────────────────────────────

  const setBreakReminder = useCallback((message: string | null) => {
    setSafetyState((prev) => ({ ...prev, breakReminder: message }));
  }, []);

  const dismissDisclosure = useCallback(() => {
    setSafetyState((prev) => ({ ...prev, showDisclosure: false }));
  }, []);

  // DEV_FORCE_PREMIUM mock applies here — the one place every screen's `user.isPremium` read
  // resolves from, so no per-screen wiring is needed to preview premium-gated UI.
  const exposedUser = useMemo(
    () => (DEV_FORCE_PREMIUM && user ? { ...user, isPremium: true } : user),
    [user],
  );

  return (
    <AppContext.Provider
      value={{
        user: exposedUser,
        companions,
        primaryCompanionId,
        isAuthenticated: !!user,
        isLoading,
        messages,
        typing,
        usage,
        voiceUsage,
        addVoiceSeconds,
        memories,
        accountStatus,
        safetyState,
        login,
        register,
        logout,
        updateUser,
        setPrimaryCompanion,
        createCompanion,
        updateCompanion,
        archiveCompanion,
        restoreCompanion,
        deleteCompanion,
        archiveMany,
        deleteMany,
        restoreMany,
        clearConversation,
        forgetEverything,
        getMessagesForCompanion,
        addMessage,
        removeMessage,
        sendTurn,
        loadMemories,
        editMemory,
        removeMemory,
        softDelete,
        reactivate,
        requestExport,
        purchasePremium,
        restorePurchases,
        refreshEntitlements,
        setBreakReminder,
        dismissDisclosure,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export type { MemoryRow, AccountStatus } from '@/lib/models';
