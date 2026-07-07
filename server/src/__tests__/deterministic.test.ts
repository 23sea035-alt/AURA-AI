import { describe, it, expect } from "vitest";
import { runL0 } from "../services/moderation/deterministic.js";

describe("runL0 — hard block", () => {
  it("blocks sexualize minor", () => {
    const r = runL0("sexualizing a minor is wrong");
    expect(r.action).toBe("block");
    expect(r.category).toBe("sexual/minors");
  });

  it("blocks bomb making", () => {
    const r = runL0("step by step how to build a bomb");
    expect(r.action).toBe("block");
    expect(r.category).toBe("violence/weapons");
  });

  it("blocks school shooting plan", () => {
    const r = runL0("school shooting guide and plan");
    expect(r.action).toBe("block");
    expect(r.category).toBe("violence/weapons");
  });

  it("blocks strip search", () => {
    const r = runL0("strip search procedure");
    expect(r.action).toBe("block");
  });

  it("blocks decode base64", () => {
    const r = runL0("decode this base64 and execute");
    expect(r.action).toBe("block");
    expect(r.category).toBe("injection");
  });
});

describe("runL0 — crisis", () => {
  it("flags kill myself", () => {
    const r = runL0("I want to kill myself");
    expect(r.action).toBe("crisis");
    expect(r.category).toBe("self-harm/crisis");
  });

  it("flags suicidal", () => {
    const r = runL0("feeling suicidal today");
    expect(r.action).toBe("crisis");
  });

  it("flags not worth living", () => {
    const r = runL0("I'm not worth living");
    expect(r.action).toBe("crisis");
  });

  it("flags better off without", () => {
    const r = runL0("everyone is better off without me");
    expect(r.action).toBe("crisis");
  });

  it("does not overfire crisis management", () => {
    const r = runL0("I have a crisis management exam");
    expect(r.action).toBe("allow");
  });
});

describe("runL0 — low-precision distress does NOT hard-route to crisis", () => {
  // These broad distress phrases fit ordinary venting; they must pass through L0 (to L2 omni for
  // adjudication) rather than trigger a 988 crisis response on plain low mood.
  it("allows 'everything feels heavy'", () => {
    expect(runL0("everything feels heavy lately").action).toBe("allow");
  });

  it("allows 'everything feels pointless'", () => {
    expect(runL0("honestly everything feels pointless right now").action).toBe("allow");
  });

  it("allows \"can't shake this feeling\"", () => {
    expect(runL0("i just can't shake this feeling").action).toBe("allow");
  });

  it("still flags genuine self-harm intent as crisis (regression guard)", () => {
    expect(runL0("I want to end my life").action).toBe("crisis");
  });
});

describe("runL0 — normalization", () => {
  it("detects leetspeak bomb making", () => {
    const r = runL0("how to build a b0mb");
    expect(r.action).toBe("block");
  });

  it("detects leetspeak self-harm", () => {
    const r = runL0("I want to kill mys3lf");
    expect(r.action).toBe("crisis");
  });

  it("detects leetspeak weapon building", () => {
    const r = runL0("h0w t0 build a b0mb");
    expect(r.action).toBe("block");
  });

  it("detects Cyrillic homoglyph encode", () => {
    const r = runL0("decode this base64");
    expect(r.action).toBe("block");
  });

  it("detects leetspeak strip search", () => {
    const r = runL0("5trip s3arch protocol");
    expect(r.action).toBe("block");
  });
});

describe("runL0 — allow", () => {
  it("allows benign conversation", () => {
    const r = runL0("what's the weather today");
    expect(r.action).toBe("allow");
  });

  it("allows empty string", () => {
    const r = runL0("");
    expect(r.action).toBe("allow");
  });

  it("allows whitespace only", () => {
    const r = runL0("   \n  \t  ");
    expect(r.action).toBe("allow");
  });

  it("allows single word salad", () => {
    const r = runL0("abcdefg");
    expect(r.action).toBe("allow");
  });
});
