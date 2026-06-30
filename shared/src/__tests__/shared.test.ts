import { describe, it, expect } from "vitest";
import {
  PERSONA_KEY,
  HISTORY_WINDOW,
  GENERATION_MAX_TOKENS,
  GENERATION_TEMPERATURE,
  FREE_DAILY_LIMIT,
  MAX_MESSAGE_CHARS,
  MEMORY_RETRIEVAL_TOP_N,
  MEMORY_SCORE_WEIGHTS,
  MEMORY_RECENCY_HALFLIFE_DAYS,
  MEMORY_RELEVANCE_FLOOR,
  MEMORY_IDENTITY_BAR,
  MEMORY_DEDUP_CANDIDATE_CAP,
  MEMORY_IMPORTANCE_BY_CATEGORY,
  L1_PROMPT_GUARD,
  MODERATION_INPUT_THRESHOLDS,
  MODERATION_OUTPUT_THRESHOLDS,
  MODERATION_TIMEOUTS,
  SAFE_FALLBACK_REPLY,
  FLAGGED_USER_WINDOW_DAYS,
  FLAGGED_USER_SUSPEND_THRESHOLD,
  ChatInputSchema,
  CreateCompanionSchema,
  UpdateCompanionSchema,
  UpdateProfileSchema,
  ReportMessageSchema,
  BanUserSchema,
  UnbanUserSchema,
  HealthCheckResponse,
  USER_STATUS,
  AGE_ASSURANCE_METHOD,
  MESSAGE_ROLE,
  MESSAGE_STATUS,
  MEMORY_CATEGORY,
  SUBSCRIPTION_TIER,
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STORE,
  SUBSCRIPTION_PERIOD,
  DEVICE_PLATFORM,
  DEVICE_ENVIRONMENT,
  SAFETY_EVENT_TYPE,
  SAFETY_SOURCE,
  SAFETY_SEVERITY,
  SAFETY_STATUS,
  SAFETY_ACTION,
  MODERATION_CATEGORY,
  MODERATOR_MODEL,
  BANNED_IDENTIFIER_TYPE,
} from "../index.js";

describe("Constants", () => {
  it("PERSONA_KEY defines aurora, orion, lyra", () => {
    expect(PERSONA_KEY).toEqual(["aurora", "orion", "lyra"]);
  });

  it("HISTORY_WINDOW is 8", () => {
    expect(HISTORY_WINDOW).toBe(8);
  });

  it("GENERATION_MAX_TOKENS is 512", () => {
    expect(GENERATION_MAX_TOKENS).toBe(512);
  });

  it("GENERATION_TEMPERATURE is 0.7", () => {
    expect(GENERATION_TEMPERATURE).toBe(0.7);
  });

  it("FREE_DAILY_LIMIT is 30", () => {
    expect(FREE_DAILY_LIMIT).toBe(30);
  });

  it("MAX_MESSAGE_CHARS is 2000", () => {
    expect(MAX_MESSAGE_CHARS).toBe(2000);
  });

  it("MEMORY_RETRIEVAL_TOP_N is 5", () => {
    expect(MEMORY_RETRIEVAL_TOP_N).toBe(5);
  });

  it("MEMORY_SCORE_WEIGHTS has correct values", () => {
    expect(MEMORY_SCORE_WEIGHTS.jaccard).toBe(0.7);
    expect(MEMORY_SCORE_WEIGHTS.importance).toBe(0.3);
    expect(MEMORY_SCORE_WEIGHTS.recency).toBe(0.15);
  });

  it("MEMORY_RECENCY_HALFLIFE_DAYS is 30", () => {
    expect(MEMORY_RECENCY_HALFLIFE_DAYS).toBe(30);
  });

  it("MEMORY_RELEVANCE_FLOOR is 0.08", () => {
    expect(MEMORY_RELEVANCE_FLOOR).toBe(0.08);
  });

  it("MEMORY_IDENTITY_BAR is 0.85", () => {
    expect(MEMORY_IDENTITY_BAR).toBe(0.85);
  });

  it("MEMORY_DEDUP_CANDIDATE_CAP is 50", () => {
    expect(MEMORY_DEDUP_CANDIDATE_CAP).toBe(50);
  });

  it("MEMORY_IMPORTANCE_BY_CATEGORY has all keys", () => {
    expect(MEMORY_IMPORTANCE_BY_CATEGORY.identity).toBe(0.9);
    expect(MEMORY_IMPORTANCE_BY_CATEGORY.relationship).toBe(0.9);
    expect(MEMORY_IMPORTANCE_BY_CATEGORY.general).toBe(0.4);
  });
});

