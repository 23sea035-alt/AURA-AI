// ════════════════════════════════════════════════════════════════════════
// LIVE BACKEND — the real implementation of every seam in lib/mock.ts,
// selected by lib/backend.ts when DEV_USE_MOCKS is off (always, in release
// builds). Same signatures, same return shapes: screens and AppContext cannot
// tell which one they are talking to.
//
// Server surface: server/src/routes/* (Express, port 8080). Envelopes are
// { success, data } everywhere except /auth/* (raw) — lib/api.ts normalizes.
// Auth = Clerk session JWT (lib/clerk.ts registers the token provider).
// Payments = RevenueCat SDK (lib/purchases.ts) + server webhook reconciling
// users.isPremium.
// ════════════════════════════════════════════════════════════════════════
import { FREE_DAILY_LIMIT, PERSONA_PRESETS, type PersonaTraits } from '@aura/shared';

import { LOGO_COLORS, personaColorsFor } from '@/constants/design';
import { api, ApiError } from '@/lib/api';
import {
  clerkHasSession,
  clerkResendCode,
  clerkSignIn,
  clerkSignOut,
  clerkSignUp,
  clerkVerifyEmail,
} from '@/lib/clerk';
import type {
  AccountStatus,
  Companion,
  Hydration,
  MemoryRow,
  Message,
  RemoteCreateResult,
  TurnRequest,
  TurnResult,
} from '@/lib/models';
import type { UserProfile } from '@/lib/profile';
import { configurePurchases, getPremiumPrices, getRenewalDate, purchasePlan, restoreFromStore } from '@/lib/purchases';

// ── Server row shapes (routes define these ad hoc; @aura/shared only carries
//    request DTOs, so the response models live here) ─────────────────────────

interface ServerUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  dateOfBirth: string | null;
  isPremium: boolean;
  isMinor: boolean;
  ageVerified: boolean;
  onboardingDone: boolean;
  aiDisclosureAccepted: boolean;
  avatarColor: string | null;
  primaryCompanionId: string | null;
}

interface ServerCompanion {
  id: string;
  /** One of the 12 gallery PersonaKeys. */
  personaKey: string;
  name: string;
  traits: (Partial<PersonaTraits> & Record<string, unknown>) | null;
  isDefault: boolean;
  lastMessage: string | null;
  lastActiveAt: string | null;
  messageCount: number;
  archivedAt: string | null;
  rememberQuestion: string | null;
}

interface ServerMessage {
  id: string;
  role: 'user' | 'assistant';
  status: 'pending' | 'complete' | 'failed' | 'blocked';
  content: string;
  flagged: boolean;
  createdAt: string;
}

interface ServerMemory {
  id: string;
  companionId: string;
  content: string;
  category: string;
  createdAt: string;
}

// Client-only presentation (persona text, duotone, look, trait chips) rides in
// companions.traits under this key — the server stores traits as opaque jsonb.
const CLIENT_TRAITS_KEY = '_client';

interface ClientTraitsStash {
  persona?: string;
  traits?: string[];
  colorFrom?: string;
  colorTo?: string;
  lookId?: string;
}

function mapCompanion(row: ServerCompanion): Companion {
  const preset = PERSONA_PRESETS.find((p) => p.id === row.personaKey) ?? PERSONA_PRESETS[0];
  const stash = ((row.traits ?? {}) as Record<string, unknown>)[CLIENT_TRAITS_KEY] as
    | ClientTraitsStash
    | undefined;
  const pc = personaColorsFor(row.personaKey);
  // The trait chips come from the row's grid (authoritative — the server coerces a free caller's
  // tuning back to the preset defaults), never from the stash copy.
  const grid = row.traits;
  const chips =
    grid?.warmth && grid?.energy && grid?.verbosity
      ? [grid.warmth, grid.energy, grid.verbosity]
      : [preset.defaultTraits.warmth, preset.defaultTraits.energy, preset.defaultTraits.verbosity];
  return {
    id: row.id,
    name: row.name,
    personaKey: preset.id,
    isDefault: row.isDefault || undefined,
    persona: stash?.persona ?? preset.tagline,
    traits: chips,
    colorFrom: stash?.colorFrom ?? pc?.from ?? LOGO_COLORS.wine,
    colorTo: stash?.colorTo ?? pc?.to ?? LOGO_COLORS.honey,
    lookId: stash?.lookId,
    lastMessage: row.lastMessage ?? undefined,
    lastActiveAt: row.lastActiveAt ?? undefined,
    messageCount: row.messageCount ?? 0,
    archivedAt: row.archivedAt ?? null,
    rememberQuestion: row.rememberQuestion ?? null,
  };
}

