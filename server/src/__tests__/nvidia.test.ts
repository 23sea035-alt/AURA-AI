import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();
vi.mock("openai", () => ({
  default: vi.fn(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

describe("createNvidiaProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns generated text on success", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: " NVIDIA response " } }],
    });

    const { createNvidiaProvider } = await import("../services/llm/nvidia.js");
    const provider = createNvidiaProvider("nv-key");
    const result = await provider.generateReply({
      systemPrompt: "Be concise",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result).toBe("NVIDIA response");
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: "meta/llama-3.2-3b-instruct",
      temperature: 1.0,
    }));
  });

  it("returns empty string when content is null", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const { createNvidiaProvider } = await import("../services/llm/nvidia.js");
    const provider = createNvidiaProvider("nv-key", "custom-model");
    const result = await provider.generateReply({
      systemPrompt: "",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result).toBe("");
  });

  it("includes system prompt when provided", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "OK" } }],
    });

    const { createNvidiaProvider } = await import("../services/llm/nvidia.js");
    const provider = createNvidiaProvider("nv-key");
    await provider.generateReply({
      systemPrompt: "System msg",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([{ role: "system", content: "System msg" }]),
    }));
  });
});