describe("Enum-like constant arrays", () => {
  it("USER_STATUS has active, suspended, banned, deleted", () => {
    expect(USER_STATUS).toContain("active");
    expect(USER_STATUS).toContain("suspended");
    expect(USER_STATUS).toContain("banned");
    expect(USER_STATUS).toContain("deleted");
  });

  it("AGE_ASSURANCE_METHOD has expected values", () => {
    expect(AGE_ASSURANCE_METHOD).toContain("self_declared");
    expect(AGE_ASSURANCE_METHOD).toContain("apple_declared_age_range");
  });

  it("MESSAGE_ROLE has user and assistant", () => {
    expect(MESSAGE_ROLE).toEqual(["user", "assistant"]);
  });

  it("MESSAGE_STATUS has pending, complete, failed, blocked", () => {
    expect(MESSAGE_STATUS).toContain("pending");
    expect(MESSAGE_STATUS).toContain("complete");
    expect(MESSAGE_STATUS).toContain("failed");
    expect(MESSAGE_STATUS).toContain("blocked");
  });

  it("MEMORY_CATEGORY has all categories", () => {
    expect(MEMORY_CATEGORY).toContain("identity");
    expect(MEMORY_CATEGORY).toContain("preference");
    expect(MEMORY_CATEGORY).toContain("general");
  });

  it("SUBSCRIPTION_TIER has free and premium", () => {
    expect(SUBSCRIPTION_TIER).toEqual(["free", "premium"]);
  });

  it("SUBSCRIPTION_STATUS has all statuses", () => {
    expect(SUBSCRIPTION_STATUS).toContain("active");
    expect(SUBSCRIPTION_STATUS).toContain("expired");
  });

  it("SUBSCRIPTION_PERIOD has normal, trial, intro", () => {
    expect(SUBSCRIPTION_PERIOD).toContain("normal");
    expect(SUBSCRIPTION_PERIOD).toContain("trial");
    expect(SUBSCRIPTION_PERIOD).toContain("intro");
  });

  it("DEVICE_PLATFORM has ios", () => {
    expect(DEVICE_PLATFORM).toEqual(["ios"]);
  });

  it("SAFETY_EVENT_TYPE has all event types", () => {
    expect(SAFETY_EVENT_TYPE).toContain("input_blocked");
    expect(SAFETY_EVENT_TYPE).toContain("crisis_detected");
  });

  it("MODERATION_CATEGORY has all categories", () => {
    expect(MODERATION_CATEGORY).toContain("self_harm");
    expect(MODERATION_CATEGORY).toContain("sexual");
  });

  it("MODERATOR_MODEL has expected models", () => {
    expect(MODERATOR_MODEL).toContain("deterministic");
    expect(MODERATOR_MODEL).toContain("openai_omni");
    expect(MODERATOR_MODEL).toContain("prompt_guard");
  });
});

