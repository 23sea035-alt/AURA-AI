import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEnqueueMemoryJob = vi.fn();
const mockRetrieveMemories = vi.fn();
const mockCheckFreeTierLimit = vi.fn();
const mockShouldShowBreakReminder = vi.fn();
const mockAssemblePrompt = vi.fn();
const mockGenerateReply = vi.fn();
const mockScreenInput = vi.fn();
const mockScreenOutput = vi.fn();
const mockBuildCrisisResponse = vi.fn();
const mockAutoSuspend = vi.fn();

// Phase-aware db mock: post-H1, executeTurn reads (user/companion/history) via db.select OUTSIDE a
// transaction, logs safety events via db.insert, and writes the turn inside a short db.transaction.
vi.mock("../db/src/index.js", () => {
  const usersTable = { __t: "users" };
  const companionsTable = { __t: "companions" };
  const messagesTable = { __t: "messages" };
  const safetyEventsTable = { __t: "safety_events" };
  const deviceTokensTable = { __t: "device_tokens" };

  const userRow = { isPremium: false, isMinor: false, status: "active" };
  const companionRow = {
    id: "c1", userId: "u1", name: "Aurora", personaKey: "aurora",
    traits: { warmth: "warm", energy: "balanced", verbosity: "balanced" }, messageCount: 0,
  };

  const rowsFor = (table: unknown): unknown[] => {
    if (table === usersTable) return [userRow];
    if (table === companionsTable) return [companionRow];
    return []; // messages (history / fetchExistingTurn), device tokens
  };

  // A thenable that also exposes .limit()/.orderBy() so it works whether the caller awaits
  // `.where(...)` directly (sendReplyPush) or chains `.limit(1)` / `.orderBy(...)`.
  const promiseLike = (result: unknown[]) => ({
    limit: () => Promise.resolve(result),
    orderBy: () => Promise.resolve(result),
    then: (onF: (v: unknown[]) => unknown, onR?: (e: unknown) => unknown) => Promise.resolve(result).then(onF, onR),
  });
  const selectChain = () => ({
    from: (table: unknown) => ({
      where: () => promiseLike(rowsFor(table)),
      orderBy: () => Promise.resolve(rowsFor(table)),
      limit: () => Promise.resolve(rowsFor(table)),
    }),
  });

  const tx = {
    insert: () => ({
      values: (v: { role?: string }) => ({
        returning: () => Promise.resolve([{ id: `m-${v?.role ?? "user"}`, role: v?.role ?? "user", content: "x" }]),
      }),
    }),
    update: () => ({ set: () => ({ where: () => Promise.resolve(undefined) }) }),
  };

  return {
    db: {
      select: vi.fn(() => selectChain()),
      insert: vi.fn(() => ({ values: () => Promise.resolve(undefined) })), // logSafetyEvent (no .returning())
      transaction: vi.fn(async (cb: (t: unknown) => Promise<unknown>) => await cb(tx)),
      update: vi.fn(() => ({ set: () => ({ where: () => Promise.resolve(undefined) }) })),
    },
    usersTable, companionsTable, messagesTable, safetyEventsTable, deviceTokensTable,
  };
});

vi.mock("../services/moderation/index.js", () => ({
  createModerator: vi.fn(() => ({
    screenInput: mockScreenInput,
    screenOutput: mockScreenOutput,
  })),
  buildCrisisResponse: mockBuildCrisisResponse,
}));

vi.mock("../services/llm/index.js", () => ({
  getLLMProvider: vi.fn(() => ({ generateReply: mockGenerateReply })),
}));

vi.mock("../services/memory.js", () => ({
  retrieveMemories: mockRetrieveMemories,
  enqueueMemoryJob: mockEnqueueMemoryJob,
}));

vi.mock("../services/chat/free-tier.js", () => ({
  checkFreeTierLimit: mockCheckFreeTierLimit,
}));

vi.mock("../services/chat/break-reminder.js", () => ({
  shouldShowBreakReminder: mockShouldShowBreakReminder,
}));

vi.mock("../services/auth/auth.service.js", () => ({
  autoSuspendIfNeeded: mockAutoSuspend,
}));

vi.mock("../services/chat/prompt-assembler.js", () => ({
  assemblePrompt: mockAssemblePrompt,
  GENERATION_FALLBACK_REPLY: "I'm having trouble responding right now.",
}));

