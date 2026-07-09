import { z } from "zod";

export const USER_STATUS = ['active', 'suspended', 'banned', 'deleted'] as const;
export type UserStatus = (typeof USER_STATUS)[number];

export const AGE_ASSURANCE_METHOD = ['self_declared', 'apple_declared_age_range', 'third_party'] as const;
export type AgeAssuranceMethod = (typeof AGE_ASSURANCE_METHOD)[number];

// The 12 curated gallery presets (3 anchors + 9). The rich voice packs keyed by these ids live in
// personas.ts (compiler-enforced complete via Record<PersonaKey, ...>). This list is the DB/API enum.
export const PERSONA_KEY = [
  'aurora', 'orion', 'lyra',
  'sage', 'amara', 'eli', 'selene', 'soren', 'juno', 'thea', 'cyrus', 'wren',
] as const;
export type PersonaKey = (typeof PERSONA_KEY)[number];

// Voice speaking-PACE setting (user-facing). Maps to a MULTIPLIER on each persona's base TTS rate;
// the server clamps base × multiplier to Inworld's 0.5–1.5 range (see services/voice/voice-tuning).
export const VOICE_PACE = ['relaxed', 'natural', 'quick'] as const;
export type VoicePace = (typeof VOICE_PACE)[number];
export const PACE_MULTIPLIER: Record<VoicePace, number> = { relaxed: 0.85, natural: 1.0, quick: 1.15 };
/** Resolve a (possibly untrusted / absent) pace to its rate multiplier; unknown/absent → 1.0 (natural). */
export function paceMultiplier(pace: string | null | undefined): number {
  return (pace ? PACE_MULTIPLIER[pace as VoicePace] : undefined) ?? 1.0;
}

export const MESSAGE_ROLE = ['user', 'assistant'] as const;
export type MessageRole = (typeof MESSAGE_ROLE)[number];

export const MESSAGE_STATUS = ['pending', 'complete', 'failed', 'blocked'] as const;
export type MessageStatus = (typeof MESSAGE_STATUS)[number];

export const MEMORY_CATEGORY = ['identity', 'preference', 'attribute', 'relationship', 'work', 'location', 'general'] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORY)[number];

export const SUBSCRIPTION_TIER = ['free', 'premium'] as const;
export type SubscriptionTier = (typeof SUBSCRIPTION_TIER)[number];

