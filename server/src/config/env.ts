import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, "CLERK_PUBLISHABLE_KEY is required"),
  CLERK_WEBHOOK_SECRET: z.string().min(1, "CLERK_WEBHOOK_SECRET is required"),

  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().min(1, "NVIDIA_API_KEY is required"),
  GROQ_API_KEY: z.string().optional(),

  REVENUECAT_WEBHOOK_SECRET: z.string().min(1, "REVENUECAT_WEBHOOK_SECRET is required"),

  APNS_KEY_ID: z.string().optional(),
  APNS_TEAM_ID: z.string().optional(),
  APNS_KEY_FILE: z.string().optional(),
  APNS_ENVIRONMENT: z.enum(["production", "sandbox"]).default("sandbox"),

  BANNED_IDENTITY_PEPPER: z.string().min(1, "BANNED_IDENTITY_PEPPER is required"),

  SENTRY_DSN: z.string().optional(),

  // ── Voice / TTS ──────────────────────────────────────────────────
  CARTESIA_API_KEY: z.string().optional(),
  CARTESIA_VOICE_ID: z.string().default("db6b0ed5-d5d3-463d-ae85-518a07d3c2b4"),

  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  LIVEKIT_URL: z.string().optional(),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // ── Model selection ─────────────────────────────────────────────
  MODEL_GROQ: z.string().default("llama-3.3-70b-versatile"),
  MODEL_GENERATE_REPLY: z.string().default("llama-3.1-8b-instant"),
  MODEL_MODERATE_INPUT: z.string().default("llama-3.1-8b-instant"),
  MODEL_MODERATE_OUTPUT: z.string().default("llama-3.1-8b-instant"),
  MODEL_CONSOLIDATE_MEMORY: z.string().default("llama-3.3-70b-versatile"),

  MODEL_FALLBACK_GENERATE_REPLY: z.string().default("llama-3.3-70b-versatile"),
  MODEL_FALLBACK_MODERATE_INPUT: z.string().default("llama-3.3-70b-versatile"),
  MODEL_FALLBACK_MODERATE_OUTPUT: z.string().default("llama-3.3-70b-versatile"),
  MODEL_FALLBACK_CONSOLIDATE_MEMORY: z.string().default("llama-3.1-8b-instant"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => i.path.join("."))
      .join(", ");
    throw new Error(
      `Environment validation failed. Missing or invalid variables: ${missing}. ` +
        "The application will not start without a valid configuration. " +
        "Check your .env file or Render environment variables.",
    );
  }
  _env = result.data;
  return _env;
}

export function getEnv(): Env {
  if (!_env) {
    return validateEnv();
  }
  return _env;
}
