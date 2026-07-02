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
  VOICE_DAILY_LIMIT_SECONDS: 600,
  VOICE_DAILY_LIMIT_SECONDS_PREMIUM: 3600,
  VOICE_CALL_MAX_DURATION_SECONDS: 900,
  VOICE_CALL_MAX_DURATION_SECONDS_PREMIUM: 3600,
}));

describe("Voice metering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resultsQueue.length = 0;
  });

  describe("checkVoiceDailyLimit", () => {
    it("allows when under the limit", async () => {
      resultsQueue.push([{ totalSeconds: 120 }]);
      const { checkVoiceDailyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceDailyLimit("user-1");
      expect(result.allowed).toBe(true);
      expect(result.usedSeconds).toBe(120);
      expect(result.remainingSeconds).toBe(480);
    });

    it("blocks when at the limit", async () => {
      resultsQueue.push([{ totalSeconds: 600 }]);
      const { checkVoiceDailyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceDailyLimit("user-1");
      expect(result.allowed).toBe(false);
      expect(result.usedSeconds).toBe(600);
      expect(result.remainingSeconds).toBe(0);
    });

    it("allows when no usage yet", async () => {
      resultsQueue.push([{ totalSeconds: 0 }]);
      const { checkVoiceDailyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceDailyLimit("user-1");
      expect(result.allowed).toBe(true);
      expect(result.usedSeconds).toBe(0);
      expect(result.remainingSeconds).toBe(600);
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
    it("dailyLimitSeconds / callMaxSeconds pick the premium bucket", async () => {
      const { dailyLimitSeconds, callMaxSeconds } = await import("../services/voice/metering.js");
      expect(dailyLimitSeconds(false)).toBe(600);
      expect(dailyLimitSeconds(true)).toBe(3600);
      expect(callMaxSeconds(false)).toBe(900);
      expect(callMaxSeconds(true)).toBe(3600);
    });

    it("premium user is allowed past the free daily cap", async () => {
      resultsQueue.push([{ totalSeconds: 700 }]); // over free 600, under premium 3600
      const { checkVoiceDailyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceDailyLimit("user-1", true);
      expect(result.allowed).toBe(true);
      expect(result.limitSeconds).toBe(3600);
      expect(result.remainingSeconds).toBe(2900);
    });

    it("free user is blocked at the same usage", async () => {
      resultsQueue.push([{ totalSeconds: 700 }]);
      const { checkVoiceDailyLimit } = await import("../services/voice/metering.js");
      const result = await checkVoiceDailyLimit("user-1", false);
      expect(result.allowed).toBe(false);
      expect(result.limitSeconds).toBe(600);
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