describe("Moderation config", () => {
  it("L1_PROMPT_GUARD has correct thresholds", () => {
    expect(L1_PROMPT_GUARD.ESCALATE).toBe(0.5);
    expect(L1_PROMPT_GUARD.BLOCK).toBe(0.9);
  });

  it("MODERATION_INPUT_THRESHOLDS has expected values", () => {
    expect(MODERATION_INPUT_THRESHOLDS["sexual/minors"]).toBe(0.1);
    expect(MODERATION_INPUT_THRESHOLDS["self-harm"]).toBe(0.3);
    expect(MODERATION_INPUT_THRESHOLDS["sexual"]).toBe(0.95);
    expect(MODERATION_INPUT_THRESHOLDS["violence"]).toBe(0.5);
    expect(MODERATION_INPUT_THRESHOLDS["hate"]).toBe(0.5);
  });

  it("MODERATION_OUTPUT_THRESHOLDS has expected values", () => {
    expect(MODERATION_OUTPUT_THRESHOLDS["sexual/minors"]).toBe(0.05);
    expect(MODERATION_OUTPUT_THRESHOLDS["self-harm"]).toBe(0.15);
    expect(MODERATION_OUTPUT_THRESHOLDS["sexual"]).toBe(0.8);
    expect(MODERATION_OUTPUT_THRESHOLDS["violence"]).toBe(0.35);
  });

  it("MODERATION_TIMEOUTS has correct values", () => {
    expect(MODERATION_TIMEOUTS.L1_PROMPT_GUARD_MS).toBe(1000);
    expect(MODERATION_TIMEOUTS.L2_OMNI_MS).toBe(2000);
    expect(MODERATION_TIMEOUTS.L3_SAFEGUARD_MS).toBe(4000);
  });
});

describe("FLAGGED_USER config", () => {
  it("FLAGGED_USER_WINDOW_DAYS is 30", () => {
    expect(FLAGGED_USER_WINDOW_DAYS).toBe(30);
  });

  it("FLAGGED_USER_SUSPEND_THRESHOLD is 3", () => {
    expect(FLAGGED_USER_SUSPEND_THRESHOLD).toBe(3);
  });
});

describe("SAFE_FALLBACK_REPLY", () => {
  it("is a non-committal response string", () => {
    expect(SAFE_FALLBACK_REPLY.length).toBeGreaterThan(20);
    expect(typeof SAFE_FALLBACK_REPLY).toBe("string");
  });
});

