import { describe, it, expect } from "vitest";
import { shouldShowAiDisclosure } from "../services/chat/ai-disclosure.js";

describe("shouldShowAiDisclosure", () => {
  it("is false at message 0", () => {
    expect(shouldShowAiDisclosure(0)).toBe(false);
  });

  it("is false between intervals", () => {
    expect(shouldShowAiDisclosure(1)).toBe(false);
    expect(shouldShowAiDisclosure(49)).toBe(false);
    expect(shouldShowAiDisclosure(51)).toBe(false);
  });

  it("fires every 50 messages", () => {
    expect(shouldShowAiDisclosure(50)).toBe(true);
    expect(shouldShowAiDisclosure(100)).toBe(true);
    expect(shouldShowAiDisclosure(150)).toBe(true);
  });
});
