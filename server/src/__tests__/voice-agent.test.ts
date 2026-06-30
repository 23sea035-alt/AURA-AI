import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockProcessTurn } = vi.hoisted(() => ({
  mockProcessTurn: vi.fn(),
}));

vi.mock("@livekit/agents", () => {
  class MockVoiceAgent {
    options: any;
    constructor(options: any) {
      this.options = options;
    }
  }
  return {
    voice: { Agent: MockVoiceAgent },
    llm: {},
    FlushSentinel: Symbol("FlushSentinel"),
  };
});

vi.mock("../services/chat/turn-pipeline.js", () => ({
  processTurn: mockProcessTurn,
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { AuraVoiceAgent } from "../services/voice/agent.js";
import { FlushSentinel } from "@livekit/agents";

describe("AuraVoiceAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("sets userId and companionId", () => {
      const agent = new AuraVoiceAgent({
        userId: "user-123",
        companionId: "comp-456",
        instructions: "Be helpful",
      });
      expect(agent.userId).toBe("user-123");
      expect(agent.companionId).toBe("comp-456");
    });

    it("passes all options through to parent constructor", () => {
      const agent = new AuraVoiceAgent({
        userId: "u1",
        companionId: "c1",
        instructions: "Be nice",
        id: "custom-id",
        stt: "stt-config",
        vad: "vad-config",
      });
      expect((agent as any).options).toMatchObject({
        userId: "u1",
        companionId: "c1",
        instructions: "Be nice",
        id: "custom-id",
        stt: "stt-config",
        vad: "vad-config",
      });
    });
  });

  describe("llmNode", () => {
    it("returns null when chatCtx has no items", async () => {
      const agent = new AuraVoiceAgent({
        userId: "user-123",
        companionId: "comp-456",
        instructions: "Be helpful",
      });
      const result = await agent.llmNode(
        { items: [] } as any,
        {} as any,
        {},
      );
      expect(result).toBeNull();
    });

    it("returns null when chatCtx has no user messages", async () => {
      const agent = new AuraVoiceAgent({
        userId: "user-123",
        companionId: "comp-456",
        instructions: "Be helpful",
      });
      const result = await agent.llmNode(
        {
          items: [
            { type: "message", role: "assistant", textContent: "Hello" },
            { type: "system", textContent: "System prompt" },
          ],
        } as any,
        {} as any,
        {},
      );
      expect(result).toBeNull();
    });

    it("returns null when last user message has no textContent", async () => {
      const agent = new AuraVoiceAgent({
        userId: "user-123",
        companionId: "comp-456",
        instructions: "Be helpful",
      });
      const result = await agent.llmNode(
        { items: [{ type: "message", role: "user", textContent: "" }] } as any,
        {} as any,
        {},
      );
      expect(result).toBeNull();
    });

    it("returns null when processTurn returns an error", async () => {
      mockProcessTurn.mockResolvedValueOnce({ error: "Something went wrong" });

      const agent = new AuraVoiceAgent({
        userId: "user-123",
        companionId: "comp-456",
        instructions: "Be helpful",
      });
      const result = await agent.llmNode(
        { items: [{ type: "message", role: "user", textContent: "Hello" }] } as any,
        {} as any,
        {},
      );
      expect(result).toBeNull();
    });

    it("returns null when processTurn returns no aiMessage", async () => {
      mockProcessTurn.mockResolvedValueOnce({
        userMessage: { content: "Hello" },
        aiMessage: null,
      });

      const agent = new AuraVoiceAgent({
        userId: "user-123",
        companionId: "comp-456",
        instructions: "Be helpful",
      });
      const result = await agent.llmNode(
        { items: [{ type: "message", role: "user", textContent: "Hello" }] } as any,
        {} as any,
        {},
      );
      expect(result).toBeNull();
    });

    it("returns a ReadableStream with ChatChunk and FlushSentinel on success", async () => {
      mockProcessTurn.mockResolvedValueOnce({
        aiMessage: { content: "Hi there!" },
        turnId: "turn-1",
      });

      const agent = new AuraVoiceAgent({
        userId: "user-123",
        companionId: "comp-456",
        instructions: "Be helpful",
      });
      const stream = await agent.llmNode(
        { items: [{ type: "message", role: "user", textContent: "Hello" }] } as any,
        {} as any,
        {},
      );
      expect(stream).toBeInstanceOf(ReadableStream);

      const reader = (stream as ReadableStream).getReader();
      const chunks: any[] = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0]).toHaveProperty("id");
      expect(chunks[0].delta).toEqual({
        role: "assistant",
        content: "Hi there!",
      });
      expect(chunks[1]).toBe(FlushSentinel);
    });

    it("passes userId, companionId, and content to processTurn", async () => {
      mockProcessTurn.mockResolvedValueOnce({
        aiMessage: { content: "Hi" },
        turnId: "turn-1",
      });

      const agent = new AuraVoiceAgent({
        userId: "user-xyz",
        companionId: "comp-abc",
        instructions: "Be helpful",
      });
      await agent.llmNode(
        { items: [{ type: "message", role: "user", textContent: "Hello world" }] } as any,
        {} as any,
        {},
      );

      expect(mockProcessTurn).toHaveBeenCalledWith({
        userId: "user-xyz",
        companionId: "comp-abc",
        content: "Hello world",
      });
    });

    it("uses the last user message from chat context", async () => {
      mockProcessTurn.mockResolvedValueOnce({
        aiMessage: { content: "Last reply" },
        turnId: "turn-1",
      });

      const agent = new AuraVoiceAgent({
        userId: "user-1",
        companionId: "comp-1",
        instructions: "Be helpful",
      });
      await agent.llmNode(
        {
          items: [
            { type: "message", role: "assistant", textContent: "How can I help?" },
            { type: "message", role: "user", textContent: "First message" },
            { type: "message", role: "assistant", textContent: "Okay..." },
            { type: "message", role: "user", textContent: "Last message" },
          ],
        } as any,
        {} as any,
        {},
      );

      expect(mockProcessTurn).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Last message" }),
      );
    });

    it("trims whitespace from user message content", async () => {
      mockProcessTurn.mockResolvedValueOnce({
        aiMessage: { content: "Reply" },
        turnId: "turn-1",
      });

      const agent = new AuraVoiceAgent({
        userId: "user-1",
        companionId: "comp-1",
        instructions: "Be helpful",
      });
      await agent.llmNode(
        { items: [{ type: "message", role: "user", textContent: "  Hello   " }] } as any,
        {} as any,
        {},
      );

      expect(mockProcessTurn).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Hello" }),
      );
    });

    it("filters non-message items and only uses user messages", async () => {
      mockProcessTurn.mockResolvedValueOnce({
        aiMessage: { content: "Reply" },
        turnId: "turn-1",
      });

      const agent = new AuraVoiceAgent({
        userId: "user-1",
        companionId: "comp-1",
        instructions: "Be helpful",
      });
      const stream = await agent.llmNode(
        {
          items: [
            { type: "system", textContent: "System prompt" },
            { type: "message", role: "user", textContent: "Hello" },
            { type: "function_call", name: "getWeather" },
          ],
        } as any,
        {} as any,
        {},
      );

      expect(stream).toBeInstanceOf(ReadableStream);
      expect(mockProcessTurn).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Hello" }),
      );
    });
  });
});
