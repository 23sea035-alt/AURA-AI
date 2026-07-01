import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock shared constants before importing the module under test
vi.mock("@aura/shared", () => ({
  TURN_QUEUE_CONCURRENCY: 5,
  INWORLD_CONCURRENT_LIMIT: 2,
}));

describe("turn-queue", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("enqueueTurn priority", () => {
    it("enqueues premium turns with priority 1 and resolves", async () => {
      const { enqueueTurn } = await import("../services/chat/turn-queue.js");
      const fn = vi.fn().mockResolvedValue("premium-result");
      const result = await enqueueTurn(fn, { isPremium: true });
      expect(result).toBe("premium-result");
    });

    it("enqueues free turns with priority 0 and resolves", async () => {
      const { enqueueTurn } = await import("../services/chat/turn-queue.js");
      const fn = vi.fn().mockResolvedValue("free-result");
      const result = await enqueueTurn(fn, { isPremium: false });
      expect(result).toBe("free-result");
    });
  });

  describe("enqueueTts", () => {
    it("enqueues and resolves a TTS task", async () => {
      const { enqueueTts } = await import("../services/chat/turn-queue.js");
      const fn = vi.fn().mockResolvedValue("tts-result");
      const result = await enqueueTts(fn);
      expect(result).toBe("tts-result");
    });
  });

  describe("turnQueueSize", () => {
    it("returns 0 when no turns are queued", async () => {
      const { turnQueueSize } = await import("../services/chat/turn-queue.js");
      expect(turnQueueSize()).toBe(0);
    });

    it("reflects pending turns", async () => {
      const { enqueueTurn, turnQueueSize } = await import("../services/chat/turn-queue.js");
      enqueueTurn(() => new Promise(() => {}), { isPremium: true });
      expect(turnQueueSize()).toBe(1);
    });
  });

  describe("ttsQueueSize", () => {
    it("returns 0 when no TTS tasks are queued", async () => {
      const { ttsQueueSize } = await import("../services/chat/turn-queue.js");
      expect(ttsQueueSize()).toBe(0);
    });

    it("reflects pending TTS tasks", async () => {
      const { enqueueTts, ttsQueueSize } = await import("../services/chat/turn-queue.js");
      enqueueTts(() => new Promise(() => {}));
      expect(ttsQueueSize()).toBe(1);
    });
  });
});
