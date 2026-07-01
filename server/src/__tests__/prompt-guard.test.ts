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

const mockGenerateReply = vi.fn();
vi.mock("../services/llm/index.js", () => ({
  getLLMProvider: vi.fn(() => ({
    generateReply: mockGenerateReply,
  })),
}));

import { runL1 } from "../services/moderation/prompt-guard.js";

describe("runL1", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockGenerateReply.mockReset();
    delete process.env.GROQ_API_KEY;
  });

  describe("via prompt-guard model (GROQ_API_KEY set)", () => {
    beforeEach(() => {
      process.env.GROQ_API_KEY = "test-key";
    });

    it("returns pass when probability is below escalate threshold", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "0.1" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 0.1, action: "pass" });
    });

    it("returns escalate when probability is >= escalate threshold", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "0.7" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 0.7, action: "escalate" });
    });

    it("returns escalate when probability is very high", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "0.95" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 0.95, action: "escalate" });
    });

    it("returns escalate with error on unparseable output", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "garbage output" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({
        injectionProb: 0.5,
        action: "escalate",
        error: "L1 unparseable output — escalating",
      });
    });

    it("parses JSON malicious_probability from model output", async () => {
      mockCreate.mockResolvedValue({
        choices: [
          { message: { content: '{"malicious_probability": 0.85}' } },
        ],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 0.85, action: "escalate" });
    });

    it("uses keyword fallback for benign text", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "benign" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 0, action: "pass" });
    });

    it("uses keyword fallback for 'b'", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "b" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 0, action: "pass" });
    });

    it("uses keyword fallback for injection text", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "injection attempt" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 1, action: "escalate" });
    });

    it("uses keyword fallback for 'j'", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "j" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 1, action: "escalate" });
    });

    it("uses keyword fallback for 'malicious'", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "malicious" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 1, action: "escalate" });
    });

    it("uses keyword fallback for 'malicious_content'", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "malicious_content" } }],
      });
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 1, action: "escalate" });
    });
  });

  describe("via fallback provider (no GROQ_API_KEY)", () => {
    it("falls back to passed provider when prompt-guard returns null", async () => {
      const provider = {
        generateReply: vi.fn().mockResolvedValue("0.2"),
      };
      const result = await runL1("hello", provider);
      expect(result).toEqual({ injectionProb: 0.2, action: "pass" });
    });

    it("falls back to getLLMProvider when no provider argument given", async () => {
      mockGenerateReply.mockResolvedValue("0.3");
      const result = await runL1("hello");
      expect(result).toEqual({ injectionProb: 0.3, action: "pass" });
    });

    it("returns block when both models unavailable", async () => {
      mockGenerateReply.mockRejectedValue(new Error("no provider"));
      const result = await runL1("hello");
      expect(result).toEqual({
        injectionProb: 1,
        action: "block",
        error: "L1 — all models unavailable",
      });
    });
  });

  describe("via fallback provider (GROQ_API_KEY set but prompt-guard fails)", () => {
    beforeEach(() => {
      process.env.GROQ_API_KEY = "test-key";
    });

    it("falls through when prompt-guard rejects", async () => {
      mockCreate.mockRejectedValue(new Error("network error"));
      // getLLMProvider fallback also fails
      mockGenerateReply.mockRejectedValue(new Error("no fallback"));
      const result = await runL1("hello");
      expect(result).toEqual({
        injectionProb: 1,
        action: "block",
        error: "L1 — all models unavailable",
      });
    });
  });
});
