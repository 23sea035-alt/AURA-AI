// ════════════════════════════════════════════════════════════════════════
// App state — mock-driven for the frontend rebuild.
//
// WIRE SEAM: every method that will eventually hit the backend delegates to
// client/lib/mock.ts, which mirrors the real endpoints one-to-one (each mock
// function documents the route it stands in for). Auth is a Clerk-shaped local
// shell: `login`/`register` resolve locally and the session lives in
// AsyncStorage; swapping in @clerk/clerk-expo replaces their bodies without
// touching any screen. Nothing else in the client imports the network layer.
// ════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { PERSONAS } from '@/constants/content';
import { DEMO } from '@/constants/demo';
import { DEV_FORCE_PREMIUM } from '@/constants/devFlags';
import * as mock from '@/lib/mock';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Companion {
  id: string;
  name: string;
  persona: string;
  traits: string[];
  colorFrom: string;
  colorTo: string;
  lastMessage?: string;
  lastActive?: string;
  messageCount?: number;
  /** Set when archived (soft-deleted): hidden from the roster, messages/memory untouched, restorable. */
  archivedAt?: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  /** Local URI of the captured audio clip when the message was dictated (push-to-talk). */
  audioUri?: string;
  /** How the user composed the message. Absent = text. */
  inputModality?: 'text' | 'voice';
  /** Set on an assistant turn the safety pipeline flagged as crisis — renders the inline support block. */
  safetyFlagged?: boolean;
  /** SB 243 recurring notice — this turn carries the quiet "you're talking to an AI" line. */
  aiDisclosure?: boolean;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  birthYear?: number;
  isMinor?: boolean;
  ageVerified?: boolean;
  onboardingDone?: boolean;
  aiDisclosureAccepted?: boolean;
  /** Apple 5.1.2(i) — unbundled consent to third-party AI processing (timestamp = auditable). */
  thirdPartyAiConsentAt?: string | null;
  isPremium?: boolean;
  bio?: string;
  avatarUri?: string;
  /** Chosen monogram tone for the initials avatar. Backed by users.avatarColor once the API lands. */
  avatarColor?: string;
}

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
}

interface AppContextType {
  user: UserProfile | null;
  companions: Companion[];
  /** The companion pinned to Home. Backed by users.primaryCompanionId (PUT /api/auth/me). */
  primaryCompanionId: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  messages: Record<string, Message[]>;
  usage: Usage;
  voiceUsage: VoiceUsage;
  /** Add elapsed call seconds to this month's voice meter (mock of server-side metering). */
  addVoiceSeconds: (seconds: number) => void;
  /** Per-companion remembered facts. undefined = not loaded yet (show skeleton); [] = real zero state. */
  memories: Record<string, mock.MemoryRow[] | undefined>;
  accountStatus: mock.AccountStatus;
  safetyState: SafetyState;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, birthYear?: number) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<UserProfile>) => void;

  setPrimaryCompanion: (id: string) => void;
  addCompanion: (companion: Omit<Companion, 'id'>) => void;
  updateCompanion: (id: string, updates: Partial<Omit<Companion, 'id'>>) => void;
  archiveCompanion: (id: string) => void;
  restoreCompanion: (id: string) => void;

  getMessagesForCompanion: (companionId: string) => Message[];
  addMessage: (companionId: string, message: Omit<Message, 'id'>) => void;
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

  softDelete: () => Promise<mock.AccountStatus>;
  reactivate: () => Promise<void>;
  requestExport: () => Promise<void>;

  purchasePremium: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  refreshEntitlements: () => Promise<void>;

  setBreakReminder: (message: string | null) => void;
  dismissDisclosure: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ── Demo fixtures → initial state ───────────────────────────────────────────

// Mirrors @aura/shared FREE_DAILY_LIMIT (the client re-reads it from the
// contract package once monorepo wiring lands).
const FREE_DAILY_LIMIT = 30;

const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

// First run tells Maya's canonical story (18/30 used); later days reset honestly.
const SEED_USAGE: Usage = { used: DEMO.user.usage.used, limit: FREE_DAILY_LIMIT, day: today() };