function mapMessage(row: ServerMessage): Message {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt,
    safetyFlagged: row.flagged || undefined,
    status: row.status === 'failed' || row.status === 'blocked' ? row.status : undefined,
  };
}

function mapUser(u: ServerUser): Hydration['user'] {
  return {
    id: u.id,
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.email,
    dateOfBirth: u.dateOfBirth ?? undefined,
    isMinor: u.isMinor,
    ageVerified: u.ageVerified,
    onboardingDone: u.onboardingDone,
    aiDisclosureAccepted: u.aiDisclosureAccepted,
    isPremium: u.isPremium,
    avatarColor: u.avatarColor ?? undefined,
  };
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * GET /api/auth/me, riding out webhook lag: right after Clerk sign-up the
 * local user row doesn't exist until Clerk's user.created webhook lands
 * (dev: via the ngrok tunnel), so USER_NOT_FOUND retries briefly.
 */
async function fetchMe(retries = 6): Promise<ServerUser> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await api<ServerUser>('/auth/me', { raw: true });
    } catch (err) {
      const notMirroredYet = err instanceof ApiError && err.code === 'USER_NOT_FOUND';
      if (!notMirroredYet || attempt >= retries) throw err;
      await wait(1000 + attempt * 500);
    }
  }
}

// ── Auth (Clerk) ────────────────────────────────────────────────────────────

export async function authLogin(email: string, password: string): Promise<void> {
  await clerkSignIn(email, password);
}

export async function authRegister(email: string, password: string): Promise<void> {
  await clerkSignUp(email, password);
}

export async function authVerifyEmail(code: string): Promise<void> {
  await clerkVerifyEmail(code);
}

export async function authResendCode(): Promise<void> {
  await clerkResendCode();
}

export async function authSignOut(): Promise<void> {
  await clerkSignOut();
}

// ── Bootstrap hydration ─────────────────────────────────────────────────────

/** Full server snapshot; null when there is no session to hydrate from. */
export async function hydrate(): Promise<Hydration | null> {
  if (!(await clerkHasSession())) return null;
  const me = await fetchMe();

  const [companionRows, usage, voice] = await Promise.all([
    api<ServerCompanion[]>('/companions').catch(() => [] as ServerCompanion[]),
    api<{ used: number; limit: number }>('/chat/usage').catch(() => null),
    api<{ usedSeconds: number }>('/voice/limits').catch(() => null),
  ]);

  const companions = companionRows.map(mapCompanion);
  const threads = await Promise.all(
    companions
      .filter((c) => !c.archivedAt)
      .map(async (c) => {
        const rows = await api<ServerMessage[]>(`/companions/${c.id}/messages`).catch(
          () => [] as ServerMessage[],
        );
        return [c.id, rows.map(mapMessage)] as const;
      }),
  );

  return {
    user: mapUser(me),
    companions,
    messages: Object.fromEntries(threads),
    usage: usage ? { used: usage.used, limit: usage.limit ?? FREE_DAILY_LIMIT } : null,
    voiceSeconds: voice?.usedSeconds ?? null,
    accountStatus: { status: 'active', deletedAt: null },
    primaryCompanionId: me.primaryCompanionId,
  };
}

// ── Profile ─────────────────────────────────────────────────────────────────

const PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'dateOfBirth',
  'onboardingDone',
  'aiDisclosureAccepted',
  'tosAcceptedVersion',
  'avatarColor',
] as const;

