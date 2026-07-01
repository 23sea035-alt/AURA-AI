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

  it("returns remind=true for adult at message threshold (20)", () => {
    const result = shouldShowBreakReminder(20, new Date(), false);
    expect(result.remind).toBe(true);
    expect(result.reason).toContain("breathe");
  });

  it("returns remind=true for minor at message threshold (10)", () => {
    const result = shouldShowBreakReminder(10, new Date(), true);
    expect(result.remind).toBe(true);
    expect(result.reason).toContain("break");
  });

  it("does not remind for non-multiple counts for adult", () => {
    const result = shouldShowBreakReminder(19, new Date(), false);
    expect(result.remind).toBe(false);
  });

  it("does not remind for non-multiple counts for minor", () => {
    const result = shouldShowBreakReminder(9, new Date(), true);
    expect(result.remind).toBe(false);
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
