import { describe, it, expect } from "vitest";

describe("LLMProvider singleton", () => {
  it("throws when no provider is set", async () => {
    const { getLLMProvider } = await import("../services/llm/index.js");
    expect(getLLMProvider).toThrow("LLM provider not configured");
  });

  it("returns a provider after setLLMProvider is called", async () => {
    const { setLLMProvider, getLLMProvider } = await import("../services/llm/index.js");
    const mockProvider = { generateReply: async () => "hi" };
    setLLMProvider(mockProvider);
    expect(getLLMProvider()).toBe(mockProvider);
  });
});
