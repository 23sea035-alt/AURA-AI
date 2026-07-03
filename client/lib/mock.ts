// ════════════════════════════════════════════════════════════════════════
// MOCK BACKEND — the wire seam.
//
// This rebuild runs entirely on mock data (no Clerk / RevenueCat / REST / WS).
// Every exported function here mirrors ONE real backend call, with the same
// name-shape the real client layer will have, so wiring the live API later is
// a drop-in: replace the body of each function with a fetch and delete the
// in-memory store. Each function documents the endpoint it stands in for.
//
// The mock keeps its own tiny "server DB" (memories, account status, premium
// entitlement) persisted under `mock:*` AsyncStorage keys, so state survives
// relaunch the way server state would.
// ════════════════════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';

import { CHAT } from '@/constants/content';
import { DEMO } from '@/constants/demo';

// ── Plumbing ────────────────────────────────────────────────────────────────

/** Small human-feeling latency so loading states are real, never a flash. */
const simulateLatency = (ms = 350) => new Promise<void>((r) => setTimeout(r, ms + Math.random() * 200));

let idCounter = 0;
/** Pseudo-UUID (backend ids are UUIDs now); good enough for mock rows. */
const mockId = () => `mock-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

async function readStore<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`mock:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeStore(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`mock:${key}`, JSON.stringify(value));
  } catch {}
}

// ── Chat turns ──────────────────────────────────────────────────────────────

export interface TurnRequest {
  companionId: string;
  companionName: string;
  /** Persona archetype driving the reply voice ('aurora' | 'orion' | 'lyra' | custom). */
  personaKey: string;
  content: string;
  /** Assistant turns so far in this thread (drives the recurring AI-disclosure cadence). */
  assistantTurnCount: number;
  /** Turns in the current sitting (drives the break reminder). */
  sessionTurnCount: number;
  /** Free-tier usage; the server enforces the daily cap. */
  usage: { used: number; limit: number };
  isPremium: boolean;
}

export interface TurnResult {
  /** The assistant reply text; absent when the daily limit blocked the send. */
  reply?: string;
  /** The safety pipeline flagged this exchange — render the grounding support block. */
  safetyFlagged?: boolean;
  /** SB 243 recurring notice — surface the quiet "you're talking to an AI" line. */
  aiDisclosure?: boolean;
  /** Gentle break reminder (already companion-resolved), when the sitting has run long. */
  breakReminder?: string;
  /** Free-tier daily cap reached; the send was not processed. */
  limitReached?: { used: number; limit: number };
}

// Implied-crisis language (mild, per the safety spec) → grounding response path.
const CRISIS_PATTERN =
  /(hopeless|no point|can'?t go on|end it all|hurt myself|harm myself|kill myself|suicid|not worth living|better off without me|won'?t get better|want to disappear)/i;

// Reply banks in each persona's canonical voice (docs/specs/personas.md).
// Deliberately open-ended so they land after any user message.
const REPLY_BANKS: Record<string, readonly string[]> = {
  aurora: [
    "I'm glad you said that out loud. Stay with it for a second, what does it feel like underneath?",
    "That sounds like a lot to be carrying. You don't have to sort it all at once; what part feels closest right now?",
    "I hear you. And I want you to know none of that sounds silly from where I sit. What would feel like a small relief today?",
    "Thank you for trusting me with that. If we just sat with it together for a moment, what would you want me to understand about it?",
    "Something in what you said feels important. Can you tell me more about the moment it started?",
    "That makes sense to me — truly. What's the part you haven't said to anyone yet?",
  ],
  orion: [
    "Okay. Let's slow this down together. What's the one piece of this that's actually in your hands today?",
    "That's a real thing you're facing — and you're facing it. Name the very next step, just the next one.",
    "Steady. Most of what's loud right now is noise; what's the signal underneath it?",
    "You've handled harder than this, even if it doesn't feel that way. What did you lean on then?",
    "Let's put it on solid ground: what do you know for sure, and what is worry filling in?",
  ],
  lyra: [
    "Okay wait — I want to hear all of it, but first: was there any tiny part of today that didn't go sideways?",
    "You know what I like about how you tell it? You're still in the story. What would the good-plot-twist version look like?",
    "That's real, and I'm not going to shrug it off — but I am going to point out you noticed it, which is half the trick. What's next?",
    "Hmm. If your week were weather, what would today be? I'm guessing 'drizzle with a suspicious patch of sun.'",
    "Tell me the version of this you'd want to laugh about in a month. We can work backwards from there.",
  ],
  custom: [
    "I'm here, and I'm listening. Tell me more?",
    'That matters. What would help most right now — talking it through, or just being heard?',
    "I'm with you. What's underneath that, do you think?",
  ],
};

const DISCLOSURE_EVERY = 8; // mock cadence; the real server decides (~every 50 messages)
const BREAK_AFTER = 12; // session turns before the gentle break reminder

/**
 * POST /api/companions/:id/messages — send a turn, get the moderated reply.
 * The real server owns crisis detection, the disclosure cadence, break
 * reminders, and the free-tier cap; the mock reproduces each so every chat
 * state is reachable on demo data.
 */