/**
 * PUT /api/auth/me with whatever schema fields the update carries. (Onboarding seeds nothing —
 * the user's 1-of-12 pick creates companion #1 via POST /companions, which writes the opener.)
 */
export async function updateMe(updates: Partial<UserProfile>): Promise<void> {
  const body: Record<string, unknown> = {};
  for (const key of PROFILE_FIELDS) {
    if (updates[key] !== undefined) body[key] = updates[key];
  }
  if (Object.keys(body).length > 0) {
    // Same webhook-lag tolerance as fetchMe: onboarding PUTs can race the
    // user.created mirror right after sign-up.
    for (let attempt = 0; ; attempt++) {
      try {
        await api('/auth/me', { method: 'PUT', body, raw: true });
        break;
      } catch (err) {
        const notMirroredYet = err instanceof ApiError && err.code === 'USER_NOT_FOUND';
        if (!notMirroredYet || attempt >= 6) throw err;
        await wait(1000 + attempt * 500);
      }
    }
  }
}

// ── Chat ────────────────────────────────────────────────────────────────────

/** POST /api/companions/:id/chat — the non-streaming turn wrapper (WS streaming is a later arc). */
export async function sendTurn(req: TurnRequest): Promise<TurnResult> {
  try {
    const data = await api<{
      aiMessage: { id: string; content: string } | null;
      safetyFlagged: boolean;
      breakReminder: string | null;
      aiDisclosure: boolean;
    }>(`/companions/${req.companionId}/chat`, {
      method: 'POST',
      body: { content: req.content, turnId: req.turnId, sessionStartedAt: req.sessionStartedAt },
    });
    return {
      reply: data.aiMessage?.content ?? '',
      replyId: data.aiMessage?.id,
      safetyFlagged: data.safetyFlagged || undefined,
      aiDisclosure: data.aiDisclosure || undefined,
      breakReminder: data.breakReminder ?? undefined,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      // Map server refusals onto the contract's degenerate states; anything
      // else stays a throw → the optimistic bubble goes to tap-to-retry.
      if (err.code === 'BLOCKED') return { inputBlocked: true };
      if (err.code === 'LIMIT_REACHED') return { limitReached: req.usage };
      // Abuse backstop (1000/day) — retrying won't help today, so restore the draft via the
      // cap sheet. RATE_LIMITED (30/min) deliberately stays a throw: tap-to-retry fits a
      // transient throttle.
      if (err.code === 'DAILY_CAP') return { limitReached: req.usage };
    }
    throw err;
  }
}

// ── Memories ────────────────────────────────────────────────────────────────

export async function fetchMemories(companionId: string): Promise<MemoryRow[]> {
  const rows = await api<ServerMemory[]>(`/companions/${companionId}/memories`);
  return rows.map((m) => ({
    id: m.id,
    companionId: m.companionId,
    category: m.category,
    fact: m.content,
    createdAt: m.createdAt,
  }));
}

export async function updateMemory(id: string, updates: { fact: string }): Promise<MemoryRow | null> {
  try {
    const m = await api<ServerMemory>(`/memories/${id}`, {
      method: 'PATCH',
      body: { content: updates.fact },
    });
    return { id: m.id, companionId: m.companionId, category: m.category, fact: m.content, createdAt: m.createdAt };
  } catch {
    return null;
  }
}

export async function deleteMemory(id: string): Promise<void> {
  await api(`/memories/${id}`, { method: 'DELETE' });
}

// ── Safety / UGC ────────────────────────────────────────────────────────────

export async function reportMessage(messageId: string, reason: string, note?: string): Promise<void> {
  await api(`/messages/${messageId}/report`, { method: 'POST', body: { reason, detail: note } });
}

// ── Account lifecycle ───────────────────────────────────────────────────────

export async function fetchAccountStatus(): Promise<AccountStatus> {
  if (!(await clerkHasSession())) return { status: 'active', deletedAt: null };
  try {
    await api('/auth/me', { raw: true });
    return { status: 'active', deletedAt: null };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'ACCOUNT_SUSPENDED') {
      // The server doesn't expose deletedAt; the reactivate copy degrades to no date.
      return { status: 'deactivated', deletedAt: null };
    }
    return { status: 'active', deletedAt: null };
  }
}

