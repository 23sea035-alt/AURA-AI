import { describe, it, expect, vi } from "vitest";

const mockReturning = vi.fn();
const mockInsertValuesTx = vi.fn(() => ({ returning: mockReturning }));
const mockTxInsert = vi.fn(() => ({ values: mockInsertValuesTx }));
const mockTxUpdateWhere = vi.fn();
const mockTxUpdateSet = vi.fn(() => ({ where: mockTxUpdateWhere }));
const mockTxUpdate = vi.fn(() => ({ set: mockTxUpdateSet }));
const mockTransaction = vi.fn(async (cb: (t: unknown) => Promise<unknown>) => {
  const tx = { insert: mockTxInsert, update: mockTxUpdate };
  return await cb(tx);
});

const mockOrderBy = vi.fn();
const mockSelectWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

const mockDb = {
  transaction: mockTransaction,
  select: mockSelect,
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  messagesTable: { userId: "user_id", companionId: "companion_id", turnId: "turn_id", createdAt: "created_at" },
  companionsTable: {},
}));

describe("persistMessages", () => {
  it("inserts user and ai messages in a transaction", async () => {
    mockReturning
      .mockResolvedValueOnce([{ id: "um1", role: "user", content: "Hello!" }])
      .mockResolvedValueOnce([{ id: "am1", role: "assistant", content: "Hi!" }]);
    mockTxUpdateWhere.mockResolvedValue(undefined);

    const { persistMessages } = await import("../services/chat/persistence.js");
    const result = await persistMessages("u1", "c1", "t1", "Hello!", "Hi!", 6);

    expect(mockTransaction).toHaveBeenCalled();
    expect(mockTxInsert).toHaveBeenCalledTimes(2);
    expect(mockReturning).toHaveBeenCalledTimes(2);
    expect(mockTxUpdate).toHaveBeenCalled();
    expect(mockTxUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
      lastMessage: "Hello!",
      messageCount: 6,
    }));
    expect(result).toEqual({ userMessage: { id: "um1", role: "user", content: "Hello!" }, aiMessage: { id: "am1", role: "assistant", content: "Hi!" } });
  });

  it("truncates lastMessage to 80 chars", async () => {
    mockReturning
      .mockResolvedValueOnce([{ id: "um2", role: "user" }])
      .mockResolvedValueOnce([{ id: "am2", role: "assistant" }]);
    mockTxUpdateWhere.mockResolvedValue(undefined);

    const { persistMessages } = await import("../services/chat/persistence.js");
    const longMsg = "A".repeat(100);
    await persistMessages("u2", "c2", "t2", longMsg, "Reply", 1);

    expect(mockTxUpdateSet).toHaveBeenCalledWith(expect.objectContaining({
      lastMessage: "A".repeat(80),
    }));
  });

  it("omits messageCount when not provided", async () => {
    mockReturning
      .mockResolvedValueOnce([{ id: "um3", role: "user" }])
      .mockResolvedValueOnce([{ id: "am3", role: "assistant" }]);
    mockTxUpdateWhere.mockResolvedValue(undefined);

    const { persistMessages } = await import("../services/chat/persistence.js");
    await persistMessages("u3", "c3", "t3", "Hi", "Reply");

    expect(mockTxUpdateSet).toHaveBeenCalledWith(expect.not.objectContaining({
      messageCount: expect.anything(),
    }));
  });
});

describe("fetchExistingTurn", () => {
  it("returns null when no rows exist for the turnId", async () => {
    mockOrderBy.mockResolvedValueOnce([]);
    const { fetchExistingTurn } = await import("../services/chat/persistence.js");
    expect(await fetchExistingTurn("u1", "c1", "t1")).toBeNull();
  });

  it("returns the user + assistant messages when the turn exists", async () => {
    mockOrderBy.mockResolvedValueOnce([
      { id: "um", role: "user" },
      { id: "am", role: "assistant" },
    ]);
    const { fetchExistingTurn } = await import("../services/chat/persistence.js");
    expect(await fetchExistingTurn("u1", "c1", "t1")).toEqual({
      userMessage: { id: "um", role: "user" },
      aiMessage: { id: "am", role: "assistant" },
    });
  });

  it("returns null aiMessage when only the user message is present", async () => {
    mockOrderBy.mockResolvedValueOnce([{ id: "um", role: "user" }]);
    const { fetchExistingTurn } = await import("../services/chat/persistence.js");
    expect(await fetchExistingTurn("u1", "c1", "t1")).toEqual({
      userMessage: { id: "um", role: "user" },
      aiMessage: null,
    });
  });
});

describe("isTurnUniqueViolation", () => {
  it("detects unique / duplicate constraint errors", async () => {
    const { isTurnUniqueViolation } = await import("../services/chat/persistence.js");
    expect(isTurnUniqueViolation(new Error("duplicate key value violates unique constraint"))).toBe(true);
    expect(isTurnUniqueViolation(new Error("uq_turn_id_role"))).toBe(true);
    expect(isTurnUniqueViolation(new Error("connection reset"))).toBe(false);
    expect(isTurnUniqueViolation("not an error")).toBe(false);
  });
});