export async function sendTurn(req: TurnRequest): Promise<TurnResult> {
  await simulateLatency(500);

  if (!req.isPremium && req.usage.used >= req.usage.limit) {
    return { limitReached: { used: req.usage.used, limit: req.usage.limit } };
  }

  if (CRISIS_PATTERN.test(req.content)) {
    return { reply: DEMO.crisis.companionReply, safetyFlagged: true };
  }

  const bank = REPLY_BANKS[req.personaKey.toLowerCase()] ?? REPLY_BANKS.custom;
  const reply = bank[req.assistantTurnCount % bank.length];

  const nextCount = req.assistantTurnCount + 1;
  return {
    reply,
    aiDisclosure: nextCount > 0 && nextCount % DISCLOSURE_EVERY === 0,
    breakReminder:
      req.sessionTurnCount > 0 && req.sessionTurnCount % BREAK_AFTER === 0
        ? CHAT.breakReminder.replace('{Companion}', req.companionName)
        : undefined,
  };
}

/** Reply line for the mocked voice-call loop (captions); same banks, no side effects. */
export function mockVoiceReply(personaKey: string, turnIndex: number): string {
  const bank = REPLY_BANKS[personaKey.toLowerCase()] ?? REPLY_BANKS.custom;
  return bank[turnIndex % bank.length];
}

// ── Voice metering (the paywall promise: 20 min/month free, 10 h/month premium) ──
// Mirrors the @aura/shared entitlement constants once monorepo wiring lands; the
// server meters real usage (voice_usage records) — GET /api/voice/usage.
export const VOICE_FREE_SECONDS = 20 * 60;
export const VOICE_PREMIUM_SECONDS = 10 * 3600;

// ── Memories ────────────────────────────────────────────────────────────────

export interface MemoryRow {
  id: string;
  companionId: string;
  category: string;
  fact: string;
  createdAt: string;
}

// Aurora's six canonical memories about Maya seed the store; other companions
// start empty (a real, demoable zero state).
async function memoriesDb(): Promise<MemoryRow[]> {
  const stored = await readStore<MemoryRow[]>('memories');
  if (stored) return stored;
  const seeded: MemoryRow[] = DEMO.memories.map((m, i) => ({
    id: mockId(),
    companionId: 'aurora',
    category: m.category,
    fact: m.fact,
    // Staggered plausible dates, newest first (demo-time is 2026-07).
    createdAt: new Date(Date.UTC(2026, 5, 28 - i * 4)).toISOString(),
  }));
  await writeStore('memories', seeded);
  return seeded;
}

/** GET /api/companions/:companionId/memories */
export async function fetchMemories(companionId: string): Promise<MemoryRow[]> {
  await simulateLatency();
  const db = await memoriesDb();
  return db.filter((m) => m.companionId === companionId.toLowerCase());
}

/** PATCH /api/memories/:id — body = UpdateMemorySchema ({ fact }). */
export async function updateMemory(id: string, updates: { fact: string }): Promise<MemoryRow | null> {
  await simulateLatency();
  const db = await memoriesDb();
  const idx = db.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  db[idx] = { ...db[idx], fact: updates.fact };
  await writeStore('memories', db);
  return db[idx];
}

/** DELETE /api/memories/:id */
export async function deleteMemory(id: string): Promise<void> {
  await simulateLatency();
  const db = await memoriesDb();
  await writeStore(
    'memories',
    db.filter((m) => m.id !== id),
  );
}

// ── Safety / UGC ────────────────────────────────────────────────────────────

/** POST /api/messages/:id/report — fire-and-forget, non-punitive. */
export async function reportMessage(messageId: string, reason: string, note?: string): Promise<void> {
  await simulateLatency(250);
  void messageId;
  void reason;
  void note;
}

// ── Account lifecycle ───────────────────────────────────────────────────────

export interface AccountStatus {
  status: 'active' | 'deactivated';
  /** Set while deactivated; permanent deletion lands 30 days later. */
  deletedAt: string | null;
}

/** GET /api/auth/me (status fields) */
export async function fetchAccountStatus(): Promise<AccountStatus> {
  return (await readStore<AccountStatus>('accountStatus')) ?? { status: 'active', deletedAt: null };
}

/** DELETE /api/account — soft-delete: deactivate now, purge after 30 days. */
export async function softDeleteAccount(): Promise<AccountStatus> {
  await simulateLatency(500);
  const next: AccountStatus = { status: 'deactivated', deletedAt: new Date().toISOString() };
  await writeStore('accountStatus', next);
  return next;
}

/** PATCH /api/account/reactivate — restore within the 30-day grace window. */
export async function reactivateAccount(): Promise<AccountStatus> {
  await simulateLatency(500);
  const next: AccountStatus = { status: 'active', deletedAt: null };
  await writeStore('accountStatus', next);
  return next;
}

/** POST /api/account/export — server emails a download link when ready. */
export async function requestDataExport(): Promise<void> {
  await simulateLatency(600);
}

// ── Payments (RevenueCat / StoreKit seam) ───────────────────────────────────

/**
 * RevenueCat offering → localized store price string. Returns null in the mock:
 * the paywall renders its store-price placeholder slot (never a hardcoded price).
 */
export async function fetchStorePrice(): Promise<string | null> {
  await simulateLatency(700);
  return null;
}

/** Purchases.purchasePackage(...) → entitlement active. */
export async function purchasePremium(): Promise<{ isPremium: boolean }> {
  await simulateLatency(900);
  await writeStore('isPremium', true);
  return { isPremium: true };
}

/** Purchases.restorePurchases() → whether an entitlement was found. */
export async function restorePurchases(): Promise<{ restored: boolean; isPremium: boolean }> {
  await simulateLatency(900);
  const isPremium = (await readStore<boolean>('isPremium')) ?? false;
  return { restored: isPremium, isPremium };
}

/** GET /api/payments/entitlements — reconcile isPremium staleness on foreground. */
export async function fetchEntitlements(): Promise<{ isPremium: boolean }> {
  return { isPremium: (await readStore<boolean>('isPremium')) ?? false };
}
