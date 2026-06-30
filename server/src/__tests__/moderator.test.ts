import { describe, it, expect } from "vitest";
import type {
  ModerationAction,
  Moderator,
  InputVerdict,
  OutputVerdict,
  UserContext,
  CategoryScore,
} from "../services/moderation/moderator.js";

describe("Moderator types and interfaces", () => {
  it("ModerationAction accepts allow, block, crisis", () => {
    const actions: ModerationAction[] = ["allow", "block", "crisis"];
    expect(actions).toHaveLength(3);
    expect(actions).toContain("allow");
    expect(actions).toContain("block");
    expect(actions).toContain("crisis");
  });

  it("InputVerdict can be constructed", () => {
    const verdict: InputVerdict = {
      action: "allow",
      categories: [{ category: "test", score: 0 }],
      escalated: false,
      layer: "L0",
      policyVersion: "1.0",
    };
    expect(verdict.action).toBe("allow");
    expect(verdict.categories).toHaveLength(1);
    expect(verdict.categories[0]).toEqual({ category: "test", score: 0 });
    expect(verdict.escalated).toBe(false);
    expect(verdict.layer).toBe("L0");
    expect(verdict.policyVersion).toBe("1.0");
  });

  it("InputVerdict supports optional fields", () => {
    const verdict: InputVerdict = {
      action: "block",
      categories: [],
      escalated: true,
      layer: "L2",
      policyVersion: "2.0",
      crisisResources: ["988"],
      reason: "flagged",
    };
    expect(verdict.crisisResources).toEqual(["988"]);
    expect(verdict.reason).toBe("flagged");
  });

  it("OutputVerdict can be constructed", () => {
    const verdict: OutputVerdict = {
      action: "crisis",
      categories: [{ category: "self-harm", score: 0.9 }],
      escalated: true,
      layer: "L3",
      policyVersion: "1.0",
      reason: "crisis detected",
      safeFallback: "I need to be careful",
    };
    expect(verdict.action).toBe("crisis");
    expect(verdict.safeFallback).toBeDefined();
    expect(verdict.reason).toBe("crisis detected");
  });

  it("UserContext can be constructed", () => {
    const ctx: UserContext = {
      userId: "user-123",
      isMinor: false,
      recentSafetyEvents: 0,
    };
    expect(ctx.userId).toBe("user-123");
    expect(ctx.isMinor).toBe(false);
    expect(ctx.recentSafetyEvents).toBe(0);
  });

  it("Moderator interface accepts object with screenInput and screenOutput", () => {
    const moderator: Moderator = {
      async screenInput(_text, _ctx) {
        return {
          action: "allow" as const,
          categories: [] as CategoryScore[],
          escalated: false,
          layer: "L0",
          policyVersion: "1.0",
        };
      },
      async screenOutput(_text) {
        return {
          action: "allow" as const,
          categories: [] as CategoryScore[],
          escalated: false,
          layer: "L3",
          policyVersion: "1.0",
        };
      },
    };
    expect(typeof moderator.screenInput).toBe("function");
    expect(typeof moderator.screenOutput).toBe("function");
  });

  it("CategoryScore can be constructed", () => {
    const score: CategoryScore = { category: "sexual", score: 0.95 };
    expect(score.category).toBe("sexual");
    expect(score.score).toBe(0.95);
  });
});
