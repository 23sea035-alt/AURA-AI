import { describe, it, expect, vi, beforeEach } from "vitest";

const resultsQueue: unknown[] = [];

function makeQuery(): Record<string, any> {
  const q: Record<string, any> = {
    from: vi.fn(() => q),
    where: vi.fn(() => q),
    orderBy: vi.fn(() => q),
    limit: vi.fn(() => q),
    then: (resolve: (v: unknown) => any) => {
      const data = resultsQueue.length > 0 ? resultsQueue.shift() : [];
      return Promise.resolve(data).then(resolve);
    },
    catch: () => {},
  };
  return q;
}

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockDb = {
  select: vi.fn(() => makeQuery()),
  insert: mockInsert,
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  voiceUsageTable: { id: "id", userId: "user_id", companionId: "companion_id", durationSeconds: "duration_seconds", direction: "direction", modelId: "model_id", createdAt: "created_at" },
}));

vi.mock("@aura/shared", () => ({
  VOICE_MONTHLY_LIMIT_SECONDS: 1200,
  VOICE_MONTHLY_LIMIT_SECONDS_PREMIUM: 36000,
  VOICE_CALL_MAX_DURATION_SECONDS: 900,
  VOICE_CALL_MAX_DURATION_SECONDS_PREMIUM: 3600,
}));

describe("Voice metering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resultsQueue.length = 0;
  });

  describe("checkVoiceMonthlyLimit", () => {
    it("allows when under the limit", async () => {
      resultsQueue.push([{ totalSeconds: 120 }]);
      const { checkVoiceMonthlyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceMonthlyLimit("user-1");
      expect(result.allowed).toBe(true);
      expect(result.usedSeconds).toBe(120);
      expect(result.remainingSeconds).toBe(1080);
    });

    it("blocks when at the limit", async () => {
      resultsQueue.push([{ totalSeconds: 1200 }]);
      const { checkVoiceMonthlyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceMonthlyLimit("user-1");
      expect(result.allowed).toBe(false);
      expect(result.usedSeconds).toBe(1200);
      expect(result.remainingSeconds).toBe(0);
    });

    it("allows when no usage yet", async () => {
      resultsQueue.push([{ totalSeconds: 0 }]);
      const { checkVoiceMonthlyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceMonthlyLimit("user-1");
      expect(result.allowed).toBe(true);
      expect(result.usedSeconds).toBe(0);
      expect(result.remainingSeconds).toBe(1200);
    });
  });

  describe("currentMonthStartUTC", () => {
    it("returns the first of the month at UTC midnight (monthly reset window)", async () => {
      const { currentMonthStartUTC } = await import("../services/voice/metering.js");
      expect(currentMonthStartUTC(new Date("2026-07-15T13:45:30Z")).toISOString())
        .toBe("2026-07-01T00:00:00.000Z");
    });

    it("normalizes the last instant of a month to that month's start", async () => {
      const { currentMonthStartUTC } = await import("../services/voice/metering.js");
      expect(currentMonthStartUTC(new Date("2026-02-28T23:59:59Z")).toISOString())
        .toBe("2026-02-01T00:00:00.000Z");
    });
  });

  describe("recordVoiceUsage", () => {
    it("inserts a voice usage record", async () => {
      const { recordVoiceUsage } = await import("../services/voice/metering.js");
      await recordVoiceUsage("user-1", "comp-1", 120, "tts", "sonic-3.5");
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: "user-1",
        companionId: "comp-1",
        durationSeconds: 120,
        direction: "tts",
        modelId: "sonic-3.5",
      });
    });

    it("inserts an STT usage record", async () => {
      const { recordVoiceUsage } = await import("../services/voice/metering.js");
      await recordVoiceUsage("user-1", "comp-1", 60, "stt", "whisper-1");
      expect(mockInsertValues).toHaveBeenCalledWith({
        userId: "user-1",
        companionId: "comp-1",
        durationSeconds: 60,
        direction: "stt",
        modelId: "whisper-1",
      });
    });
  });

  describe("tier-aware limits", () => {
    it("monthlyLimitSeconds / callMaxSeconds pick the premium bucket", async () => {
      const { monthlyLimitSeconds, callMaxSeconds } = await import("../services/voice/metering.js");
      expect(monthlyLimitSeconds(false)).toBe(1200);
      expect(monthlyLimitSeconds(true)).toBe(36000);
      expect(callMaxSeconds(false)).toBe(900);
      expect(callMaxSeconds(true)).toBe(3600);
    });

    it("premium user is allowed past the free monthly cap", async () => {
      resultsQueue.push([{ totalSeconds: 2000 }]); // over free 1200, under premium 36000
      const { checkVoiceMonthlyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceMonthlyLimit("user-1", true);
      expect(result.allowed).toBe(true);
      expect(result.limitSeconds).toBe(36000);
      expect(result.remainingSeconds).toBe(34000);
    });

    it("free user is blocked at the same usage", async () => {
      resultsQueue.push([{ totalSeconds: 2000 }]);
      const { checkVoiceMonthlyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceMonthlyLimit("user-1", false);
      expect(result.allowed).toBe(false);
      expect(result.limitSeconds).toBe(1200);
    });
  });

  describe("estimateSpeechSeconds", () => {
    it("returns 0 for empty text", async () => {
      const { estimateSpeechSeconds } = await import("../services/voice/metering.js");
      expect(estimateSpeechSeconds("   ")).toBe(0);
    });

    it("floors any non-empty text at 1 second", async () => {
      const { estimateSpeechSeconds } = await import("../services/voice/metering.js");
      expect(estimateSpeechSeconds("hi")).toBe(1);
    });

    it("scales with length (~14 chars/sec)", async () => {
      const { estimateSpeechSeconds } = await import("../services/voice/metering.js");
      expect(estimateSpeechSeconds("a".repeat(140))).toBe(10);
    });
  });
});
