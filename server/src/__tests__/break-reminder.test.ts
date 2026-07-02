import { describe, it, expect } from "vitest";
import { shouldShowBreakReminder } from "../services/chat/break-reminder.js";

describe("shouldShowBreakReminder", () => {
  it("returns remind=false for adult just starting", () => {
    const result = shouldShowBreakReminder(1, new Date(), false);
    expect(result.remind).toBe(false);
  });

  it("returns remind=false for minor just starting", () => {
    const result = shouldShowBreakReminder(1, new Date(), true);
    expect(result.remind).toBe(false);
  });

  it("returns remind=true for adult at the turn threshold (every 10 turns)", () => {
    const result = shouldShowBreakReminder(10, new Date(), false);
    expect(result.remind).toBe(true);
    expect(result.reason).toContain("breathe");
  });

  it("returns remind=true for minor at the turn threshold (every 5 turns)", () => {
    const result = shouldShowBreakReminder(5, new Date(), true);
    expect(result.remind).toBe(true);
    expect(result.reason).toContain("break");
  });

  it("does not remind for non-multiple turn counts for adult", () => {
    const result = shouldShowBreakReminder(9, new Date(), false);
    expect(result.remind).toBe(false);
  });

  it("does not remind for non-multiple turn counts for minor", () => {
    const result = shouldShowBreakReminder(4, new Date(), true);
    expect(result.remind).toBe(false);
  });

  it("fires on the turn number derived from an always-odd msgCount (regression)", () => {
    // Callers pass Math.ceil(msgCount/2); msgCount = history.length + 1 is always odd.
    expect(shouldShowBreakReminder(Math.ceil(19 / 2), new Date(), false).remind).toBe(true);  // turn 10
    expect(shouldShowBreakReminder(Math.ceil(17 / 2), new Date(), false).remind).toBe(false); // turn 9
  });

  it("returns remind=true for adult after 6h elapsed", () => {
    const past = new Date(Date.now() - 7 * 60 * 60 * 1000);
    const result = shouldShowBreakReminder(1, past, false);
    expect(result.remind).toBe(true);
    expect(result.reason).toContain("6 hours");
  });

  it("returns remind=true for minor after 3h elapsed", () => {
    const past = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const result = shouldShowBreakReminder(1, past, true);
    expect(result.remind).toBe(true);
    expect(result.reason).toContain("3 hours");
  });

  it("returns remind=false before time interval for adult", () => {
    const past = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const result = shouldShowBreakReminder(1, past, false);
    expect(result.remind).toBe(false);
  });
});
