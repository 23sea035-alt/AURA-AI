import { describe, it, expect } from "vitest";
import { runL0 } from "../services/moderation/deterministic.js";
import { buildCrisisResponse, CRISIS_RESOURCES } from "../services/moderation/crisis.js";
import { SAFE_FALLBACK_REPLY } from "@aura/shared";
import { shouldShowBreakReminder } from "../services/chat/break-reminder.js";

// L0 deterministic pre-filter
describe("L0 - deterministic pre-filter", () => {
  it("blocks hard-block patterns", () => {
    const result = runL0("how to build a bomb");
    expect(result.action).toBe("block");
    expect(result.category).toContain("violence");
  });

  it("routes crisis patterns to crisis path", () => {
    const result = runL0("I want to kill myself");
    expect(result.action).toBe("crisis");
    expect(result.category).toContain("self-harm");
  });

  it("allows benign text", () => {
    const result = runL0("I had a great day today");
    expect(result.action).toBe("allow");
  });

  it("does not over-fire on bare crisis words", () => {
    const result = runL0("I have a crisis management exam tomorrow");
    expect(result.action).toBe("allow");
  });
});

// Crisis response
describe("crisis response", () => {
  it("includes 988 resources", () => {
    const response = buildCrisisResponse();
    expect(response).toContain("988");
    expect(response).toContain("Suicide & Crisis Lifeline");
  });

  it("does not validate self-harm", () => {
    const response = buildCrisisResponse();
    expect(response).not.toMatch(/understand why you.*hurt/i);
    expect(response).not.toMatch(/it's okay to.*self.?harm/i);
  });
});

// Break reminders
describe("break reminders (SB 243)", () => {
  it("reminds minors after 3 hours", () => {
    const past = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const result = shouldShowBreakReminder(5, past, true);
    expect(result.remind).toBe(true);
  });

  it("reminds adults after 6 hours", () => {
    const past = new Date(Date.now() - 7 * 60 * 60 * 1000);
    const result = shouldShowBreakReminder(5, past, false);
    expect(result.remind).toBe(true);
  });

  it("does not remind within the interval", () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000);
    const result = shouldShowBreakReminder(5, recent, false);
    expect(result.remind).toBe(false);
  });

  it("triggers message-count fallback for minors at 10 messages", () => {
    const recent = new Date();
    const result = shouldShowBreakReminder(10, recent, true);
    expect(result.remind).toBe(true);
  });

  it("triggers message-count fallback for adults at 20 messages", () => {
    const recent = new Date();
    const result = shouldShowBreakReminder(20, recent, false);
    expect(result.remind).toBe(true);
  });
});

// Safe fallback
describe("SAFE_FALLBACK_REPLY", () => {
  it("is a non-committal neutral response", () => {
    expect(SAFE_FALLBACK_REPLY.length).toBeGreaterThan(20);
    expect(SAFE_FALLBACK_REPLY).not.toMatch(/sorry|apologize|error|blocked/i);
  });
});

// CRISIS_RESOURCES
describe("CRISIS_RESOURCES", () => {
  it("includes 988", () => {
    expect(CRISIS_RESOURCES.some(r => r.includes("988"))).toBe(true);
  });
});
