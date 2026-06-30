import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLLM = { generateReply: vi.fn() };

// Swappable result for the memory-selection query, plus a spy on the companions UPDATE .where().
let selectRows: Array<{ id: string; content: string; importance: number }> = [];
const mockUpdateWhere = vi.fn();
const mockUpdateSet = vi.fn((_values: Record<string, unknown>) => ({ where: mockUpdateWhere }));

vi.mock("../db/src/index.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve(selectRows)) })),
        })),
      })),
    })),
    update: vi.fn(() => ({ set: mockUpdateSet })),
  },
  memoriesTable: {},
  companionsTable: {},
}));

vi.mock("../services/llm/index.js", () => ({ getLLMProvider: vi.fn(() => mockLLM) }));

const { sanitizeQuestion, selectRememberMemory, generateRememberQuestion, refreshRemember } =
  await import("../services/memory/remember.js");

describe("Remember: sanitizeQuestion (pure)", () => {
  it("keeps only the first line", () => {
    expect(sanitizeQuestion("How's the new job?\n\nLet me know!")).toBe("How's the new job?");
  });

  it("strips surrounding quotes", () => {
    expect(sanitizeQuestion('"How are you feeling today?"')).toBe("How are you feeling today?");
  });

  it("caps runaway length to 120 chars", () => {
    const long = "a".repeat(300);
    expect(sanitizeQuestion(long).length).toBe(120);
  });
});

describe("Remember: selectRememberMemory", () => {
  beforeEach(() => { vi.clearAllMocks(); selectRows = []; });

  it("returns the top memory when it clears the importance floor", async () => {
    selectRows = [{ id: "m1", content: "started a new job", importance: 0.8 }];
    const mem = await selectRememberMemory("u1", "c1");
    expect(mem?.id).toBe("m1");
  });

  it("returns null when the top memory is below the importance floor", async () => {
    selectRows = [{ id: "m2", content: "ate cereal", importance: 0.3 }];
    expect(await selectRememberMemory("u1", "c1")).toBeNull();
  });

  it("returns null when there are no memories", async () => {
    selectRows = [];
    expect(await selectRememberMemory("u1", "c1")).toBeNull();
  });
});

describe("Remember: generateRememberQuestion", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("sanitizes the LLM output", async () => {
    mockLLM.generateReply.mockResolvedValue('"How is the new job going?"\nextra');
    expect(await generateRememberQuestion("started a new job")).toBe("How is the new job going?");
  });
});

describe("Remember: refreshRemember", () => {
  beforeEach(() => { vi.clearAllMocks(); selectRows = []; });

  it("upserts the companion cache when a memory qualifies", async () => {
    selectRows = [{ id: "m1", content: "started a new job", importance: 0.8 }];
    mockLLM.generateReply.mockResolvedValue("How's the new job going?");

    await refreshRemember("u1", "c1");

    expect(mockUpdateSet).toHaveBeenCalledTimes(1);
    const setArg = mockUpdateSet.mock.calls[0][0];
    expect(setArg.rememberMemoryId).toBe("m1");
    expect(setArg.rememberQuestion).toBe("How's the new job going?");
    expect(setArg.rememberGeneratedAt).toBeInstanceOf(Date);
    expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
  });

  it("does nothing when no memory clears the floor", async () => {
    selectRows = [{ id: "m2", content: "trivia", importance: 0.2 }];
    await refreshRemember("u1", "c1");
    expect(mockLLM.generateReply).not.toHaveBeenCalled();
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it("skips the write when the LLM returns an empty question", async () => {
    selectRows = [{ id: "m1", content: "started a new job", importance: 0.8 }];
    mockLLM.generateReply.mockResolvedValue("   ");
    await refreshRemember("u1", "c1");
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });
});
