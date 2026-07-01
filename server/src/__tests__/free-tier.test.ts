import { describe, it, expect, vi, beforeEach } from "vitest";
import { FREE_DAILY_LIMIT } from "@aura/shared";

const mockDb = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        for: vi.fn().mockResolvedValue([{ count: 0 }]),
      })),
    })),
  })),
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  messagesTable: {},
}));

describe("checkFreeTierLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockForResult(count: number) {
    mockDb.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          for: vi.fn().mockResolvedValue([{ count }]),
        })),
      })),
    }));
  }

  it("allows when count is below limit", async () => {
    mockForResult(5);
    const { checkFreeTierLimit } = await import("../services/chat/free-tier.js");
    const result = await checkFreeTierLimit("user-1");
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(5);
    expect(result.limit).toBe(FREE_DAILY_LIMIT);
  });

  it("blocks when count equals limit", async () => {
    mockForResult(FREE_DAILY_LIMIT);
    const { checkFreeTierLimit } = await import("../services/chat/free-tier.js");
    const result = await checkFreeTierLimit("user-1");
    expect(result.allowed).toBe(false);
  });

  it("blocks when count exceeds limit", async () => {
    mockForResult(FREE_DAILY_LIMIT + 5);
    const { checkFreeTierLimit } = await import("../services/chat/free-tier.js");
    const result = await checkFreeTierLimit("user-1");
    expect(result.allowed).toBe(false);
    expect(result.used).toBe(FREE_DAILY_LIMIT + 5);
  });

  it("handles zero messages", async () => {
    mockForResult(0);
    const { checkFreeTierLimit } = await import("../services/chat/free-tier.js");
    const result = await checkFreeTierLimit("user-1");
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(0);
  });
});