// The three canonical companions (docs/specs/personas.md): warm temperaments
// differentiated by relational stance, never functional archetypes. colorFrom/To
// are the stored fallback-duotone data for each companion (the curated portraits
// render for these three; created companions lean on the duotone).
const DEFAULT_COMPANIONS: Companion[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    persona:
      'Tender and attuned. Aurora meets you where you are, holds what you are feeling without rushing to fix it, and reflects it back so you feel understood and less alone.',
    traits: ['affectionate', 'calm', 'balanced'],
    colorFrom: '#D8A98C',
    colorTo: '#C4826B',
    lastActive: 'Just now',
    messageCount: DEMO.conversation.length,
  },
  {
    id: 'orion',
    name: 'Orion',
    persona:
      'Calm and clear-headed. When everything feels loud, Orion slows things down, helps you see the situation plainly, and reminds you that you are on solid ground.',
    traits: ['warm', 'calm', 'concise'],
    colorFrom: '#A9683F',
    colorTo: '#8A5637',
    messageCount: 0,
  },
  {
    id: 'lyra',
    name: 'Lyra',
    persona:
      'Warm and bright. Lyra brings lightness and a fresh angle, good at shifting your perspective with warmth and gentle humor when things feel heavy or flat.',
    traits: ['warm', 'playful', 'expansive'],
    colorFrom: '#D9B26A',
    colorTo: '#C69A4B',
    messageCount: 0,
  },
];

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

const lastSeedTurn = DEMO.conversation[DEMO.conversation.length - 1];

// ── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [companions, setCompanions] = useState<Companion[]>(DEFAULT_COMPANIONS);
  const [primaryCompanionId, setPrimaryCompanionId] = useState('aurora');
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [usage, setUsage] = useState<Usage>(SEED_USAGE);
  const [voiceUsage, setVoiceUsage] = useState<VoiceUsage>({ seconds: 0, month: thisMonth() });
  const [memories, setMemories] = useState<Record<string, mock.MemoryRow[] | undefined>>({});
  const [accountStatus, setAccountStatus] = useState<mock.AccountStatus>({ status: 'active', deletedAt: null });
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

  const bootstrap = async () => {
    try {
      const [storedUser, storedMessages, storedCompanions, storedPrimary, storedUsage] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('messages'),
        AsyncStorage.getItem('companions'),
        AsyncStorage.getItem('primaryCompanionId'),
        AsyncStorage.getItem('usage'),
      ]);

      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedCompanions) setCompanions(JSON.parse(storedCompanions));
      if (storedPrimary) setPrimaryCompanionId(storedPrimary);

      // Seed Aurora's canonical thread on first run so every screen tells the
      // same story; real sessions accumulate on top and persist.
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages));
      } else {
        const seeded = seedConversation();
        setMessages(seeded);
        persistMessages(seeded);
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

      setAccountStatus(await mock.fetchAccountStatus());
    } catch {}
    setIsLoading(false);
  };

  // ── Auth (Clerk seam: local shell, same shape) ────────────────────────────

  const login = useCallback(async (email: string, _password: string) => {
    // Clerk drop-in point: signIn.create → session token; here, a local session.
    const profile: UserProfile = {
      name: email.split('@')[0],
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
    const status = await mock.fetchAccountStatus();
    if (status.status === 'deactivated') setAccountStatus(status);
  }, []);

  const register = useCallback(async (name: string, email: string, _password: string, birthYear?: number) => {
    // Clerk drop-in point: signUp.create + email verification.
    const profile: UserProfile = {
      name,
      email,
      birthYear,
      ageVerified: false,
      onboardingDone: false,
      aiDisclosureAccepted: false,
      thirdPartyAiConsentAt: null,
      isPremium: false,
    };
    setUser(profile);
    await AsyncStorage.setItem('user', JSON.stringify(profile));
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setCompanions(DEFAULT_COMPANIONS);
    setMessages({});
    setMemories({});
    await AsyncStorage.multiRemove(['user', 'companions', 'messages', 'primaryCompanionId']);
  }, []);

  const updateUser = useCallback((updates: Partial<UserProfile>) => {
    // PUT /api/auth/me (accepts avatarColor + primaryCompanionId per 2026-06-30).
    setUser((prev) => {
      const updated = prev ? { ...prev, ...updates } : (updates as UserProfile);
      AsyncStorage.setItem('user', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // ── Companions ────────────────────────────────────────────────────────────

  const setPrimaryCompanion = useCallback((id: string) => {
    // PUT /api/auth/me { primaryCompanionId }
    setPrimaryCompanionId(id);
    AsyncStorage.setItem('primaryCompanionId', id).catch(() => {});
  }, []);

  const addCompanion = useCallback((companion: Omit<Companion, 'id'>) => {
    // POST /api/companions
    const newCompanion: Companion = { ...companion, id: localId() };
    setCompanions((prev) => {
      const updated = [newCompanion, ...prev];
      persistCompanions(updated);
      return updated;
    });
  }, []);

  const updateCompanion = useCallback((id: string, updates: Partial<Omit<Companion, 'id'>>) => {
    // PUT /api/companions/:id
    setCompanions((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      persistCompanions(updated);
      return updated;
    });
  }, []);

  // Soft-delete: hidden from the roster, but messages/memory stay keyed by companion id and
  // restoreCompanion brings it right back. Archiving the Home companion clears the pin rather
  // than leaving Home pointed at a companion that's no longer in the active roster.
  const archiveCompanion = useCallback(
    (id: string) => {
      setCompanions((prev) => {
        const updated = prev.map((c) => (c.id === id ? { ...c, archivedAt: new Date().toISOString() } : c));
        persistCompanions(updated);
        return updated;
      });
      if (primaryCompanionId === id) {
        setPrimaryCompanionId('');
        AsyncStorage.setItem('primaryCompanionId', '').catch(() => {});
      }
    },
    [primaryCompanionId],
  );

  const restoreCompanion = useCallback((id: string) => {
    setCompanions((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, archivedAt: null } : c));
      persistCompanions(updated);
      return updated;
    });
  }, []);

  // ── Messages ──────────────────────────────────────────────────────────────

  const getMessagesForCompanion = useCallback(
    (companionId: string): Message[] => messages[companionId] ?? [],
    [messages],
  );

  const appendMessage = useCallback((companionId: string, message: Message) => {
    setMessages((prev) => {
      const updated = { ...prev, [companionId]: [...(prev[companionId] ?? []), message] };
      persistMessages(updated);
      return updated;
    });
  }, []);

  const addMessage = useCallback(
    (companionId: string, message: Omit<Message, 'id'>) => {
      appendMessage(companionId, { ...message, id: localId() });
    },
    [appendMessage],
  );

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
      const personaKey = PERSONAS[name as keyof typeof PERSONAS] ? companionId : 'custom';
      const assistantTurnCount = (messagesRef.current[companionId] ?? []).filter(
        (m) => m.role === 'assistant',
      ).length;

      // Optimistic user bubble.
      appendMessage(companionId, {
        id: localId(),
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
        inputModality: opts?.inputModality,
        audioUri: opts?.audioUri,
      });

      const result = await mock.sendTurn({
        companionId,
        companionName: name,
        personaKey,
        content,
        assistantTurnCount,
        sessionTurnCount,
        usage: { used: currentUsage.used, limit: currentUsage.limit },
        isPremium,
      });

      if (result.limitReached) return { limitReached: result.limitReached };

      const assistant: Message = {
        id: localId(),
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
                lastActive: 'Just now',
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
    [appendMessage],
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
    const rows = await mock.fetchMemories(companionId);
    setMemories((prev) => ({ ...prev, [companionId]: rows }));
  }, []);

  const editMemory = useCallback(async (companionId: string, id: string, fact: string) => {
    // Optimistic edit, reconciled by the mock's response.
    setMemories((prev) => ({
      ...prev,
      [companionId]: (prev[companionId] ?? []).map((m) => (m.id === id ? { ...m, fact } : m)),
    }));
    await mock.updateMemory(id, { fact });
  }, []);

  const removeMemory = useCallback(async (companionId: string, id: string) => {
    setMemories((prev) => ({
      ...prev,
      [companionId]: (prev[companionId] ?? []).filter((m) => m.id !== id),
    }));
    await mock.deleteMemory(id);
  }, []);

  // ── Account lifecycle ─────────────────────────────────────────────────────

  const softDelete = useCallback(async () => {
    const status = await mock.softDeleteAccount();
    setAccountStatus(status);
    return status;
  }, []);

  const reactivate = useCallback(async () => {
    setAccountStatus(await mock.reactivateAccount());
  }, []);

  const requestExport = useCallback(async () => {
    await mock.requestDataExport();
  }, []);

  // ── Payments ──────────────────────────────────────────────────────────────

  const purchasePremium = useCallback(async () => {
    const { isPremium } = await mock.purchasePremium();
    updateUser({ isPremium });
  }, [updateUser]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    const { restored, isPremium } = await mock.restorePurchases();
    if (restored) updateUser({ isPremium });
    return restored;
  }, [updateUser]);

  const refreshEntitlements = useCallback(async () => {
    // GET /api/payments/entitlements — called on app foreground to reconcile staleness.
    const { isPremium } = await mock.fetchEntitlements();
    if (userRef.current && !!userRef.current.isPremium !== isPremium) updateUser({ isPremium });
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
        addCompanion,
        updateCompanion,
        archiveCompanion,
        restoreCompanion,
        getMessagesForCompanion,
        addMessage,
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

export type { MemoryRow, AccountStatus } from '@/lib/mock';
