import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared spies/state must be created via vi.hoisted because vi.mock factories are
// hoisted above normal top-level declarations.
const { updateSetSpy, mockLLM, crisisJob } = vi.hoisted(() => ({
  updateSetSpy: vi.fn((_set: unknown) => ({ where: vi.fn() })),
  mockLLM: { generateReply: vi.fn() },
  crisisJob: {
    id: "00000000-0000-0000-0000-0000000000c1",
    userId: "00000000-0000-0000-0000-0000000000c2",
    companionId: "00000000-0000-0000-0000-0000000000c3",
    // Trips ONLY the newly-broadened crisis pattern ("can't keep going"), not any of
    // the original phrases — so this asserts the regex broadening AND the safety skip.
    rawContent: "Honestly, I can't keep going anymore.",
    status: "pending",
    attempts: 0,
    createdAt: new Date(),
  },
}));

vi.mock("../db/src/index.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([crisisJob])) })),
      })),
    })),
    update: vi.fn(() => ({ set: updateSetSpy })),
    insert: vi.fn(() => ({ values: vi.fn() })),
  },
  memoryJobsTable: {},
  memoriesTable: {},
}));

vi.mock("../services/llm/index.js", () => ({
  getLLMProvider: vi.fn(() => mockLLM),
}));

const { consolidateMemory } = await import("../services/memory/consolidation.js");

describe("Consolidation: crisis safety-skip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips crisis content without calling the LLM and records safetySkipped", async () => {
    await consolidateMemory(crisisJob.id);

    // Crisis content must never be sent to the model.
    expect(mockLLM.generateReply).not.toHaveBeenCalled();

    // The job is marked processed + safetySkipped for queryable safety auditing.
    expect(updateSetSpy).toHaveBeenCalledTimes(1);
    const setArg = updateSetSpy.mock.calls[0][0] as { status: string; safetySkipped: boolean };
    expect(setArg.status).toBe("processed");
    expect(setArg.safetySkipped).toBe(true);
  });
});