export async function softDeleteAccount(): Promise<AccountStatus> {
  await api('/account', { method: 'DELETE' });
  return { status: 'deactivated', deletedAt: new Date().toISOString() };
}

export async function reactivateAccount(): Promise<AccountStatus> {
  await api('/account/reactivate', { method: 'PATCH' });
  return { status: 'active', deletedAt: null };
}

/** GET /api/account/export — the server returns the GDPR bundle inline; the UI treats it as queued. */
export async function requestDataExport(): Promise<void> {
  await api('/account/export');
}

// ── Companions CRUD ─────────────────────────────────────────────────────────

function stashFor(c: Partial<Companion>): ClientTraitsStash {
  return {
    persona: c.persona,
    traits: c.traits,
    colorFrom: c.colorFrom,
    colorTo: c.colorTo,
    lookId: c.lookId,
  };
}

/** The wire traits shape (CompanionTraitsSchema): the tuned grid triplet + the presentation stash.
 * The chips array is [warmth, energy, verbosity]; missing axes fall back to the preset default. */
function wireTraitsFor(c: Partial<Companion> & Pick<Companion, 'personaKey' | 'traits'>) {
  const preset = PERSONA_PRESETS.find((p) => p.id === c.personaKey) ?? PERSONA_PRESETS[0];
  const [warmth, energy, verbosity] = c.traits;
  return {
    warmth: warmth ?? preset.defaultTraits.warmth,
    energy: energy ?? preset.defaultTraits.energy,
    verbosity: verbosity ?? preset.defaultTraits.verbosity,
    [CLIENT_TRAITS_KEY]: stashFor(c),
  };
}

/** POST /api/companions — the server enforces the roster caps (spec §9) and seeds the onboarding
 * opener for the user's first companion. null on network failure → the optimistic row stands. */
export async function remoteCreateCompanion(c: Omit<Companion, 'id'>): Promise<RemoteCreateResult> {
  try {
    const row = await api<ServerCompanion>('/companions', {
      method: 'POST',
      body: {
        name: c.name,
        personaKey: c.personaKey,
        traits: wireTraitsFor(c),
      },
    });
    return { companion: mapCompanion(row) };
  } catch (err) {
    // A cap refusal means the optimistic local row must be rolled back (the client pre-checks,
    // so this only fires on a race with another device / a stale snapshot).
    if (err instanceof ApiError && err.code === 'ACTIVE_LIMIT_REACHED') return { limit: 'active' };
    if (err instanceof ApiError && err.code === 'TOTAL_LIMIT_REACHED') return { limit: 'total' };
    return null;
  }
}

/** PATCH /api/companions/:id — pushes the tuned grid + full client presentation stash. */
export async function remoteUpdateCompanion(c: Companion): Promise<void> {
  await api(`/companions/${c.id}`, {
    method: 'PATCH',
    body: { name: c.name, traits: wireTraitsFor(c) },
  }).catch(() => {});
}

/** DELETE /api/companions/:id — permanent; the server cascades messages + memories and re-pins
 * the Home companion if the deleted one was pinned. */
export async function remoteDeleteCompanion(id: string): Promise<void> {
  await api(`/companions/${id}`, { method: 'DELETE' }).catch(() => {});
}

/** DELETE /api/companions/:id/messages — Clear conversation (transcript only; memories kept). */
export async function remoteClearConversation(id: string): Promise<void> {
  await api(`/companions/${id}/messages`, { method: 'DELETE' }).catch(() => {});
}

/** POST /api/companions/:id/forget — Forget everything (transcript + memories; companion kept). */
export async function remoteForgetCompanion(id: string): Promise<void> {
  await api(`/companions/${id}/forget`, { method: 'POST' }).catch(() => {});
}