describe("ChatInputSchema", () => {
  it("accepts valid input", () => {
    const result = ChatInputSchema.parse({ content: "Hello" });
    expect(result.content).toBe("Hello");
  });

  it("rejects empty content", () => {
    expect(() => ChatInputSchema.parse({ content: "" })).toThrow();
  });

  it("rejects content exceeding MAX_MESSAGE_CHARS", () => {
    expect(() =>
      ChatInputSchema.parse({ content: "x".repeat(MAX_MESSAGE_CHARS + 1) }),
    ).toThrow();
  });

  it("accepts optional turnId", () => {
    const result = ChatInputSchema.parse({
      content: "Hello",
      turnId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.turnId).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects non-uuid turnId", () => {
    expect(() =>
      ChatInputSchema.parse({
        content: "Hello",
        turnId: "not-a-uuid",
      }),
    ).toThrow();
  });

  it("accepts sessionStartedAt", () => {
    const result = ChatInputSchema.parse({
      content: "Hi",
      sessionStartedAt: "2026-01-01T00:00:00Z",
    });
    expect(result.sessionStartedAt).toBe("2026-01-01T00:00:00Z");
  });
});

describe("CreateCompanionSchema", () => {
  it("accepts valid input with defaults", () => {
    const result = CreateCompanionSchema.parse({ name: "Aurora" });
    expect(result.name).toBe("Aurora");
    expect(result.personaKey).toBe("aurora");
    expect(result.traits).toEqual({});
  });

  it("accepts custom personaKey", () => {
    const result = CreateCompanionSchema.parse({
      name: "Orion",
      personaKey: "orion",
    });
    expect(result.personaKey).toBe("orion");
  });

  it("rejects invalid personaKey", () => {
    expect(() =>
      CreateCompanionSchema.parse({ name: "Test", personaKey: "invalid" }),
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => CreateCompanionSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 100 chars", () => {
    expect(() =>
      CreateCompanionSchema.parse({ name: "x".repeat(101) }),
    ).toThrow();
  });
});

describe("UpdateCompanionSchema", () => {
  it("accepts partial update with name", () => {
    const result = UpdateCompanionSchema.parse({ name: "New Name" });
    expect(result.name).toBe("New Name");
  });

  it("accepts empty object", () => {
    const result = UpdateCompanionSchema.parse({});
    expect(result).toEqual({});
  });

  it("accepts traits update", () => {
    const result = UpdateCompanionSchema.parse({
      traits: { warmth: "warm" },
    });
    expect(result.traits).toEqual({ warmth: "warm" });
  });
});

describe("UpdateProfileSchema", () => {
  it("accepts valid date of birth", () => {
    const result = UpdateProfileSchema.parse({
      dateOfBirth: "2000-01-15",
    });
    expect(result.dateOfBirth).toBe("2000-01-15");
  });

  it("rejects invalid date format", () => {
    expect(() =>
      UpdateProfileSchema.parse({ dateOfBirth: "01-15-2000" }),
    ).toThrow();
  });

  it("accepts firstName", () => {
    const result = UpdateProfileSchema.parse({ firstName: "John" });
    expect(result.firstName).toBe("John");
  });

  it("accepts booleans", () => {
    const result = UpdateProfileSchema.parse({
      onboardingDone: true,
      aiDisclosureAccepted: false,
    });
    expect(result.onboardingDone).toBe(true);
    expect(result.aiDisclosureAccepted).toBe(false);
  });

  it("accepts tosAcceptedVersion", () => {
    const result = UpdateProfileSchema.parse({
      tosAcceptedVersion: "1.0",
    });
    expect(result.tosAcceptedVersion).toBe("1.0");
  });
});

describe("ReportMessageSchema", () => {
  it("accepts valid report with just reason", () => {
    const result = ReportMessageSchema.parse({ reason: "inappropriate" });
    expect(result.reason).toBe("inappropriate");
  });

  it("accepts optional detail", () => {
    const result = ReportMessageSchema.parse({
      reason: "spam",
      detail: "They sent many messages",
    });
    expect(result.detail).toBe("They sent many messages");
  });

  it("rejects empty reason", () => {
    expect(() => ReportMessageSchema.parse({ reason: "" })).toThrow();
  });

  it("rejects reason over 500 chars", () => {
    expect(() =>
      ReportMessageSchema.parse({ reason: "x".repeat(501) }),
    ).toThrow();
  });
});

describe("BanUserSchema / UnbanUserSchema", () => {
  it("BanUserSchema accepts valid email", () => {
    const result = BanUserSchema.parse({ email: "user@example.com" });
    expect(result.email).toBe("user@example.com");
  });

  it("BanUserSchema rejects invalid email", () => {
    expect(() =>
      BanUserSchema.parse({ email: "not-email" }),
    ).toThrow();
  });

  it("BanUserSchema accepts optional reason", () => {
    const result = BanUserSchema.parse({
      email: "user@example.com",
      reason: "Spam",
    });
    expect(result.reason).toBe("Spam");
  });

  it("UnbanUserSchema validates email", () => {
    expect(() =>
      UnbanUserSchema.parse({ email: "" }),
    ).toThrow();
  });

  it("UnbanUserSchema accepts valid email", () => {
    const result = UnbanUserSchema.parse({ email: "user@example.com" });
    expect(result.email).toBe("user@example.com");
  });
});

describe("HealthCheckResponse", () => {
  it("accepts ok status", () => {
    const result = HealthCheckResponse.parse({ status: "ok" });
    expect(result.status).toBe("ok");
  });

  it("accepts degraded status", () => {
    const result = HealthCheckResponse.parse({ status: "degraded" });
    expect(result.status).toBe("degraded");
  });

  it("rejects invalid status", () => {
    expect(() =>
      HealthCheckResponse.parse({ status: "unknown" }),
    ).toThrow();
  });

  it("accepts optional checks", () => {
    const result = HealthCheckResponse.parse({
      status: "ok",
      checks: { db: "connected" },
    });
    expect(result.checks).toEqual({ db: "connected" });
  });
});
