import { describe, it, expect } from "vitest";
import { shouldShowBreakReminder } from "../services/chat/break-reminder.js";

describe("shouldShowBreakReminder (chat)", () => {
  it("returns false for recent short sessions", () => {
    const result = shouldShowBreakReminder(1, new Date(), false);
    expect(result.remind).toBe(false);
  });

  it("reminds adult after 6 hours", () => {
    const past = new Date(Date.now() - 7 * 60 * 60 * 1000);
    const result = shouldShowBreakReminder(1, past, false);
    expect(result.remind).toBe(true);
    expect(result.reason).toContain("6 hours");
  });

  it("reminds minor after 3 hours", () => {
    const past = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const result = shouldShowBreakReminder(1, past, true);
    expect(result.remind).toBe(true);
    expect(result.reason).toContain("3 hours");
  });

  it("reminds minor every 10 messages", () => {
    const result = shouldShowBreakReminder(10, new Date(), true);
    expect(result.remind).toBe(true);
  });

  it("reminds adult every 20 messages", () => {
    const result = shouldShowBreakReminder(20, new Date(), false);
    expect(result.remind).toBe(true);
  });
});