vi.mock("../lib/logger.js", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("../lib/observability.js", () => ({ captureException: vi.fn() }));
vi.mock("../lib/metrics.js", () => ({ incrementMetric: vi.fn() }));

vi.mock("../services/notifications/apns.js", () => ({
  sendPushNotification: vi.fn(),
}));

const validInput = {
  userId: "u1",
  companionId: "c1",
  content: "Hello!",
  sessionStartedAt: new Date().toISOString(),
  providedTurnId: "t1",
};

describe("Turn pipeline — memory safety-skip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckFreeTierLimit.mockResolvedValue({ allowed: true });
    mockShouldShowBreakReminder.mockReturnValue({ remind: false });
    mockAssemblePrompt.mockReturnValue({
      systemPrompt: "You are a companion",
      messages: [{ role: "user", content: "Hello!" }],
    });
    mockGenerateReply.mockResolvedValue("Hi there!");
    mockRetrieveMemories.mockResolvedValue([]);
    mockEnqueueMemoryJob.mockResolvedValue(null); // returns a Promise — it's fire-and-forget now
    mockAutoSuspend.mockResolvedValue(undefined);
  });

  describe("enqueueMemoryJob IS called", () => {
    it("calls enqueueMemoryJob when input and output pass moderation", async () => {
      mockScreenInput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L0-L2", policyVersion: "1" });
      mockScreenOutput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L3", policyVersion: "1" });

      const { processTurn } = await import("../services/chat/turn-pipeline.js");
      const result = await processTurn(validInput);

      expect(mockEnqueueMemoryJob).toHaveBeenCalledTimes(1);
      expect(result.error).toBeUndefined();
    });

    it("calls enqueueMemoryJob when output is escalated but allowed", async () => {
      mockScreenInput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L0-L2", policyVersion: "1" });
      mockScreenOutput.mockResolvedValue({ action: "allow", categories: [], escalated: true, layer: "safeguard", policyVersion: "1" });

      const { processTurn } = await import("../services/chat/turn-pipeline.js");
      const result = await processTurn(validInput);

      expect(mockEnqueueMemoryJob).toHaveBeenCalledTimes(1);
      expect(result.error).toBeUndefined();
    });

    it("runs generation OUTSIDE the write transaction (H1: gen before tx)", async () => {
      mockScreenInput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L0-L2", policyVersion: "1" });
      mockScreenOutput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L3", policyVersion: "1" });

      const mod = await import("../db/src/index.js");
      const txSpy = (mod as any).db.transaction;

      const { processTurn } = await import("../services/chat/turn-pipeline.js");
      await processTurn(validInput);

      expect(mockGenerateReply).toHaveBeenCalled();
      expect(txSpy).toHaveBeenCalled();
      // The (only, on the allow path) transaction is the Phase-4 write — generation must precede it.
      expect(mockGenerateReply.mock.invocationCallOrder[0]).toBeLessThan(txSpy.mock.invocationCallOrder[0]);
    });
  });

  describe("enqueueMemoryJob is NOT called (safety skip)", () => {
    it("does NOT enqueue memory when output is blocked", async () => {
      mockScreenInput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L0-L2", policyVersion: "1" });
      mockScreenOutput.mockResolvedValue({
        action: "block", categories: [{ category: "violence", score: 0.5 }], escalated: false,
        layer: "L3", policyVersion: "1", safeFallback: "I can't respond to that.",
      });

      const { processTurn } = await import("../services/chat/turn-pipeline.js");
      const result = await processTurn(validInput);

      expect(mockEnqueueMemoryJob).not.toHaveBeenCalled();
      expect(result.error).toBeUndefined();
    });

    it("does NOT enqueue memory when input is blocked", async () => {
      mockScreenInput.mockResolvedValue({ action: "block", categories: [], escalated: false, layer: "L2", policyVersion: "1", reason: "Blocked" });

      const { processTurn } = await import("../services/chat/turn-pipeline.js");
      const result = await processTurn(validInput);

      expect(mockEnqueueMemoryJob).not.toHaveBeenCalled();
      expect(result.error).toBeDefined();
    });

    it("does NOT enqueue memory on crisis path", async () => {
      mockScreenInput.mockResolvedValue({ action: "crisis", categories: [{ category: "self-harm", score: 0.9 }], escalated: false, layer: "L2", policyVersion: "1" });
      mockBuildCrisisResponse.mockReturnValue("Crisis reply");

      const { processTurn } = await import("../services/chat/turn-pipeline.js");
      const result = await processTurn(validInput);

      expect(mockEnqueueMemoryJob).not.toHaveBeenCalled();
      expect(result.safetyFlagged).toBe(true);
    });

    // Regression lock (audit H8 / verification): a failed safety-event write must NOT roll back or
    // suppress the crisis turn — the user must still receive the 988 reply.
    it("still delivers the crisis reply when the safety-event write fails", async () => {
      mockScreenInput.mockResolvedValue({ action: "crisis", categories: [{ category: "self-harm", score: 0.9 }], escalated: false, layer: "L2", policyVersion: "1" });
      mockBuildCrisisResponse.mockReturnValue("Please reach 988 — Crisis reply");

      const mod = await import("../db/src/index.js");
      const dbMock = (mod as any).db;
      const originalInsert = dbMock.insert;
      // logSafetyEvent writes via the ROOT db.insert (not the turn tx) — make it throw.
      dbMock.insert = vi.fn(() => ({ values: vi.fn(() => { throw new Error("safety-log DB down"); }) }));

      try {
        const { processTurn } = await import("../services/chat/turn-pipeline.js");
        const result = await processTurn(validInput);

        expect(result.error).toBeUndefined();
        expect(result.safetyFlagged).toBe(true);
        expect(result.aiMessage).not.toBeNull();
      } finally {
        dbMock.insert = originalInsert;
      }
    });
  });
});
