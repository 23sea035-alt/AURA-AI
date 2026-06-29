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

// Post-H1, executeTurn reads user/companion via db.select OUTSIDE the transaction, then writes the
// turn inside a short db.transaction. The retry/idempotency logic under test lives in processTurn.
vi.mock("../db/src/index.js", () => {
  const usersTable = { __t: "users" };
  const companionsTable = { __t: "companions" };
  const messagesTable = { __t: "messages" };
  const safetyEventsTable = { __t: "safety_events" };
  const deviceTokensTable = { __t: "device_tokens" };

  const workingTx = {
    insert: () => ({ values: (v: { role?: string }) => ({ returning: () => Promise.resolve([{ id: `m-${v?.role ?? "user"}`, role: v?.role ?? "user" }]) }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve(undefined) }) }),
  };

  return {
    db: {
      // Reassigned per-test in beforeEach (table-aware) and overridden by specific tests.
      select: vi.fn(() => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve([]), orderBy: () => Promise.resolve([]), then: (f: any) => Promise.resolve([]).then(f) }) }) })),
      insert: vi.fn(() => ({ values: () => Promise.resolve(undefined) })),
      transaction: vi.fn(async (cb: (t: unknown) => Promise<unknown>) => await cb(workingTx)),
      update: vi.fn(() => ({ set: () => ({ where: () => Promise.resolve(undefined) }) })),
    },
    usersTable, companionsTable, messagesTable, safetyEventsTable, deviceTokensTable,
    __workingTx: workingTx,
  };
});

vi.mock("../services/moderation/index.js", () => ({
  createModerator: vi.fn(() => ({ screenInput: mockScreenInput, screenOutput: mockScreenOutput })),
  buildCrisisResponse: mockBuildCrisisResponse,
}));
vi.mock("../services/llm/index.js", () => ({ getLLMProvider: vi.fn(() => ({ generateReply: mockGenerateReply })) }));
vi.mock("../services/memory.js", () => ({ retrieveMemories: mockRetrieveMemories, enqueueMemoryJob: mockEnqueueMemoryJob }));
vi.mock("../services/chat/free-tier.js", () => ({ checkFreeTierLimit: mockCheckFreeTierLimit }));
vi.mock("../services/chat/break-reminder.js", () => ({ shouldShowBreakReminder: mockShouldShowBreakReminder }));
vi.mock("../services/auth/auth.service.js", () => ({ autoSuspendIfNeeded: mockAutoSuspend }));
vi.mock("../services/chat/prompt-assembler.js", () => ({ assemblePrompt: mockAssemblePrompt, GENERATION_FALLBACK_REPLY: "fallback" }));
vi.mock("../lib/logger.js", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../lib/observability.js", () => ({ captureException: vi.fn() }));
vi.mock("../lib/metrics.js", () => ({ incrementMetric: vi.fn() }));
vi.mock("../services/notifications/apns.js", () => ({ sendPushNotification: vi.fn() }));

// Builds a table-aware db.select: user/companion rows so executeTurn reaches the write tx; [] for
// messages (history / fetchExistingTurn → "no existing turn").
function makeTableAwareSelect(mod: any) {
  const userRow = { isPremium: false, isMinor: false, status: "active" };
  const companionRow = { id: "c1", userId: "u1", name: "Aurora", personaKey: "aurora", traits: { warmth: "warm", energy: "balanced", verbosity: "balanced" }, messageCount: 0 };
  const rowsFor = (t: unknown): unknown[] => (t === mod.usersTable ? [userRow] : t === mod.companionsTable ? [companionRow] : []);
  const promiseLike = (r: unknown[]) => ({ limit: () => Promise.resolve(r), orderBy: () => Promise.resolve(r), then: (f: (v: unknown[]) => unknown, e?: (x: unknown) => unknown) => Promise.resolve(r).then(f, e) });
  return vi.fn(() => ({ from: (t: unknown) => ({ where: () => promiseLike(rowsFor(t)), orderBy: () => Promise.resolve(rowsFor(t)), limit: () => Promise.resolve(rowsFor(t)) }) }));
}

const validInput = {
  userId: "u1",
  companionId: "c1",
  content: "Hello!",
  sessionStartedAt: new Date().toISOString(),
  providedTurnId: "t1",
};

describe("Turn pipeline — turn_id retry & idempotency", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../db/src/index.js");
    const dbMock = (mod as any).db;
    dbMock.select = makeTableAwareSelect(mod);
    dbMock.transaction = vi.fn(async (cb: (t: unknown) => Promise<unknown>) => await cb((mod as any).__workingTx));
    mockCheckFreeTierLimit.mockResolvedValue({ allowed: true });
    mockShouldShowBreakReminder.mockReturnValue({ remind: false });
    mockAssemblePrompt.mockReturnValue({ systemPrompt: "You are a companion", messages: [{ role: "user", content: "Hello!" }] });
    mockGenerateReply.mockResolvedValue("Hi there!");
    mockRetrieveMemories.mockResolvedValue([]);
    mockEnqueueMemoryJob.mockResolvedValue(null);
    mockAutoSuspend.mockResolvedValue(undefined);
    mockScreenInput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L0-L2", policyVersion: "1" });
    mockScreenOutput.mockResolvedValue({ action: "allow", categories: [], escalated: false, layer: "L3", policyVersion: "1" });
  });

  it("retries with new turnId on a write-tx unique violation", async () => {
    const mod = await import("../db/src/index.js");
    const dbMock = (mod as any).db;
    let callCount = 0;
    dbMock.transaction = vi.fn(async (cb: (t: unknown) => Promise<unknown>) => {
      callCount++;
      if (callCount === 1) {
        const err = new Error("duplicate key value violates unique constraint 'uq_turn_id_role'");
        (err as any).code = "23505";
        throw err;
      }
      return await cb((mod as any).__workingTx);
    });

    const { processTurn } = await import("../services/chat/turn-pipeline.js");
    const result = await processTurn(validInput);

    expect(result.error).toBeUndefined();
    expect(callCount).toBe(2);
  });

  it("returns the existing turn without re-generating on a duplicate turnId (idempotency)", async () => {
    const mod = await import("../db/src/index.js");
    const dbMock = (mod as any).db;
    dbMock.transaction = vi.fn(); // must NOT be called — the turn already exists
    dbMock.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve([
            { role: "user", content: "Hello!", turnId: "t1" },
            { role: "assistant", content: "Hi there!", turnId: "t1" },
          ])),
        })),
      })),
    }));

    const { processTurn } = await import("../services/chat/turn-pipeline.js");
    const result = await processTurn(validInput);

    expect(dbMock.transaction).not.toHaveBeenCalled();
    expect(mockGenerateReply).not.toHaveBeenCalled();
    expect(result.userMessage).toMatchObject({ content: "Hello!" });
    expect(result.aiMessage).toMatchObject({ content: "Hi there!" });
    expect(result.turnId).toBe("t1");
  });

  it("throws after max retries exhausted", async () => {
    const mod = await import("../db/src/index.js");
    const dbMock = (mod as any).db;
    dbMock.transaction = vi.fn(async () => {
      const err = new Error("duplicate key value violates unique constraint 'uq_turn_id_role'");
      (err as any).code = "23505";
      throw err;
    });

    const { processTurn } = await import("../services/chat/turn-pipeline.js");
    await expect(processTurn(validInput)).rejects.toThrow("Turn processing failed after max retries");
  });
});
