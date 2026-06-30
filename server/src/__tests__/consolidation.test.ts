import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractKeywords, jaccardSimilarity } from "../services/memory/keywords.js";

// Mock DB to return a valid pending job for consolidateMemory lookup
const mockJob = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "00000000-0000-0000-0000-000000000002",
  companionId: "00000000-0000-0000-0000-000000000003",
  rawContent: "Big news — I started a new job at Spotify on Monday.",
  status: "pending" as const,
  createdAt: new Date(),
};

const mockLLM = { generateReply: vi.fn() };

vi.mock("../db/src/index.js", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: vi.fn(), onConflictDoNothing: vi.fn() })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([mockJob])),
          // refreshRemember selects the top memory via where().orderBy().limit(); resolve to none so
          // the (separately tested) remember path is a harmless no-op inside consolidation tests.
          orderBy: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([])) })),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
  memoryJobsTable: {},
  memoriesTable: {},
  companionsTable: {},
}));

vi.mock("../services/llm/index.js", () => ({
  getLLMProvider: vi.fn(() => mockLLM),
}));

const { consolidateMemory } = await import("../services/memory/consolidation.js");

describe("Memory: keyword extraction (pure function)", () => {
  it("extracts meaningful keywords from text", () => {
    const keywords = extractKeywords("loves hiking in the mountains on weekends");
    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords).toContain("hiking");
  });

  it("returns empty array for very short text", () => {
    const keywords = extractKeywords("ok");
    expect(keywords).toEqual([]);
  });

  it("removes common stop words", () => {
    const keywords = extractKeywords("the a an in on at for to is");
    expect(keywords.length).toBe(0);
  });

  it("cleans punctuation from tokens", () => {
    const keywords = extractKeywords("can't wait for the weekend!");
    expect(keywords).toContain("can't");
  });

  it("produces a stable set (no duplicates)", () => {
    const keywords = extractKeywords("dog dog dog cat");
    expect(keywords.filter(k => k === "dog").length).toBe(1);
  });
});

describe("Memory: Jaccard similarity", () => {
  it("returns 1 for identical sets", () => {
    const a = new Set(["a", "b", "c"]);
    expect(jaccardSimilarity(a, a)).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    const a = new Set(["a", "b"]);
    const b = new Set(["c", "d"]);
    expect(jaccardSimilarity(a, b)).toBe(0);
  });

  it("returns correct ratio for overlapping sets", () => {
    const a = new Set(["a", "b", "c"]);
    const b = new Set(["b", "c", "d"]);
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });
});

describe("Consolidation: decision logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls LLM with valid job", async () => {
    const validResponse = JSON.stringify([
      { action: "ADD", memoryId: null, content: "works at Spotify", category: "work", importance: 0.7, rationale: "New durable fact" },
    ]);
    mockLLM.generateReply.mockResolvedValue(validResponse);

    await consolidateMemory(mockJob.id);

    expect(mockLLM.generateReply).toHaveBeenCalledTimes(1);
    const callArg = mockLLM.generateReply.mock.calls[0][0];
    expect(callArg.systemPrompt).toContain("memory consolidation");
  });

  it("handles NONE decision", async () => {
    mockLLM.generateReply.mockResolvedValue(JSON.stringify([
      { action: "NONE", memoryId: null, content: "", category: "general", importance: 0, rationale: "Ephemeral" },
    ]));

    await consolidateMemory(mockJob.id);

    expect(mockLLM.generateReply).toHaveBeenCalled();
  });

  it("falls back on invalid JSON", async () => {
    mockLLM.generateReply.mockResolvedValue("invalid json");

    await consolidateMemory(mockJob.id);

    expect(mockLLM.generateReply).toHaveBeenCalled();
  });
});
