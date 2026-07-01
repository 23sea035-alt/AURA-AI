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

const mockDb = {
  transaction: mockTransaction,
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  messagesTable: {},
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
