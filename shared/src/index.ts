import { z } from "zod";

export const USER_STATUS = ['active', 'suspended', 'banned', 'deleted'] as const;
export type UserStatus = (typeof USER_STATUS)[number];

export const AGE_ASSURANCE_METHOD = ['self_declared', 'apple_declared_age_range', 'third_party'] as const;
export type AgeAssuranceMethod = (typeof AGE_ASSURANCE_METHOD)[number];

export const PERSONA_KEY = ['aurora', 'orion', 'lyra'] as const;
export type PersonaKey = (typeof PERSONA_KEY)[number];

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

export interface PersonaTraits {
  warmth: 'reserved' | 'warm' | 'affectionate';
  energy: 'calm' | 'balanced' | 'playful';
  verbosity: 'concise' | 'balanced' | 'expansive';
}

export const FREE_DAILY_LIMIT = 30;
export const MAX_MESSAGE_CHARS = 2000;
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
export const L1_PROMPT_GUARD = { ESCALATE: 0.7, BLOCK: 0.9 } as const;

export const MODERATION_INPUT_THRESHOLDS: Record<string, number> = {
  "sexual/minors": 0.1,
  "self-harm": 0.20,
  "self-harm/intent": 0.20,
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
  "sexual": 0.70,
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

// ── Voice / TTS ──────────────────────────────────────────────────────────
export const VOICE_DAILY_LIMIT_SECONDS = 600;
export const VOICE_DAILY_LIMIT_SECONDS_PREMIUM = 3600;
export const VOICE_CALL_MAX_DURATION_SECONDS = 900;
export const VOICE_CALL_MAX_DURATION_SECONDS_PREMIUM = 3600;
export const DEFAULT_CARTESIA_VOICE_ID = "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4";
export const DEFAULT_CARTESIA_MODEL_ID = "sonic-3.5";

// ── Request DTOs ───────────────────────────────────────────────────────
export const ChatInputSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_CHARS, `Message must be under ${MAX_MESSAGE_CHARS} characters`),
  turnId: z.string().uuid().optional(),
  sessionStartedAt: z.string().optional(),
});

export const CreateCompanionSchema = z.object({
  name: z.string().min(1).max(100),
  personaKey: z.enum(PERSONA_KEY).optional().default('aurora'),
  traits: z.record(z.string(), z.unknown()).optional().default({}),
});

export const UpdateCompanionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  traits: z.record(z.string(), z.unknown()).optional(),
});

export const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
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
