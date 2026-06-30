import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared spies/state must be created via vi.hoisted because vi.mock factories are
// hoisted above normal top-level declarations.
const { updateSetSpy, mockLLM, state, crisisFields } = vi.hoisted(() => ({
  updateSetSpy: vi.fn((_set: unknown) => ({ where: vi.fn() })),
  mockLLM: { generateReply: vi.fn() },
  // The worker may invoke consolidation for a job it has already claimed ("processing")
  // or a raw "pending" job; the crisis pre-check must fire for both.
  state: { status: "pending" as "pending" | "processing" },
  crisisFields: {
    id: "00000000-0000-0000-0000-0000000000c1",
    userId: "00000000-0000-0000-0000-0000000000c2",
    companionId: "00000000-0000-0000-0000-0000000000c3",
    // Trips ONLY the newly-broadened crisis pattern ("can't keep going"), not any of
    // the original phrases — so this asserts the regex broadening AND the safety skip.
    rawContent: "Honestly, I can't keep going anymore.",
    attempts: 0,
    createdAt: new Date(),
  },
}));

vi.mock("../db/src/index.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([{ ...crisisFields, status: state.status }])) })),
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

  it.each(["pending", "processing"] as const)(
    "skips crisis content (status=%s) without calling the LLM and records safetySkipped",
    async (status) => {
      state.status = status;

      await consolidateMemory(crisisFields.id);

      // Crisis content must never be sent to the model.
      expect(mockLLM.generateReply).not.toHaveBeenCalled();

      // The job is marked processed + safetySkipped for queryable safety auditing.
      expect(updateSetSpy).toHaveBeenCalledTimes(1);
      const setArg = updateSetSpy.mock.calls[0][0] as { status: string; safetySkipped: boolean };
      expect(setArg.status).toBe("processed");
      expect(setArg.safetySkipped).toBe(true);
    },
  );
});
