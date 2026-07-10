import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDeleteResult = { rowCount: 0 };
const mockDb = {
  delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(mockDeleteResult) })),
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue([]),
      })),
    })),
  })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue({ rowCount: 0 }) })) })),
  transaction: vi.fn((cb: any) => cb({ delete: vi.fn(() => ({ where: vi.fn() })) })),
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  usersTable: {},
  messagesTable: {},
  companionsTable: {},
  memoriesTable: {},
  subscriptionsTable: {},
  memoryJobsTable: {},
  safetyEventsTable: {},
  bannedIdentitiesTable: {},
}));

// NOTE: enforceRetention() (global 90-day message purge) and markInactiveUsers() were REMOVED —
// retention is account-deletion-only (data-retention-policy.md). The remaining purges are exercised below.
describe("Retention purge — contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteResult.rowCount = 0;
  });

  // E-3: the flat 365-day full-row delete is GONE — safety-event rows are permanent (the metadata
  // layer SB 243 reads); only raw flagged_content is nulled, per tier window (T1/T2).
  describe("enforceSafetyEventContentScrub", () => {
    it("scrubs content via UPDATE (one per tier) and never deletes rows", async () => {
      const { enforceSafetyEventContentScrub } = await import("../services/retention.js");
      await enforceSafetyEventContentScrub();

      expect(mockDb.update).toHaveBeenCalledTimes(2); // T1 + T2 windows
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("nulls flaggedContent but keeps the row (no delete in the set payload)", async () => {
      const setSpy = vi.fn(() => ({ where: vi.fn().mockResolvedValue({ rowCount: 0 }) }));
      mockDb.update.mockImplementation(() => ({ set: setSpy }));
      const { enforceSafetyEventContentScrub } = await import("../services/retention.js");
      await enforceSafetyEventContentScrub();

      expect(setSpy).toHaveBeenCalledWith(expect.objectContaining({ flaggedContent: null }));
    });

    it("dryRun does not call update", async () => {
      const { enforceSafetyEventContentScrub } = await import("../services/retention.js");
      await enforceSafetyEventContentScrub({ dryRun: true });

      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("returns the summed scrub count across tiers", async () => {
      mockDb.update.mockImplementation(() => ({
        set: vi.fn(() => ({ where: vi.fn().mockResolvedValue({ rowCount: 3 }) })),
      }));
      const { enforceSafetyEventContentScrub } = await import("../services/retention.js");
      const scrubbed = await enforceSafetyEventContentScrub();
      expect(scrubbed).toBe(6); // 3 from T1 + 3 from T2
    });
  });

  describe("reconcilePremiumStaleness", () => {
    it("dryRun does not call update", async () => {
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      }));
      mockDb.select.mockImplementation(mockSelect);

      const { reconcilePremiumStaleness } = await import("../services/retention.js");
      await reconcilePremiumStaleness({ dryRun: true });

      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe("dry-run guards", () => {
    it("propagates errors from the underlying query", async () => {
      mockDb.select.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockRejectedValue(new Error("table is null")),
          })),
        })),
      }));
      const { enforceSafetyEventContentScrub } = await import("../services/retention.js");
      await expect(enforceSafetyEventContentScrub({ dryRun: true })).rejects.toThrow();
    });

    it("dry-run with no candidates returns 0", async () => {
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));
      mockDb.select.mockImplementation(mockSelect);

      const { enforceSafetyEventContentScrub } = await import("../services/retention.js");
      const result = await enforceSafetyEventContentScrub({ dryRun: true });
      expect(result).toBe(0);
    });
  });

  describe("validateCutoff", () => {
    it("throws on NaN cutoff", async () => {
      const { enforceSafetyEventContentScrub } = await import("../services/retention.js");
      const realDateNow = Date.now.bind(globalThis);
      Date.now = vi.fn(() => NaN);
      await expect(enforceSafetyEventContentScrub()).rejects.toThrow("invalid cutoff date");
      Date.now = realDateNow;
    });
  });

  describe("enforceBannedIdentitiesRetention", () => {
    it("deletes expired banned identities", async () => {
      const { enforceBannedIdentitiesRetention } = await import("../services/retention.js");
      mockDeleteResult.rowCount = 3;
      const result = await enforceBannedIdentitiesRetention();
      expect(mockDb.delete).toHaveBeenCalledTimes(1);
      expect(result).toBe(3);
    });

    it("dryRun does not delete", async () => {
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([]),
          })),
        })),
      }));
      mockDb.select.mockImplementation(mockSelect);

      const { enforceBannedIdentitiesRetention } = await import("../services/retention.js");
      await enforceBannedIdentitiesRetention({ dryRun: true });
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe("enforceGraceExpiry", () => {
    function graceSelectMock(returnValue: any) {
      return vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(returnValue),
        })),
      })) as any;
    }

    it("dryRun returns 0 when no expired users", async () => {
      mockDb.select = graceSelectMock([]);

      const { enforceGraceExpiry } = await import("../services/retention.js");
      const result = await enforceGraceExpiry({ dryRun: true });
      expect(result).toBe(0);
    });

    it("dryRun returns count when expired users exist", async () => {
      mockDb.select = graceSelectMock([{ id: "user-1" }, { id: "user-2" }]);

      const { enforceGraceExpiry } = await import("../services/retention.js");
      const result = await enforceGraceExpiry({ dryRun: true });
      expect(result).toBe(2);
    });

    it("hard-purges expired users", async () => {
      mockDb.select = graceSelectMock([{ id: "user-1" }]);
      mockDb.transaction = vi.fn(async (cb: any) => {
        const tx = {
          delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue({ rowCount: 1 }) })),
          execute: vi.fn(),
        };
        await cb(tx);
      });

      const { enforceGraceExpiry } = await import("../services/retention.js");
      const result = await enforceGraceExpiry();
      expect(result).toBe(1);
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe("reconcilePremiumStaleness", () => {
    it("expires stale premium subscriptions", async () => {
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([
            { id: "sub-1", userId: "u-1" },
          ]),
        })),
      }));
      mockDb.select.mockImplementation(mockSelect);

      const { reconcilePremiumStaleness } = await import("../services/retention.js");
      const result = await reconcilePremiumStaleness();
      expect(result).toBe(1);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

});
