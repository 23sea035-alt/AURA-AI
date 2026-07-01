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
});
