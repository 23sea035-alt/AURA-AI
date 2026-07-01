import { describe, it, expect } from "vitest";
import { assemblePrompt, GENERATION_FALLBACK_REPLY } from "../services/chat/prompt-assembler.js";

const defaultInput = {
  companionName: "Aurora",
  personaKey: "aurora" as const,
  traits: { warmth: "warm" as const, energy: "balanced" as const, verbosity: "balanced" as const },
  memoryBlock: "",
  history: [] as Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: "Hello!",
};

describe("assemblePrompt", () => {
  it("returns systemPrompt and messages", () => {
    const result = assemblePrompt(defaultInput);
    expect(result).toHaveProperty("systemPrompt");
    expect(result).toHaveProperty("messages");
    expect(typeof result.systemPrompt).toBe("string");
    expect(Array.isArray(result.messages)).toBe(true);
  });

  it("includes safety preamble in systemPrompt", () => {
    const result = assemblePrompt(defaultInput);
    expect(result.systemPrompt).toContain("absolute priority");
    expect(result.systemPrompt).toContain("988");
    expect(result.systemPrompt).toContain("never sexually explicit");
  });

  it("includes companion name in systemPrompt", () => {
    const result = assemblePrompt({ ...defaultInput, companionName: "Orion" });
    expect(result.systemPrompt).toContain("Orion");
  });

  it("includes persona traits in systemPrompt", () => {
    const result = assemblePrompt(defaultInput);
    expect(result.systemPrompt).toContain("gentle, emotionally attuned");
    expect(result.systemPrompt).toContain("openly warm and caring");
    expect(result.systemPrompt).toContain("even, natural energy");
    expect(result.systemPrompt).toContain("moderate few sentences");
  });

  it("includes memory block when provided", () => {
    const result = assemblePrompt({ ...defaultInput, memoryBlock: "User likes cats" });
    expect(result.systemPrompt).toContain("<<MEMORY ref-only");
    expect(result.systemPrompt).toContain("User likes cats");
    expect(result.systemPrompt).toContain("<</MEMORY");
  });

  it("does not include memory section when memoryBlock is empty", () => {
    const result = assemblePrompt(defaultInput);
    expect(result.systemPrompt).not.toContain("<<MEMORY");
  });

  it("includes output constraints in systemPrompt", () => {
    const result = assemblePrompt(defaultInput);
    expect(result.systemPrompt).toContain("2–4 sentences");
    expect(result.systemPrompt).toContain("plain text");
  });

  it("wraps userMessage in USER_INPUT delimiter", () => {
    const result = assemblePrompt({ ...defaultInput, userMessage: "Test message" });
    expect(result.messages.some((m) => m.content.includes("<<USER_INPUT"))).toBe(true);
    expect(result.messages.some((m) => m.content.includes("Test message"))).toBe(true);
    expect(result.messages.some((m) => m.content.includes("<</USER_INPUT"))).toBe(true);
  });

  it("wraps history in HISTORY delimiter when provided", () => {
    const history = [
      { role: "user" as const, content: "Hi" },
      { role: "assistant" as const, content: "Hello!" },
    ];
    const result = assemblePrompt({ ...defaultInput, history });
    expect(result.messages.some((m) => m.content.includes("<<HISTORY"))).toBe(true);
    expect(result.messages.some((m) => m.content.includes("[user]: Hi"))).toBe(true);
    expect(result.messages.some((m) => m.content.includes("[assistant]: Hello!"))).toBe(true);
    expect(result.messages.some((m) => m.content.includes("<</HISTORY"))).toBe(true);
  });

  it("limits history to HISTORY_WINDOW messages", () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: ("user" as const),
      content: `Message ${i}`,
    }));
    const result = assemblePrompt({ ...defaultInput, history });
    const historyMsg = result.messages.find((m) => m.content.includes("<<HISTORY"));
    const lines = historyMsg!.content.split("\n");
    const contentLines = lines.filter((l) => l.startsWith("[user]:"));
    expect(contentLines.length).toBeLessThanOrEqual(8);
  });

  it("omits history block when history is empty", () => {
    const result = assemblePrompt(defaultInput);
    expect(result.messages.some((m) => m.content.includes("<<HISTORY"))).toBe(false);
  });

  it("returns only user messages in the messages array", () => {
    const result = assemblePrompt(defaultInput);
    for (const msg of result.messages) {
      expect(msg.role).toBe("user");
    }
  });

  it("uses GENERATION_FALLBACK_REPLY for persona-key fallback", () => {
    expect(GENERATION_FALLBACK_REPLY).toBe("I lost my train of thought for a second — say that again?");
  });
});
