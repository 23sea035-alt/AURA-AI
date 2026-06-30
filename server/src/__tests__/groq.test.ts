import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("openai", () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  })),
}));

import { createGroqProvider } from "../services/llm/groq.js";

describe("createGroqProvider", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("returns an LLMProvider with generateReply method", () => {
    const provider = createGroqProvider("test-key");
    expect(provider).toHaveProperty("generateReply");
    expect(typeof provider.generateReply).toBe("function");
  });

  it("generateReply returns trimmed content from API", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "  Hello world  " } }],
    });
    const provider = createGroqProvider("test-key");
    const result = await provider.generateReply({
      systemPrompt: "test",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(result).toBe("Hello world");
  });

  it("throws on empty model response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "   " } }],
    });
    const provider = createGroqProvider("test-key");
    await expect(
      provider.generateReply({
        systemPrompt: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("Empty model response");
  });

  it("throws on null/undefined choices", async () => {
    mockCreate.mockResolvedValue({
      choices: [],
    });
    const provider = createGroqProvider("test-key");
    await expect(
      provider.generateReply({
        systemPrompt: "test",
        messages: [{ role: "user", content: "hi" }],
      }),
    ).rejects.toThrow("Empty model response");
  });

  it("uses default model when none specified", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });
    const provider = createGroqProvider("test-key");
    await provider.generateReply({
      systemPrompt: "test",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "llama-3.1-8b-instant" }),
    );
  });

  it("uses custom model when specified", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "ok" } }],
    });
    const provider = createGroqProvider("test-key", "custom-model");
    await provider.generateReply({
      systemPrompt: "test",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "custom-model" }),
    );
  });
});