export async function remoteArchiveCompanion(id: string): Promise<void> {
  // 409 LAST_ACTIVE_COMPANION is possible; the roster hides that swipe action
  // for the last active row, so a race here is tolerable dev-mode noise.
  await api(`/companions/${id}/archive`, { method: 'POST' }).catch(() => {});
}

export async function remoteRestoreCompanion(id: string): Promise<void> {
  await api(`/companions/${id}/restore`, { method: 'POST' }).catch(() => {});
}

/** PUT /api/auth/me { primaryCompanionId } — '' clears the Home pin. */
export async function remoteSetPrimary(id: string): Promise<void> {
  await api('/auth/me', {
    method: 'PUT',
    body: { primaryCompanionId: id || null },
    raw: true,
  }).catch(() => {});
}

// ── Voice metering ──────────────────────────────────────────────────────────

/** GET /api/voice/limits → seconds used this month; null lets the local meter stand. */
export async function fetchVoiceUsage(): Promise<{ seconds: number } | null> {
  try {
    const data = await api<{ usedSeconds: number }>('/voice/limits');
    return { seconds: data.usedSeconds };
  } catch {
    return null;
  }
}

/** POST /api/voice/start — pre-flight budget gate before the mic ever turns on. */
export async function startVoiceCall(): Promise<{ allowed: boolean; remainingSeconds: number }> {
  try {
    const data = await api<{ allowed?: boolean; remainingSeconds?: number }>('/voice/start', {
      method: 'POST',
      body: {},
    });
    return { allowed: data.allowed !== false, remainingSeconds: data.remainingSeconds ?? 0 };
  } catch (err) {
    if (err instanceof ApiError && err.code === 'VOICE_LIMIT_REACHED') {
      return { allowed: false, remainingSeconds: 0 };
    }
    throw err;
  }
}

/** POST /api/voice/stop — close out the call server-side (usage summary; best-effort). */
export async function stopVoiceCall(): Promise<void> {
  await api('/voice/stop', { method: 'POST', body: {} }).catch(() => {});
}

// ── Payments (RevenueCat + server entitlements) ─────────────────────────────

/** Bind the RevenueCat SDK to the local user UUID (the webhook validates it). */
export async function configurePayments(userId: string): Promise<void> {
  await configurePurchases(userId).catch(() => {});
}

export async function fetchStorePrice(plan: 'monthly' | 'yearly' = 'monthly'): Promise<string | null> {
  const prices = await getPremiumPrices();
  return prices[plan];
}

export async function purchasePremium(plan: 'monthly' | 'yearly' = 'monthly'): Promise<{ isPremium: boolean }> {
  const active = await purchasePlan(plan);
  if (!active) return { isPremium: false };
  // The server learns via the RevenueCat webhook — give it a beat, then let
  // its verdict win (foreground refreshes reconcile any remaining lag).
  for (let i = 0; i < 3; i++) {
    await wait(1500);
    const { isPremium } = await fetchEntitlements().catch(() => ({ isPremium: false }));
    if (isPremium) return { isPremium: true };
  }
  return { isPremium: active };
}

export async function restorePurchases(): Promise<{ restored: boolean; isPremium: boolean }> {
  const active = await restoreFromStore();
  return { restored: active, isPremium: active };
}

/** Store-truth renewal date for the owned state; null hides the "Renews …" line. */
export async function fetchRenewalDate(): Promise<string | null> {
  return getRenewalDate();
}

// ── Notifications ───────────────────────────────────────────────────────────

/** POST /api/notifications/register — mirror the APNs device token for the away-reply push. */
export async function registerPushToken(token: string): Promise<void> {
  await api('/notifications/register', { method: 'POST', body: { token, platform: 'ios' } });
}

/** DELETE /api/notifications/register — drop this device's token (sign-out, toggle off). */
export async function unregisterPushToken(token: string): Promise<void> {
  await api('/notifications/register', { method: 'DELETE', body: { token } });
}

export async function fetchEntitlements(): Promise<{ isPremium: boolean }> {
  return api<{ isPremium: boolean }>('/payments/entitlements');
}
