import { describe, it, expect, vi } from "vitest";

import { adjudicate, runOutputFallback } from "../services/moderation/safeguard.js";

function mockProvider(response: string) {
  return {
    generateReply: vi.fn().mockResolvedValue(response),
  };
}

function failingProvider(errorMsg: string) {
  return {
    generateReply: vi.fn().mockRejectedValue(new Error(errorMsg)),
  };
}

describe("adjudicate", () => {
  it("returns allow when not flagged", async () => {
    const provider = mockProvider(
      JSON.stringify({
        flagged: false,
        category: null,
        confidence: "high",
        rationale: ["benign"],
      }),
    );
    const result = await adjudicate("hello", undefined, [], provider);
    expect(result).toEqual({
      action: "allow",
      reason: "Safeguard cleared",
      confidence: "high",
    });
  });

  it("returns block when flagged", async () => {
    const provider = mockProvider(
      JSON.stringify({
        flagged: true,
        category: "SX-1",
        confidence: "high",
        rationale: ["explicit content"],
      }),
    );
    const result = await adjudicate("bad content", undefined, [], provider);
    expect(result).toEqual({
      action: "block",
      reason: "Safeguard: SX-1",
      confidence: "high",
    });
  });

  it("returns block with flagged=true even when category is null", async () => {
    const provider = mockProvider(
      JSON.stringify({
        flagged: true,
        category: null,
        confidence: "low",
        rationale: ["ambiguous"],
      }),
    );
    const result = await adjudicate("test", undefined, [], provider);
    expect(result).toEqual({
      action: "block",
      reason: "Safeguard: flagged",
      confidence: "low",
    });
  });

  it("returns crisis when SH-1 distress detected", async () => {
    const provider = mockProvider(
      JSON.stringify({
        flagged: false,
        category: "SH-1",
        confidence: "med",
        rationale: ["crisis.route", "user expressed genuine concern"],
      }),
    );
    const result = await adjudicate(
      "I want to end it all",
      undefined,
      [],
      provider,
    );
    expect(result).toEqual({
      action: "crisis",
      reason: "Safeguard: self-harm distress detected — routing to crisis",
      confidence: "med",
    });
  });

  it("does not flag hyperbolic crisis language", async () => {
    const provider = mockProvider(
      JSON.stringify({
        flagged: false,
        category: "SH-1",
        confidence: "low",
        rationale: ["hyperbole", "joking around"],
      }),
    );
    const result = await adjudicate("that killed me lol", undefined, [], provider);
    expect(result.action).toBe("allow");
  });

  it("detects crisis via mentionsDistress keywords", async () => {
    const provider = mockProvider(
      JSON.stringify({
        flagged: false,
        category: null,
        confidence: "high",
        rationale: ["genuine concern detected", "real distress"],
      }),
    );
    const result = await adjudicate(
      "I'm really struggling",
      undefined,
      [],
      provider,
    );
    expect(result.action).toBe("crisis");
  });

  it("returns block on unparseable JSON when not explicitly safe", async () => {
    const provider = mockProvider("garbage non-json response");
    const result = await adjudicate("test", undefined, [], provider);
    expect(result).toEqual({
      action: "block",
      reason: "Safeguard: unparseable_failclosed",
      confidence: "low",
    });
  });

  it("returns allow on unparseable JSON with flagged:false marker", async () => {
    const provider = mockProvider(
      'Some text containing "flagged": false inside',
    );
    const result = await adjudicate("test", undefined, [], provider);
    expect(result.action).toBe("allow");
  });

  it("returns block on provider error", async () => {
    const provider = failingProvider("API timeout");
    const result = await adjudicate("test", undefined, [], provider);
    expect(result).toEqual({
      action: "block",
      reason: "Safeguard error: API timeout",
      confidence: "high",
    });
  });

  it("passes L1 and L2 categories in the prompt", async () => {
    const provider = {
      generateReply: vi.fn().mockResolvedValue(
        JSON.stringify({
          flagged: false,
          category: null,
          confidence: "high",
          rationale: ["ok"],
        }),
      ),
    };
    await adjudicate("test", "IJ-1", ["injection", "malicious"], provider);
    const msgContent =
      provider.generateReply.mock.calls[0][0].messages[0].content;
    expect(msgContent).toContain("L1 hint: IJ-1");
    expect(msgContent).toContain("L2 categories: injection, malicious");
  });
});

describe("runOutputFallback", () => {
  it("returns allow when not flagged", async () => {
    const provider = mockProvider(
      JSON.stringify({
        flagged: false,
        category: null,
        confidence: "high",
        rationale: ["safe"],
      }),
    );
    const result = await runOutputFallback("hello", provider);
    expect(result).toEqual({
      action: "allow",
      reason: "Output safeguard cleared",
      confidence: "high",
    });
  });

  it("returns block when flagged", async () => {
    const provider = mockProvider(
      JSON.stringify({
        flagged: true,
        category: "VI-1",
        confidence: "high",
        rationale: ["violence"],
      }),
    );
    const result = await runOutputFallback("bad content", provider);
    expect(result).toEqual({
      action: "block",
      reason: "Output safeguard: VI-1",
      confidence: "high",
    });
  });

  it("returns block on unparseable JSON", async () => {
    const provider = mockProvider("not json at all");
    const result = await runOutputFallback("test", provider);
    expect(result.action).toBe("block");
    expect(result.reason).toContain("unparseable_failclosed");
  });

  it("returns allow on unparseable JSON with flagged:false", async () => {
    const provider = mockProvider('text "flagged": false here');
    const result = await runOutputFallback("test", provider);
    expect(result.action).toBe("allow");
  });

  it("returns block on provider error", async () => {
    const provider = failingProvider("rate limited");
    const result = await runOutputFallback("test", provider);
    expect(result).toEqual({
      action: "block",
      reason: "Output safeguard error: rate limited",
      confidence: "high",
    });
  });
});
