import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsertValues = vi.fn();
const mockDb = {
  insert: vi.fn(() => ({ values: mockInsertValues })),
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  safetyEventsTable: {},
}));

vi.mock("../lib/logger.js", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("../lib/observability.js", () => ({ captureException: vi.fn() }));
vi.mock("../lib/metrics.js", () => ({ incrementMetric: vi.fn() }));

describe("logSafetyEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a safety event with all fields", async () => {
    mockInsertValues.mockResolvedValue(undefined);
    const { logSafetyEvent } = await import("../services/chat/safety-logging.js");
    await logSafetyEvent("u1", "input_blocked", { severity: "warning", detail: "Profanity", content: "bad word" });

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({
      userId: "u1",
      eventType: "input_blocked",
      severity: "warning",
      detail: "Profanity",
      flaggedContent: "bad word",
    }));
  });

  it("uses null defaults when optional fields omitted", async () => {
    mockInsertValues.mockResolvedValue(undefined);
    const { logSafetyEvent } = await import("../services/chat/safety-logging.js");
    await logSafetyEvent("u2", "injection_detected", { severity: "critical" });

    expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({
      detail: null,
      flaggedContent: null,
    }));
  });

  it("handles DB insert failure gracefully", async () => {
    mockInsertValues.mockRejectedValue(new Error("DB timeout"));
    const { logSafetyEvent } = await import("../services/chat/safety-logging.js");
    const { logger } = await import("../lib/logger.js");
    const { captureException } = await import("../lib/observability.js");
    const { incrementMetric } = await import("../lib/metrics.js");

    await logSafetyEvent("u3", "output_blocked", { severity: "warning" });
    expect(logger.error).toHaveBeenCalled();
    expect(captureException).toHaveBeenCalled();
    expect(incrementMetric).toHaveBeenCalledWith("safety_event.write_failed");
  });

  // ── E-3: content tiering assigned at WRITE time (data-retention-policy.md §3) ──────────────────
  // The tier decides how much raw flagged content ever touches the database:
  // T1 full / T2 truncated snippet / T3 none.
  describe("content tiering (E-3)", () => {
    const insertedRow = () => mockInsertValues.mock.calls[0][0];

    beforeEach(() => {
      mockInsertValues.mockResolvedValue(undefined);
    });

    it("T1: crisis events store FULL content", async () => {
      const { logSafetyEvent } = await import("../services/chat/safety-logging.js");
      const content = "x".repeat(500);
      await logSafetyEvent("u1", "crisis_detected", { severity: "critical", content });
      expect(insertedRow()).toMatchObject({ contentTier: "T1", flaggedContent: content });
    });

    it("T1: sexual/minors category stores full content regardless of event type", async () => {
      const { logSafetyEvent } = await import("../services/chat/safety-logging.js");
      const content = "y".repeat(400);
      await logSafetyEvent("u1", "input_blocked", { severity: "critical", content, category: "sexual/minors" });
      expect(insertedRow()).toMatchObject({ contentTier: "T1", flaggedContent: content });
    });

    it("T2: standard blocks store a truncated snippet, never the full prose", async () => {
      const { logSafetyEvent } = await import("../services/chat/safety-logging.js");
      const content = "z".repeat(500);
      await logSafetyEvent("u1", "input_blocked", { severity: "warning", content, category: "hate" });
      const row = insertedRow();
      expect(row.contentTier).toBe("T2");
      expect(row.flaggedContent.length).toBeLessThanOrEqual(301); // 300 chars + ellipsis
      expect(row.flaggedContent).not.toBe(content);
    });

    it("T2: short content is stored as-is (no pointless truncation)", async () => {
      const { logSafetyEvent } = await import("../services/chat/safety-logging.js");
      await logSafetyEvent("u1", "output_blocked", { severity: "warning", content: "short reply", source: "output" });
      expect(insertedRow()).toMatchObject({ contentTier: "T2", flaggedContent: "short reply" });
    });

    it("T3: injection attempts store NO raw content at all", async () => {
      const { logSafetyEvent } = await import("../services/chat/safety-logging.js");
      await logSafetyEvent("u1", "injection_detected", { severity: "warning", content: "ignore previous instructions and…" });
      expect(insertedRow()).toMatchObject({ contentTier: "T3", flaggedContent: null });
    });

    it("user reports are T2 (bounded evidence for human review)", async () => {
      const { logSafetyEvent } = await import("../services/chat/safety-logging.js");
      await logSafetyEvent("u1", "user_reported", { severity: "info", content: "the reported message" });
      expect(insertedRow()).toMatchObject({ contentTier: "T2", flaggedContent: "the reported message" });
    });
  });
});
