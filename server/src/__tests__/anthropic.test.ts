import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createAnthropicProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a provider with a generateReply method", async () => {
    const { createAnthropicProvider } = await import("../services/llm/anthropic.js");
    const provider = createAnthropicProvider("sk-test");
    expect(provider).toHaveProperty("generateReply");
    expect(typeof provider.generateReply).toBe("function");
  });

  it("successfully generates a reply", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "Hello from Claude" }] }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", mockFetch);

    const { createAnthropicProvider } = await import("../services/llm/anthropic.js");
    const provider = createAnthropicProvider("sk-test");
    const result = await provider.generateReply({
      systemPrompt: "Be helpful",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(result).toBe("Hello from Claude");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-api-key": "sk-test" }),
      }),
    );
  });

  it("handles API errors", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });
    vi.stubGlobal("fetch", mockFetch);

    const { createAnthropicProvider } = await import("../services/llm/anthropic.js");
    const provider = createAnthropicProvider("sk-bad");
    await expect(provider.generateReply({
      systemPrompt: "Be helpful",
      messages: [{ role: "user", content: "Hi" }],
    })).rejects.toThrow("Anthropic API error 401");
  });

  it("returns empty string when no text content found", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "thinking", text: "..." }] }),
      text: async () => "",
    });
    vi.stubGlobal("fetch", mockFetch);

    const { createAnthropicProvider } = await import("../services/llm/anthropic.js");
    const provider = createAnthropicProvider("sk-test");
    const result = await provider.generateReply({
      systemPrompt: "",
      messages: [{ role: "user", content: "Hi" }],
    });
    expect(result).toBe("");
  });
});
