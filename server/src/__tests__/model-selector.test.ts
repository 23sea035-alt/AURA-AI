import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

vi.mock("@aura/shared", () => ({
  GENERATION_TEMPERATURE: 1.0,
  GENERATION_MAX_TOKENS: 1024,
}));

const mockGetEnv = vi.fn();
vi.mock("../config/env.js", () => ({
  getEnv: mockGetEnv,
}));

describe("model-selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetEnv.mockReturnValue({
      OPENROUTER_API_KEY: "",
      ANTHROPIC_API_KEY: "",
      GROQ_API_KEY: "",
      NVIDIA_API_KEY: "nv-default",
    });
  });

  describe("getModelForTask", () => {
    it("returns default model for generate-reply", async () => {
      const { getModelForTask } = await import("../services/llm/model-selector.js");
      const model = getModelForTask("generate-reply");
      expect(model).toBe("llama-3.3-70b-versatile");
    });

    it("returns override when set", async () => {
      const { getModelForTask, setModelOverride, resetModelOverrides } = await import("../services/llm/model-selector.js");
      setModelOverride("generate-reply", "custom-model");
      const model = getModelForTask("generate-reply");
      expect(model).toBe("custom-model");
      resetModelOverrides();
    });

    it("returns different defaults for different tasks", async () => {
      const { getModelForTask } = await import("../services/llm/model-selector.js");
      expect(getModelForTask("moderate-input")).toContain("prompt-guard");
      expect(getModelForTask("moderate-output")).toContain("safeguard");
      expect(getModelForTask("consolidate-memory")).toContain("8b");
    });
  });

  describe("getFallbackForTask", () => {
    it("returns fallback model for each task", async () => {
      const { getFallbackForTask } = await import("../services/llm/model-selector.js");
      expect(getFallbackForTask("generate-reply")).toBe("llama-3.1-8b-instant");
      expect(getFallbackForTask("consolidate-memory")).toBe("llama-3.3-70b-versatile");
    });
  });

  describe("setModelOverride / resetModelOverrides", () => {
    it("resetModelOverrides clears overrides", async () => {
      const { getModelForTask, setModelOverride, resetModelOverrides } = await import("../services/llm/model-selector.js");
      setModelOverride("generate-reply", "temp");
      resetModelOverrides();
      expect(getModelForTask("generate-reply")).toBe("llama-3.3-70b-versatile");
    });
  });

  describe("createTaskSpecificProvider", () => {
    it("uses NVIDIA when no other API keys are set", async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: " nvidia " } }] });

      const { createTaskSpecificProvider } = await import("../services/llm/model-selector.js");
      const provider = createTaskSpecificProvider("generate-reply");
      const result = await provider.generateReply({
        systemPrompt: "",
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(result).toBe("nvidia");
    });

    it("falls back to fallback model when primary fails", async () => {
      mockCreate
        .mockRejectedValueOnce(new Error("Primary failed"))
        .mockResolvedValueOnce({ choices: [{ message: { content: " fallback " } }] });

      const { createTaskSpecificProvider } = await import("../services/llm/model-selector.js");
      const provider = createTaskSpecificProvider("generate-reply");
      const result = await provider.generateReply({
        systemPrompt: "",
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(result).toBe("fallback");
    });

    it("throws when both primary and fallback fail", async () => {
      mockCreate
        .mockRejectedValueOnce(new Error("Primary down"))
        .mockRejectedValueOnce(new Error("Fallback down"));

      const { createTaskSpecificProvider } = await import("../services/llm/model-selector.js");
      const provider = createTaskSpecificProvider("generate-reply");
      await expect(provider.generateReply({
        systemPrompt: "",
        messages: [{ role: "user", content: "Hi" }],
      })).rejects.toThrow("Fallback down");
    });

    it("uses Groq when GROQ_API_KEY is set", async () => {
      mockGetEnv.mockReturnValue({
        OPENROUTER_API_KEY: "",
        ANTHROPIC_API_KEY: "",
        GROQ_API_KEY: "gsk-groq",
        NVIDIA_API_KEY: "nv-default",
      });
      mockCreate.mockResolvedValue({ choices: [{ message: { content: " groq reply " } }] });

      const { createTaskSpecificProvider } = await import("../services/llm/model-selector.js");
      const provider = createTaskSpecificProvider("generate-reply");
      const result = await provider.generateReply({
        systemPrompt: "",
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(result).toBe("groq reply");
    });

    it("uses Anthropic when ANTHROPIC_API_KEY is set", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ type: "text", text: "claude reply" }] }),
        text: async () => "",
      });
      vi.stubGlobal("fetch", mockFetch);

      mockGetEnv.mockReturnValue({
        OPENROUTER_API_KEY: "",
        ANTHROPIC_API_KEY: "sk-ant",
        GROQ_API_KEY: "",
        NVIDIA_API_KEY: "",
      });

      const { createTaskSpecificProvider } = await import("../services/llm/model-selector.js");
      const provider = createTaskSpecificProvider("generate-reply");
      const result = await provider.generateReply({
        systemPrompt: "",
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(result).toBe("claude reply");
      vi.unstubAllGlobals();
    });

    it("uses OpenRouter when OPENROUTER_API_KEY is set", async () => {
      mockGetEnv.mockReturnValue({
        OPENROUTER_API_KEY: "or-key",
        ANTHROPIC_API_KEY: "",
        GROQ_API_KEY: "",
        NVIDIA_API_KEY: "",
      });
      mockCreate.mockResolvedValue({ choices: [{ message: { content: " openrouter " } }] });

      const { createTaskSpecificProvider } = await import("../services/llm/model-selector.js");
      const provider = createTaskSpecificProvider("generate-reply");
      const result = await provider.generateReply({
        systemPrompt: "",
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(result).toBe("openrouter");
    });
  });
});
