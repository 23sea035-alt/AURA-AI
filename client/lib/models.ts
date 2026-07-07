// Client-side data contract shared by the mock and live seam implementations
// (lib/mock.ts, lib/live.ts) and re-exported through lib/backend.ts and
// context/AppContext.tsx. Pure types — no imports, no runtime.

export interface Companion {
  id: string;
  name: string;
  /** Base gallery preset (PersonaKey) driving the reply voice — fixed at creation; identity is the
   * voice pack (docs/specs/companion-roster.md §5). */
  personaKey: string;
  persona: string;
  traits: string[];
  colorFrom: string;
  colorTo: string;
  /** Server-seeded anchor (Aurora/Orion/Lyra trio): archive-only, never deletable. */
  isDefault?: boolean;
  lastMessage?: string;
  /** ISO timestamp of the last exchange — display strings are derived live (utils/time). */
  lastActiveAt?: string;
  messageCount?: number;
  /** The saved "look" (mood filter) for the portrait. Backed by companions.traits._client (jsonb). */
  lookId?: string;
  /** Set when archived (soft-deleted): hidden from the roster, messages/memory untouched, restorable. */
  archivedAt?: string | null;
}

/**
 * What the remote create mirror reports back: the adopted server row, a cap
 * refusal the caller must roll back (the client pre-checks, so this is a
 * race), or null — mock mode (local row stands) / live network failure.
 */
export type RemoteCreateResult =
  | { companion: Companion }
  | { limit: 'active' | 'total' }
  | null;

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
  /** Mirrors MESSAGE_STATUS (@aura/shared); absent = complete. */
  status?: 'failed' | 'blocked';
}

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
  /** Server id of the assistant message (live mode) — makes the reply reportable. */
  replyId?: string;
  /** The safety pipeline flagged this exchange — render the grounding support block. */
  safetyFlagged?: boolean;
  /** SB 243 recurring notice — surface the quiet "you're talking to an AI" line. */
  aiDisclosure?: boolean;
  /** Gentle break reminder (already companion-resolved), when the sitting has run long. */
  breakReminder?: string;
  /** Free-tier daily cap reached; the send was not processed. */
  limitReached?: { used: number; limit: number };
  /** Input moderation held the message back (MESSAGE_STATUS 'blocked') — no reply. */
  inputBlocked?: boolean;
}

export interface MemoryRow {
  id: string;
  companionId: string;
  category: string;
  fact: string;
  createdAt: string;
}

export interface AccountStatus {
  status: 'active' | 'deactivated';
  /** Set while deactivated; permanent deletion lands 30 days later. */
  deletedAt: string | null;
}

/**
 * One-shot server snapshot for bootstrap/login in live mode. Mock mode returns
 * null: local AsyncStorage stays authoritative and AppContext keeps its
 * existing local bootstrap path.
 */
export interface Hydration {
  /** Server profile fields (client-only fields are merged from local storage by the caller). */
  user: Partial<import('./profile').UserProfile> & { id: string; email: string };
  companions: Companion[];
  /** Full thread per companion id (the server has no pagination; the UI windows locally). */
  messages: Record<string, Message[]>;
  usage: { used: number; limit: number } | null;
  /** Voice seconds used this calendar month, or null when unknown. */
  voiceSeconds: number | null;
  accountStatus: AccountStatus;
  primaryCompanionId: string | null;
}
