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

  describe("enforceSafetyEventRetention", () => {
    it("deletes safety events older than cutoff", async () => {
      const { enforceSafetyEventRetention } = await import("../services/retention.js");
      await enforceSafetyEventRetention();

      expect(mockDb.delete).toHaveBeenCalledTimes(1);
    });

    it("dryRun does not call delete", async () => {
      const { enforceSafetyEventRetention } = await import("../services/retention.js");
      await enforceSafetyEventRetention({ dryRun: true });

      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("returns count from delete result", async () => {
      mockDeleteResult.rowCount = 5;
      const { enforceSafetyEventRetention } = await import("../services/retention.js");
      const deleted = await enforceSafetyEventRetention();
      expect(deleted).toBe(5);
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

  function resetDbMocks(): void {
    mockDb.delete = vi.fn(() => ({ where: vi.fn().mockResolvedValue(mockDeleteResult) }));
    mockDb.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    }));
    mockDb.update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue({ rowCount: 0 }) })) }));
  }

  describe("deleteWhere guards", () => {
    it("propagates errors from the underlying query", async () => {
      mockDb.select.mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockRejectedValue(new Error("table is null")),
          })),
        })),
      }));
      const { enforceSafetyEventRetention } = await import("../services/retention.js");
      await expect(enforceSafetyEventRetention({ dryRun: true })).rejects.toThrow();
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

      const { enforceSafetyEventRetention } = await import("../services/retention.js");
      const result = await enforceSafetyEventRetention({ dryRun: true });
      expect(result).toBe(0);
    });
  });

  describe("validateCutoff", () => {
    it("throws on NaN cutoff", async () => {
      const { enforceSafetyEventRetention } = await import("../services/retention.js");
      const realDateNow = Date.now.bind(globalThis);
      Date.now = vi.fn(() => NaN);
      await expect(enforceSafetyEventRetention()).rejects.toThrow("invalid cutoff date");
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
