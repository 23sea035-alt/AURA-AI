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
  VOICE_CALL_MAX_DURATION_SECONDS: 900,
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

  describe("checkCallDurationLimit", () => {
    it("blocks call exceeding max duration", async () => {
      resultsQueue.push([{ totalSeconds: 0 }]);
      const { checkCallDurationLimit } = await import("../services/voice/metering.js");
      const result = await checkCallDurationLimit("user-1", 1000);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("exceeds maximum");
    });

    it("blocks when daily limit already reached", async () => {
      resultsQueue.push([{ totalSeconds: 600 }]);
      const { checkCallDurationLimit } = await import("../services/voice/metering.js");
      const result = await checkCallDurationLimit("user-1", 60);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Daily voice limit reached");
    });

    it("blocks when requested exceeds remaining", async () => {
      resultsQueue.push([{ totalSeconds: 580 }]);
      const { checkCallDurationLimit } = await import("../services/voice/metering.js");
      const result = await checkCallDurationLimit("user-1", 60);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Only");
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
});
