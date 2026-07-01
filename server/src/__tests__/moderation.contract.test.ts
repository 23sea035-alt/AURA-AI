process.env.OPENAI_API_KEY = "sk-test-fake-but-long-enough-for-the-check-123";

import { describe, it, expect, vi } from "vitest";
import { MODERATION_INPUT_THRESHOLDS, MODERATION_OUTPUT_THRESHOLDS } from "@aura/shared";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn(() => ({ moderations: { create: mockCreate } })),
  OpenAI: vi.fn(() => ({ moderations: { create: mockCreate } })),
}));

function makeScores(overrides: Record<string, number>): Record<string, number> {
  const allKeys = new Set([
    ...Object.keys(MODERATION_INPUT_THRESHOLDS),
    ...Object.keys(MODERATION_OUTPUT_THRESHOLDS),
  ]);
  const scores: Record<string, number> = {};
  for (const key of allKeys) scores[key] = 0;
  return { ...scores, ...overrides };
}

function mockScores(scores: Record<string, number>) {
  mockCreate.mockResolvedValue({
    results: [{ categories: {}, category_scores: scores }],
  });
}

describe("Moderation thresholds — contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runL2Input", () => {
    it("does NOT flag when all scores are below input thresholds", async () => {
      mockScores(makeScores({ sexual: 0.5, "sexual/minors": 0.05 }));

      const { runL2Input } = await import("../services/moderation/openai-omni.js");
      const result = await runL2Input("benign text");

      expect(result.flagged).toBe(false);
      expect(result.categories).toHaveLength(0);
    });

    it("flags when a score exceeds its input threshold", async () => {
      mockScores(makeScores({ "sexual/minors": 0.15 }));

      const { runL2Input } = await import("../services/moderation/openai-omni.js");
      const result = await runL2Input("concerning");

      expect(result.flagged).toBe(true);
      expect(result.categories).toEqual(
        expect.arrayContaining([{ category: "sexual/minors", score: 0.15 }]),
      );
    });

    it("flags exactly at threshold boundary", async () => {
      mockScores(makeScores({ "sexual/minors": 0.1 }));

      const { runL2Input } = await import("../services/moderation/openai-omni.js");
      const result = await runL2Input("boundary");

      expect(result.flagged).toBe(true);
    });

    it("does not flag just below threshold", async () => {
      mockScores(makeScores({ sexual: 0.94 }));

      const { runL2Input } = await import("../services/moderation/openai-omni.js");
      const result = await runL2Input("romantic");

      expect(result.flagged).toBe(false);
    });

    it("returns flagged=true on API error (fail-closed)", async () => {
      mockCreate.mockRejectedValue(new Error("API down"));

      const { runL2Input } = await import("../services/moderation/openai-omni.js");
      const result = await runL2Input("any");

      expect(result.flagged).toBe(true);
      expect(result.error).toBeDefined();
    });
  });

  describe("runL3Output", () => {
    it("does NOT flag when all scores are below output thresholds", async () => {
      mockScores(makeScores({ violence: 0.2, "sexual/minors": 0.02 }));

      const { runL3Output } = await import("../services/moderation/openai-omni.js");
      const result = await runL3Output("safe reply");

      expect(result.flagged).toBe(false);
    });

    it("flags when a score exceeds its output threshold", async () => {
      mockScores(makeScores({ violence: 0.4 }));

      const { runL3Output } = await import("../services/moderation/openai-omni.js");
      const result = await runL3Output("violent");

      expect(result.flagged).toBe(true);
      expect(result.categories).toEqual(
        expect.arrayContaining([{ category: "violence", score: 0.4 }]),
      );
    });

    it("uses stricter output thresholds than input", async () => {
      mockScores(makeScores({ violence: 0.4 }));

      const { runL2Input, runL3Output } = await import("../services/moderation/openai-omni.js");
      const [inputResult, outputResult] = await Promise.all([
        runL2Input("borderline"),
        runL3Output("borderline"),
      ]);

      expect(inputResult.flagged).toBe(false);
      expect(outputResult.flagged).toBe(true);
    });

    it("returns flagged=true on API error (fail-closed)", async () => {
      mockCreate.mockRejectedValue(new Error("API down"));

      const { runL3Output } = await import("../services/moderation/openai-omni.js");
      const result = await runL3Output("any");

      expect(result.flagged).toBe(true);
      expect(result.error).toBeDefined();
    });
  });
});
