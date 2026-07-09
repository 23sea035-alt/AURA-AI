import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockWhereThenable = vi.fn(() => {
  const promise = mockSelect();
  promise.limit = mockSelect;
  return promise;
});
const mockFrom = vi.fn(() => ({ where: mockWhereThenable }));
const mockReturning = vi.fn().mockResolvedValue([{ id: "u1", role: "user" }]);
const mockOnConflictDoUpdate = vi.fn(() => ({ returning: mockReturning }));
const mockInsertValues = vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));
const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));
const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));
const mockDb = {
  select: vi.fn(() => ({ from: mockFrom })),
  insert: mockInsert,
  delete: mockDelete,
  update: mockUpdate,
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  usersTable: {},
  bannedIdentitiesTable: {},
  safetyEventsTable: {},
}));

vi.mock("../lib/crypto.js", () => ({ hashIdentifier: vi.fn((s: string) => `hash:${s}`) }));
vi.mock("../lib/logger.js", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));

function mockResetAll() {
  mockSelect.mockReset();
  mockWhereThenable.mockReset();
  mockFrom.mockReset();
  mockUpdate.mockClear();
  mockUpdateWhere.mockClear();
  mockUpdateSet.mockClear();
  mockDelete.mockClear();
  mockDeleteWhere.mockClear();
  // Re-establish chains
  mockWhereThenable.mockImplementation(() => {
    const promise = mockSelect();
    promise.limit = mockSelect;
    return promise;
  });
  mockFrom.mockImplementation(() => ({ where: mockWhereThenable }));
}

describe("auth.service", () => {
  beforeEach(() => {
    mockResetAll();
  });

  describe("lookupLocalUser", () => {
    it("returns user when found", async () => {
      mockSelect.mockResolvedValue([{ id: "u1", clerkUserId: "clerk_1" }]);
      const { lookupLocalUser } = await import("../services/auth/auth.service.js");
      const result = await lookupLocalUser("clerk_1");
      expect(result).toEqual({ id: "u1", clerkUserId: "clerk_1" });
    });

    it("returns null when not found", async () => {
      mockSelect.mockResolvedValue([]);
      const { lookupLocalUser } = await import("../services/auth/auth.service.js");
      const result = await lookupLocalUser("clerk_missing");
      expect(result).toBeNull();
    });
  });

  describe("upsertUserFromClerk", () => {
    it("inserts a new user with default role", async () => {
      mockSelect.mockResolvedValue([]);
      const { upsertUserFromClerk } = await import("../services/auth/auth.service.js");
      const result = await upsertUserFromClerk({ clerkUserId: "c1", email: "test@example.com" });
      expect(result).toEqual({ id: "u1", role: "user" });
    });

    it("passes role when valid", async () => {
      mockSelect.mockResolvedValue([]);
      const { upsertUserFromClerk } = await import("../services/auth/auth.service.js");
      await upsertUserFromClerk({ clerkUserId: "c2", email: "admin@x.com", role: "admin" });
      expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }));
    });

    it("ignores invalid role and defaults to user", async () => {
      mockSelect.mockResolvedValue([]);
      const { upsertUserFromClerk } = await import("../services/auth/auth.service.js");
      await upsertUserFromClerk({ clerkUserId: "c3", email: "bad@x.com", role: "superadmin" });
      expect(mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ role: "user" }));
    });
  });

  describe("deleteUserByClerkId", () => {
    it("deletes by clerkUserId", async () => {
      mockSelect.mockResolvedValue([]);
      const { deleteUserByClerkId } = await import("../services/auth/auth.service.js");
      await deleteUserByClerkId("clerk_del");
      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteWhere).toHaveBeenCalled();
    });
  });

  describe("checkBan", () => {
    it("returns false when no match", async () => {
      mockSelect.mockResolvedValue([]);
      const { checkBan } = await import("../services/auth/auth.service.js");
      const result = await checkBan("user@x.com");
      expect(result).toBe(false);
    });

    it("returns true when email hash matches", async () => {
      mockSelect.mockResolvedValue([{ id: "b1" }]);
      const { checkBan } = await import("../services/auth/auth.service.js");
      const result = await checkBan("banned@x.com");
      expect(result).toBe(true);
    });

    it("includes apple and google sub hashes", async () => {
      mockSelect.mockResolvedValue([]);
      const { checkBan } = await import("../services/auth/auth.service.js");
      await checkBan("u@x.com", { appleSub: "apple_123", googleSub: "google_456" });
      expect(mockWhereThenable).toHaveBeenCalled();
    });
  });

});
