import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock shared constants before importing the module under test
vi.mock("@aura/shared", () => ({
  TURN_QUEUE_CONCURRENCY: 5,
  INWORLD_CONCURRENT_LIMIT: 1, // 1 makes TTS priority ordering deterministic to test
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
    it("enqueues and resolves a TTS task (defaults to free priority)", async () => {
      const { enqueueTts } = await import("../services/chat/turn-queue.js");
      const fn = vi.fn().mockResolvedValue("tts-result");
      const result = await enqueueTts(fn);
      expect(result).toBe("tts-result");
    });

    it("enqueues a premium TTS task and resolves", async () => {
      const { enqueueTts } = await import("../services/chat/turn-queue.js");
      const fn = vi.fn().mockResolvedValue("premium-tts");
      const result = await enqueueTts(fn, { isPremium: true });
      expect(result).toBe("premium-tts");
    });

    it("runs a queued premium TTS task before a queued free one", async () => {
      const { enqueueTts } = await import("../services/chat/turn-queue.js");
      const order: string[] = [];
      let release!: () => void;
      const blocker = new Promise<void>((r) => { release = r; });

      enqueueTts(() => blocker); // occupies the single TTS slot
      const free = enqueueTts(async () => { order.push("free"); }, { isPremium: false });
      const premium = enqueueTts(async () => { order.push("premium"); }, { isPremium: true });

      release(); // free the slot; p-queue drains the higher-priority item first
      await Promise.all([free, premium]);
      expect(order).toEqual(["premium", "free"]);
    });
  });

  describe("enqueueBackground", () => {
    it("enqueues and resolves a background task", async () => {
      const { enqueueBackground } = await import("../services/chat/turn-queue.js");
      const fn = vi.fn().mockResolvedValue("bg-result");
      const result = await enqueueBackground(fn);
      expect(result).toBe("bg-result");
    });

    it("runs a queued live turn (even free) before a queued background task", async () => {
      const { enqueueTurn, enqueueBackground } = await import("../services/chat/turn-queue.js");
      const order: string[] = [];
      // Saturate all 5 concurrency slots so the next two adds must queue and drain by priority.
      const releases: Array<() => void> = [];
      const blockers = Array.from({ length: 5 }, () => new Promise<void>((r) => { releases.push(r); }));
      blockers.forEach((b) => enqueueTurn(() => b, { isPremium: false }));

      const background = enqueueBackground(async () => { order.push("background"); });
      const free = enqueueTurn(async () => { order.push("free"); }, { isPremium: false });

      releases.forEach((r) => r()); // free the slots; p-queue drains higher priority (free) first
      await Promise.all([background, free]);
      expect(order).toEqual(["free", "background"]);
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