export const SUBSCRIPTION_STATUS = ['active', 'trialing', 'grace_period', 'billing_retry', 'expired', 'revoked'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[number];

export const SUBSCRIPTION_STORE = ['app_store', 'play_store', 'stripe'] as const;
export type SubscriptionStore = (typeof SUBSCRIPTION_STORE)[number];

export const SUBSCRIPTION_PERIOD = ['normal', 'trial', 'intro'] as const;
export type SubscriptionPeriod = (typeof SUBSCRIPTION_PERIOD)[number];

export const DEVICE_PLATFORM = ['ios'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORM)[number];

export const DEVICE_ENVIRONMENT = ['production', 'sandbox'] as const;
export type DeviceEnvironment = (typeof DEVICE_ENVIRONMENT)[number];

export const SAFETY_EVENT_TYPE = ['input_blocked', 'output_blocked', 'crisis_detected', 'injection_detected', 'user_reported'] as const;
export type SafetyEventType = (typeof SAFETY_EVENT_TYPE)[number];

export const SAFETY_SOURCE = ['input', 'output', 'injection', 'user_report'] as const;
export type SafetySource = (typeof SAFETY_SOURCE)[number];

export const SAFETY_SEVERITY = ['info', 'warning', 'critical'] as const;
export type SafetySeverity = (typeof SAFETY_SEVERITY)[number];

export const SAFETY_STATUS = ['open', 'reviewed', 'actioned', 'dismissed'] as const;
export type SafetyStatus = (typeof SAFETY_STATUS)[number];

export const SAFETY_ACTION = ['none', 'warned', 'suspended', 'banned'] as const;
export type SafetyAction = (typeof SAFETY_ACTION)[number];

export const MODERATION_CATEGORY = ['self_harm', 'sexual', 'sexual_minors', 'violence', 'hate', 'harassment', 'illicit', 'prohibited', 'other'] as const;
export type ModerationCategory = (typeof MODERATION_CATEGORY)[number];

export const MODERATOR_MODEL = ['deterministic', 'openai_omni', 'gpt_oss_safeguard', 'prompt_guard'] as const;
export type ModeratorModel = (typeof MODERATOR_MODEL)[number];

export const BANNED_IDENTIFIER_TYPE = ['email_hash', 'apple_sub_hash', 'google_sub_hash'] as const;
export type BannedIdentifierType = (typeof BANNED_IDENTIFIER_TYPE)[number];

// Runtime value arrays are the single source; the axis types derive from them so the client picker,
// the tuning UI, and server-side validation share one list (no re-declared TRAITS on the client).
export const WARMTH_VALUES = ['reserved', 'warm', 'doting'] as const;
export const ENERGY_VALUES = ['calm', 'balanced', 'playful'] as const;
export const VERBOSITY_VALUES = ['concise', 'balanced', 'expansive'] as const;
export type Warmth = (typeof WARMTH_VALUES)[number];
export type Energy = (typeof ENERGY_VALUES)[number];
export type Verbosity = (typeof VERBOSITY_VALUES)[number];

export interface PersonaTraits {
  warmth: Warmth;
  energy: Energy;
  verbosity: Verbosity;
}

// Grid-validated traits — replaces the old untyped z.record so off-grid values are rejected at the
// API boundary (never trust the client even though it reads the same list from @aura/shared).
export const PersonaTraitsSchema = z.object({
  warmth: z.enum(WARMTH_VALUES),
  energy: z.enum(ENERGY_VALUES),
  verbosity: z.enum(VERBOSITY_VALUES),
});

export const FREE_DAILY_LIMIT = 30;

// Version stamp recorded on users.tos_accepted_version when the register checkbox is
// accepted (captured at onboarding completion, when a session is guaranteed). Bump when
// counsel-approved terms ship; drafts live in docs/compliance/.
export const TOS_VERSION = "draft-2026-06";
export const MAX_MESSAGE_CHARS = 2000;

// ── Companion roster caps (docs/specs/companion-roster.md §2) ────────────
// Active cap = the product limit (what the user feels and what the paywall
// sells). Total cap = active + archived anti-abuse backstop, never surfaced
// as a feature. Both server (enforcement) and client (gate UI + at-limit
// sheets) import these.
export const MAX_ACTIVE_COMPANIONS_FREE = 5;
export const MAX_ACTIVE_COMPANIONS_PREMIUM = 15;
export const MAX_TOTAL_COMPANIONS_FREE = 20;
export const MAX_TOTAL_COMPANIONS_PREMIUM = 50;

export function activeCompanionCap(isPremium: boolean): number {
  return isPremium ? MAX_ACTIVE_COMPANIONS_PREMIUM : MAX_ACTIVE_COMPANIONS_FREE;
}

export function totalCompanionCap(isPremium: boolean): number {
  return isPremium ? MAX_TOTAL_COMPANIONS_PREMIUM : MAX_TOTAL_COMPANIONS_FREE;
}
// Upper bound on a single voice utterance (one Apple-VAD chunk). Bounds the per-utterance
// STT/LLM/TTS cost before any paid work runs; ~1 minute of audio across common codecs.
export const MAX_UTTERANCE_BYTES = 2_000_000;
export const MEMORY_RETRIEVAL_TOP_N = 5;
export const MEMORY_SCORE_WEIGHTS = { jaccard: 0.7, importance: 0.3, recency: 0.15 };
export const MEMORY_RECENCY_HALFLIFE_DAYS = 30;
export const MEMORY_RELEVANCE_FLOOR = 0.08;
export const MEMORY_IDENTITY_BAR = 0.85;
export const MEMORY_DEDUP_CANDIDATE_CAP = 50;
export const MEMORY_IMPORTANCE_BY_CATEGORY = {
  identity: 0.9, relationship: 0.9, work: 0.7, location: 0.7,
  attribute: 0.6, preference: 0.6, general: 0.4,
};
export const HISTORY_WINDOW = 8;
export const GENERATION_TEMPERATURE = 0.7;
export const GENERATION_MAX_TOKENS = 512;

// ── Moderation thresholds (tunable) ──────────────────────────────────────
export const L1_PROMPT_GUARD = { ESCALATE: 0.5, BLOCK: 0.9 } as const;

export const MODERATION_INPUT_THRESHOLDS: Record<string, number> = {
  "sexual/minors": 0.1,
  "self-harm": 0.25,
  "self-harm/intent": 0.25,
  "self-harm/instructions": 0.3,
  "sexual": 0.95,
  "violence": 0.5,
  "violence/graphic": 0.5,
  "hate": 0.5,
  "hate/threatening": 0.4,
  "harassment": 0.5,
  "harassment/threatening": 0.4,
  "illicit": 0.5,
  "illicit/violent": 0.4,
};

export const MODERATION_OUTPUT_THRESHOLDS: Record<string, number> = {
  "sexual/minors": 0.05,
  "self-harm": 0.15,
  "self-harm/intent": 0.15,
  "self-harm/instructions": 0.4,
  "sexual": 0.75,
  "violence": 0.35,
  "violence/graphic": 0.35,
  "hate": 0.35,
  "hate/threatening": 0.25,
  "harassment": 0.35,
  "harassment/threatening": 0.25,
  "illicit": 0.35,
  "illicit/violent": 0.25,
};

export const MODERATION_TIMEOUTS = {
  L1_PROMPT_GUARD_MS: 1000,
  L2_OMNI_MS: 2000,
  L3_SAFEGUARD_MS: 4000,
} as const;

export const FLAGGED_USER_WINDOW_DAYS = 30;
export const FLAGGED_USER_SUSPEND_THRESHOLD = 3;

export const SAFE_FALLBACK_REPLY = "I need to be careful with my response here. Let me think about how to respond thoughtfully to what you've shared.";

// ── Request DTOs ───────────────────────────────────────────────────────
export const ChatInputSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_CHARS, `Message must be under ${MAX_MESSAGE_CHARS} characters`),
  turnId: z.string().uuid().optional(),
  sessionStartedAt: z.string().optional(),
});

