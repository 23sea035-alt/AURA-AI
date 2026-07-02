import { describe, it, expect } from "vitest";
import { shouldShowAiDisclosure } from "../services/chat/ai-disclosure.js";

describe("shouldShowAiDisclosure", () => {
  it("is false at turn 0", () => {
    expect(shouldShowAiDisclosure(0)).toBe(false);
  });

  it("is false between intervals", () => {
    expect(shouldShowAiDisclosure(1)).toBe(false);
    expect(shouldShowAiDisclosure(24)).toBe(false);
    expect(shouldShowAiDisclosure(26)).toBe(false);
  });

  it("fires every 25 turns", () => {
    expect(shouldShowAiDisclosure(25)).toBe(true);
    expect(shouldShowAiDisclosure(50)).toBe(true);
    expect(shouldShowAiDisclosure(75)).toBe(true);
  });

  it("fires on the turn number the callers derive from an (always-odd) msgCount", () => {
    // A turn's msgCount = history.length + 1 is always odd; callers pass Math.ceil(msgCount/2).
    // This guards the original bug where `msgCount % 50` could never be 0.
    expect(shouldShowAiDisclosure(Math.ceil(49 / 2))).toBe(true);  // 49 messages → turn 25
    expect(shouldShowAiDisclosure(Math.ceil(51 / 2))).toBe(false); // → turn 26
  });
});
