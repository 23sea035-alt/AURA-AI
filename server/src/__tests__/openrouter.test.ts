import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

describe("createOpenRouterProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns generated text on success", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: " OpenRouter response " } }],
    });

    const { createOpenRouterProvider } = await import("../services/llm/openrouter.js");
    const provider = createOpenRouterProvider("or-key");
    const result = await provider.generateReply({
      systemPrompt: "Be helpful",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result).toBe("OpenRouter response");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: "google/gemini-2.0-flash-001",
    }));
  });

  it("returns empty string when content is null", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const { createOpenRouterProvider } = await import("../services/llm/openrouter.js");
    const provider = createOpenRouterProvider("or-key");
    const result = await provider.generateReply({
      systemPrompt: "",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result).toBe("");
  });
});