// Companion traits as stored: the tuned grid point plus an opaque `_client`
// presentation stash (duotone, look, persona line) the server round-trips
// untouched — except the free-tier coercion, which forces the grid back to the
// preset defaults and strips the paid `lookId` (docs/specs/companion-roster.md §9).
export const CompanionTraitsSchema = PersonaTraitsSchema.extend({
  _client: z.record(z.string(), z.unknown()).optional(),
});

export const CreateCompanionSchema = z.object({
  name: z.string().min(1).max(100),
  personaKey: z.enum(PERSONA_KEY).optional().default('aurora'),
  // Optional: when omitted the server fills the chosen preset's defaultTraits.
  traits: CompanionTraitsSchema.optional(),
});

export const UpdateCompanionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  traits: CompanionTraitsSchema.optional(),
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  // Last name is optional in every form; an empty submit means "no last name" — normalized
  // to null (clears) so a blank field can't 400 the whole profile update.
  lastName: z
    .string()
    .max(100)
    .transform((v) => (v.trim() === "" ? null : v))
    .nullable()
    .optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  onboardingDone: z.boolean().optional(),
  aiDisclosureAccepted: z.boolean().optional(),
  tosAcceptedVersion: z.string().min(1).optional(),
  // Profile-avatar color (edit-profile). null clears it back to the client default.
  avatarColor: z.string().max(32).nullable().optional(),
  // Home-pinned companion. null unpins; a uuid is verified server-side to belong to the caller.
  primaryCompanionId: z.string().uuid().nullable().optional(),
});

export const UpdateMemorySchema = z.object({
  content: z.string().min(1).max(500).optional(),
  category: z.enum(MEMORY_CATEGORY).optional(),
});

export const ReportMessageSchema = z.object({
  reason: z.string().min(1).max(500),
  detail: z.string().max(2000).optional(),
});

export const BanUserSchema = z.object({
  email: z.string().email("Valid email is required"),
  reason: z.string().max(500).optional(),
});

export const UnbanUserSchema = z.object({
  email: z.string().email("Valid email is required"),
});

// ── Health check DTO ───────────────────────────────────────────────────
export const HealthCheckResponse = z.object({
  status: z.enum(["ok", "degraded"]),
  checks: z.record(z.string(), z.string()).optional(),
});
export type HealthCheckResponse = z.infer<typeof HealthCheckResponse>;

// ── Voice limits (Inworld TTS 2 + Groq STT over WebSocket) ──────────────
// Voice is metered on a MONTHLY budget (unlike text's daily allowance): a voice minute costs ~200×
// a text turn, so a monthly bucket caps the cost tail to 1× (not 30×). See docs/specs/voice-pricing-economics.md.
export const VOICE_MONTHLY_LIMIT_SECONDS = 1_200;           // free: 20 min/month
export const VOICE_MONTHLY_LIMIT_SECONDS_PREMIUM = 36_000;  // premium: 600 min/month (10 hr)
export const VOICE_CALL_MAX_DURATION_SECONDS = 900;         // per call: 15 min (free)
export const VOICE_CALL_MAX_DURATION_SECONDS_PREMIUM = 3_600; // per call: 60 min (premium)

// ── Chat session / queue constants ───────────────────────────────────────
export const TURN_QUEUE_CONCURRENCY = 8;
export const TURN_QUEUE_MAX_FREE_WAIT_MS = 8_000;
export const INWORLD_CONCURRENT_LIMIT = 10;

// ── Voice session constants ──────────────────────────────────────────────
export const VOICE_FILLER_TEXTS = [
  "Anyway...",
  "So, as I was saying...",
  "Right, where were we...",
  "Mm, let me think...",
  "So...",
  "Well, continuing on...",
] as const;
export const VOICE_FALLBACK_TEXT = "I lost my train of thought for a second — say that again?";
export const INTERJECTION_MAX_WORDS = 7;
export const STT_MAX_RETRIES = 2;
export const VOICE_FILLER_CLIP_COUNT = 6;
export const VOICE_SILENCE_PROMPT_TIMEOUT_S = 45;
export const VOICE_SILENCE_END_TIMEOUT_S = 90;

// ── LLM / STT model IDs ─────────────────────────────────────────────────
export const LLM_PRIMARY_MODEL = "llama-3.3-70b-versatile";
export const LLM_FALLBACK_MODEL = "llama-3.1-8b-instant";
export const STT_MODEL = "whisper-large-v3-turbo";

// ── Persona voice system (packs + mechanical trait grid) ────────────────
export * from "./personas.js";
