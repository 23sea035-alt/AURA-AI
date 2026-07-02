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

describe("createGroqProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns generated text on success", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: " Groq response " } }],
    });

    const { createGroqProvider } = await import("../services/llm/groq.js");
    const provider = createGroqProvider("gsk-test");
    const result = await provider.generateReply({
      systemPrompt: "Be concise",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(result).toBe("Groq response");
  });

  it("throws on empty response", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "" } }],
    });

    const { createGroqProvider } = await import("../services/llm/groq.js");
    const provider = createGroqProvider("gsk-test");
    await expect(provider.generateReply({
      systemPrompt: "Be concise",
      messages: [{ role: "user", content: "Hi" }],
    })).rejects.toThrow("Empty model response");
  });

  it("throws when content is null", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });

    const { createGroqProvider } = await import("../services/llm/groq.js");
    const provider = createGroqProvider("gsk-test");
    await expect(provider.generateReply({
      systemPrompt: "",
      messages: [{ role: "user", content: "Hi" }],
    })).rejects.toThrow("Empty model response");
  });

  it("records groq.rate_limited on a final 429 and rethrows", async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error("rate limited"), { status: 429 }));
    const { resetMetrics, getMetrics } = await import("../lib/metrics.js");
    resetMetrics();

    const { createGroqProvider } = await import("../services/llm/groq.js");
    const provider = createGroqProvider("gsk-test");
    await expect(provider.generateReply({
      systemPrompt: "",
      messages: [{ role: "user", content: "Hi" }],
    })).rejects.toThrow("rate limited");

    expect(getMetrics()["groq.rate_limited"]).toBe(1);
  });

  it("does not record the metric on non-429 failures", async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error("server error"), { status: 500 }));
    const { resetMetrics, getMetrics } = await import("../lib/metrics.js");
    resetMetrics();

    const { createGroqProvider } = await import("../services/llm/groq.js");
    const provider = createGroqProvider("gsk-test");
    await expect(provider.generateReply({
      systemPrompt: "",
      messages: [{ role: "user", content: "Hi" }],
    })).rejects.toThrow("server error");

    expect(getMetrics()["groq.rate_limited"]).toBeUndefined();
  });

  it("records groq.rate_limited when a stream fails to open with a 429", async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error("rate limited"), { status: 429 }));
    const { resetMetrics, getMetrics } = await import("../lib/metrics.js");
    resetMetrics();

    const { createGroqProvider } = await import("../services/llm/groq.js");
    const provider = createGroqProvider("gsk-test");
    const drain = (async () => {
      for await (const _ of provider.generateReplyStream!({
        systemPrompt: "",
        messages: [{ role: "user", content: "Hi" }],
      })) { /* consume */ }
    })();
    await expect(drain).rejects.toThrow("rate limited");

    expect(getMetrics()["groq.rate_limited"]).toBe(1);
  });

  it("uses MODEL_GROQ env var when no model provided", async () => {
    vi.stubEnv("MODEL_GROQ", "mixtral-8x7b-32768");
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "OK" } }],
    });

    const { createGroqProvider } = await import("../services/llm/groq.js");
    const provider = createGroqProvider("gsk-test");
    await provider.generateReply({
      systemPrompt: "",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: "mixtral-8x7b-32768",
    }));
    vi.unstubAllEnvs();
  });
});
