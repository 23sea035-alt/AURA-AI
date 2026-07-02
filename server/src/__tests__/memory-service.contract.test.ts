import { describe, it, expect, vi, beforeEach } from "vitest";

let returningResult: unknown[] = [{ id: "job-1" }];
let valuesShouldReject = false;

const mockValues = vi.fn(() => {
  if (valuesShouldReject) {
    return Promise.reject(new Error("db error"));
  }
  return { returning: vi.fn().mockResolvedValue(returningResult) };
});

const mockInsert = vi.fn(() => ({
  values: mockValues,
}));

const mockLimit = vi.fn().mockResolvedValue([]);
const mockWhere = vi.fn(() => ({ limit: mockLimit }));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));

const mockUpdateWhere = vi.fn().mockResolvedValue({ rowCount: 1 });
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const mockDb = {
  insert: mockInsert,
  select: mockSelect,
  update: mockUpdate,
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  memoriesTable: { id: "id", userId: "userId", companionId: "companionId", content: "content", category: "category", importance: "importance", keywords: "keywords", sourceMessageId: "sourceMessageId", createdAt: "createdAt", lastRecalledAt: "lastRecalledAt" },
  memoryJobsTable: { id: "id", userId: "userId", companionId: "companionId", rawContent: "rawContent" },
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("Memory service — contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returningResult = [{ id: "job-1" }];
    valuesShouldReject = false;
    mockLimit.mockResolvedValue([]);
  });

  describe("storeMemory", () => {
    it("inserts a memory record", async () => {
      const { storeMemory } = await import("../services/memory.js");
      await storeMemory("user-1", "companion-1", "likes hiking", "preference", 0.6, "msg-1");
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it("handles insert error gracefully", async () => {
      valuesShouldReject = true;
      const { storeMemory } = await import("../services/memory.js");
      await expect(storeMemory("user-1", "companion-1", "test", "general", 0.5)).resolves.toBeUndefined();
    });
  });

  describe("enqueueMemoryJob", () => {
    it("inserts a memory job and returns its id", async () => {
      const { enqueueMemoryJob } = await import("../services/memory.js");
      const jobId = await enqueueMemoryJob("user-1", "companion-1", "raw content");
      expect(jobId).toBe("job-1");
    });

    it("returns null on empty returning", async () => {
      returningResult = [];
      const { enqueueMemoryJob } = await import("../services/memory.js");
      const jobId = await enqueueMemoryJob("user-1", "companion-1", "raw");
      expect(jobId).toBeNull();
    });

    it("returns null on insert failure", async () => {
      valuesShouldReject = true;
      const { enqueueMemoryJob } = await import("../services/memory.js");
      const jobId = await enqueueMemoryJob("user-1", "companion-1", "raw");
      expect(jobId).toBeNull();
    });
  });

  describe("retrieveMemories", () => {
    it("returns empty array when no memories exist", async () => {
      const { retrieveMemories } = await import("../services/memory.js");
      const result = await retrieveMemories("user-1", "companion-1", "hiking");
      expect(result).toEqual([]);
    });

    it("returns memories sorted by relevance score", async () => {
      const memories = [
        { id: 1, userId: "u1", companionId: "c1", content: "likes hiking", category: "preference", importance: 0.6, keywords: ["hiking"], createdAt: new Date(Date.now() - 86400000), lastRecalledAt: null },
        { id: 2, userId: "u1", companionId: "c1", content: "name is Sam", category: "identity", importance: 0.9, keywords: ["name"], createdAt: new Date(Date.now() - 86400000), lastRecalledAt: null },
      ];
      mockLimit.mockResolvedValue(memories);

      const { retrieveMemories } = await import("../services/memory.js");
      const result = await retrieveMemories("u1", "c1", "hiking");
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe("preference");
    });

    it("returns empty array on db error", async () => {
      mockLimit.mockRejectedValueOnce(new Error("db error"));
      const { retrieveMemories } = await import("../services/memory.js");
      const result = await retrieveMemories("u1", "c1", "hiking");
      expect(result).toEqual([]);
    });
  });
});
