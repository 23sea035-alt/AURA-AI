import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGenerateReply = vi.fn();

vi.mock("../services/llm/groq.js", () => ({
  createGroqProvider: vi.fn(() => ({
    generateReply: mockGenerateReply,
  })),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  getModelForTask,
  getFallbackForTask,
  createTaskSpecificProvider,
  setModelOverride,
  resetModelOverrides,
} from "../services/llm/model-selector.js";

describe("model-selector", () => {
  beforeEach(() => {
    mockGenerateReply.mockReset();
    delete process.env.MODEL_GENERATE_REPLY;
    delete process.env.MODEL_MODERATE_INPUT;
    delete process.env.MODEL_MODERATE_OUTPUT;
    delete process.env.MODEL_CONSOLIDATE_MEMORY;
    delete process.env.MODEL_FALLBACK_GENERATE_REPLY;
    delete process.env.MODEL_FALLBACK_MODERATE_INPUT;
    delete process.env.MODEL_FALLBACK_MODERATE_OUTPUT;
    delete process.env.MODEL_FALLBACK_CONSOLIDATE_MEMORY;
    resetModelOverrides();
  });

  describe("getModelForTask", () => {
    it("returns default for generate-reply", () => {
      expect(getModelForTask("generate-reply")).toBe("llama-3.3-70b-versatile");
    });

    it("returns default for moderate-input", () => {
      expect(getModelForTask("moderate-input")).toBe(
        "meta-llama/llama-prompt-guard-2-86m",
      );
    });

    it("returns default for moderate-output", () => {
      expect(getModelForTask("moderate-output")).toBe(
        "openai/gpt-oss-safeguard-20b",
      );
    });

    it("returns default for consolidate-memory", () => {
      expect(getModelForTask("consolidate-memory")).toBe(
        "llama-3.1-8b-instant",
      );
    });

    it("respects MODEL_GENERATE_REPLY env var", () => {
      process.env.MODEL_GENERATE_REPLY = "env-model";
      expect(getModelForTask("generate-reply")).toBe("env-model");
    });

    it("override takes precedence over env var", () => {
      process.env.MODEL_GENERATE_REPLY = "env-model";
      setModelOverride("generate-reply", "override-model");
      expect(getModelForTask("generate-reply")).toBe("override-model");
    });
  });

  describe("getFallbackForTask", () => {
    it("returns default fallback for generate-reply", () => {
      expect(getFallbackForTask("generate-reply")).toBe(
        "llama-3.1-8b-instant",
      );
    });

    it("returns default fallback for moderate-input", () => {
      expect(getFallbackForTask("moderate-input")).toBe(
        "llama-3.3-70b-versatile",
      );
    });

    it("returns default fallback for moderate-output", () => {
      expect(getFallbackForTask("moderate-output")).toBe(
        "llama-3.3-70b-versatile",
      );
    });

    it("returns default fallback for consolidate-memory", () => {
      expect(getFallbackForTask("consolidate-memory")).toBe(
        "llama-3.3-70b-versatile",
      );
    });

    it("respects env var MODEL_FALLBACK_GENERATE_REPLY", () => {
      process.env.MODEL_FALLBACK_GENERATE_REPLY = "fallback-model";
      expect(getFallbackForTask("generate-reply")).toBe("fallback-model");
    });
  });

  describe("setModelOverride / resetModelOverrides", () => {
    it("overrides model for a task", () => {
      setModelOverride("generate-reply", "my-model");
      expect(getModelForTask("generate-reply")).toBe("my-model");
    });

    it("resetModelOverrides clears all overrides", () => {
      setModelOverride("generate-reply", "my-model");
      setModelOverride("moderate-input", "other-model");
      resetModelOverrides();
      expect(getModelForTask("generate-reply")).toBe("llama-3.3-70b-versatile");
      expect(getModelForTask("moderate-input")).toBe(
        "meta-llama/llama-prompt-guard-2-86m",
      );
    });
  });

  describe("createTaskSpecificProvider", () => {
    it("returns a provider with generateReply method", () => {
      const provider = createTaskSpecificProvider(
        "generate-reply",
        "test-key",
      );
      expect(provider).toHaveProperty("generateReply");
      expect(typeof provider.generateReply).toBe("function");
    });

    it("tries primary then fallback on failure", async () => {
      mockGenerateReply
        .mockRejectedValueOnce(new Error("primary failed"))
        .mockResolvedValueOnce("fallback response");

      const provider = createTaskSpecificProvider(
        "generate-reply",
        "test-key",
      );
      const result = await provider.generateReply({
        systemPrompt: "test",
        messages: [{ role: "user", content: "hi" }],
      });

      expect(result).toBe("fallback response");
      expect(mockGenerateReply).toHaveBeenCalledTimes(2);
    });

    it("throws when both primary and fallback fail", async () => {
      mockGenerateReply
        .mockRejectedValueOnce(new Error("primary failed"))
        .mockRejectedValueOnce(new Error("fallback failed"));

      const provider = createTaskSpecificProvider(
        "generate-reply",
        "test-key",
      );
      await expect(
        provider.generateReply({
          systemPrompt: "test",
          messages: [{ role: "user", content: "hi" }],
        }),
      ).rejects.toThrow("fallback failed");
    });
  });
});
