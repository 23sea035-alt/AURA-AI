import { describe, it, expect, vi, beforeEach } from "vitest";

let selectResult: unknown = [];
const resultsQueue: unknown[] = [];

function makeQuery(): Record<string, any> {
  const q: Record<string, any> = {
    from: vi.fn(() => q),
    where: vi.fn(() => q),
    orderBy: vi.fn(() => q),
    limit: vi.fn(() => q),
    then: (resolve: (v: unknown) => any) => {
      const data = resultsQueue.length > 0 ? resultsQueue.shift() : selectResult;
      return Promise.resolve(data).then(resolve);
    },
    catch: () => {},
  };
  return q;
}

const mockSelect = vi.fn(() => makeQuery());
const mockInsertValues = vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: "job-1" }]) }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));

const mockTxUpdate = vi.fn().mockResolvedValue({ rowCount: 1 });
const mockTxDelete = vi.fn().mockResolvedValue({ rowCount: 1 });
const mockTransaction = vi.fn().mockImplementation(async (cb: (tx: any) => Promise<void>) => {
  const tx = {
    delete: vi.fn(() => ({ where: mockTxDelete })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: mockTxUpdate })) })),
  };
  await cb(tx);
});

const mockWhere = vi.fn().mockResolvedValue({ rowCount: 1 });
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));

const mockDb = {
  update: mockUpdate,
  select: mockSelect,
  transaction: mockTransaction,
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  usersTable: { id: "id", status: "status", deletedAt: "deletedAt", email: "email", firstName: "firstName", lastName: "lastName", isPremium: "isPremium", createdAt: "createdAt", updatedAt: "updatedAt" },
  companionsTable: { id: "id", name: "name", personaKey: "personaKey", traits: "traits", messageCount: "messageCount", userId: "userId", createdAt: "createdAt" },
  messagesTable: { id: "id", role: "role", content: "content", companionId: "companionId", userId: "userId", createdAt: "createdAt" },
  memoriesTable: { id: "id", content: "content", category: "category", importance: "importance", companionId: "companionId", userId: "userId", createdAt: "createdAt" },
  memoryJobsTable: { id: "id", userId: "userId" },
  subscriptionsTable: { id: "id", tier: "tier", status: "status", store: "store", expiresAt: "expiresAt", userId: "userId", createdAt: "createdAt" },
  safetyEventsTable: { id: "id", eventType: "eventType", source: "source", severity: "severity", userId: "userId", createdAt: "createdAt" },
  deviceTokensTable: { id: "id", userId: "userId" },
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("Account deletion — contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
    resultsQueue.length = 0;
  });

  describe("softDeleteUser", () => {
    it("updates user status to deleted", async () => {
      const { softDeleteUser } = await import("../services/account/deletion.js");
      await softDeleteUser("user-1");
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("hardDeleteUser", () => {
    it("deletes all user data in a transaction", async () => {
      const { hardDeleteUser } = await import("../services/account/deletion.js");
      await hardDeleteUser("user-1");
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe("cancelDeletion", () => {
    it("restores user when status is deleted", async () => {
      selectResult = [{ status: "deleted" }];
      const { cancelDeletion } = await import("../services/account/deletion.js");
      const result = await cancelDeletion("user-1");
      expect(result).toBe(true);
    });

    it("returns false when user is not deleted", async () => {
      selectResult = [{ status: "active" }];
      const { cancelDeletion } = await import("../services/account/deletion.js");
      const result = await cancelDeletion("user-1");
      expect(result).toBe(false);
    });

    it("returns false when user not found", async () => {
      selectResult = [];
      const { cancelDeletion } = await import("../services/account/deletion.js");
      const result = await cancelDeletion("user-1");
      expect(result).toBe(false);
    });
  });

  describe("processPendingDeletions", () => {
    it("returns 0 when no pending deletions", async () => {
      selectResult = [];
      const { processPendingDeletions } = await import("../services/account/deletion.js");
      const count = await processPendingDeletions();
      expect(count).toBe(0);
    });

    it("dry run logs and returns count without deleting", async () => {
      selectResult = [{ id: "user-1", email: "test@test.com" }];
      const { processPendingDeletions } = await import("../services/account/deletion.js");
      const count = await processPendingDeletions(true);
      expect(count).toBe(1);
    });

    it("hard-deletes expired users", async () => {
      selectResult = [{ id: "user-1", email: "test@test.com" }, { id: "user-2", email: "test2@test.com" }];
      const { processPendingDeletions } = await import("../services/account/deletion.js");
      const count = await processPendingDeletions();
      expect(count).toBe(2);
      expect(mockTransaction).toHaveBeenCalledTimes(2);
    });
  });
});

describe("Account export — contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResult = [];
    resultsQueue.length = 0;
  });

  it("throws when user not found", async () => {
    selectResult = [];
    const { exportUserData } = await import("../services/account/export.js");
    await expect(exportUserData("user-1")).rejects.toThrow("User not found");
  });

  it("returns structured export with queued results", async () => {
    resultsQueue.push(
      [{ id: "u1", firstName: "John", lastName: "Doe", email: "john@test.com", isPremium: false, status: "active", createdAt: new Date("2026-01-01") }],
      [{ id: "c1", name: "Aurora", personaKey: "aurora", traits: {}, messageCount: 5, createdAt: new Date("2026-01-15") }],
      [{ id: "m1", companionId: "c1", role: "user", content: "hello", createdAt: new Date("2026-01-15") }],
      [{ id: "mem1", companionId: "c1", content: "likes hiking", category: "preference", importance: 0.6, createdAt: new Date("2026-01-15") }],
      [{ id: "s1", tier: "free", status: "active", store: "app_store", expiresAt: null, createdAt: new Date("2026-01-15") }],
      [{ id: "e1", eventType: "input_blocked", source: "input", severity: "warning", createdAt: new Date("2026-01-15") }],
    );

    const { exportUserData } = await import("../services/account/export.js");
    const result = await exportUserData("u1");

    expect(result.profile.email).toBe("john@test.com");
    expect(result.companions).toHaveLength(1);
    expect(result.messages).toHaveLength(1);
    expect(result.memories).toHaveLength(1);
    expect(result.subscriptions).toHaveLength(1);
    expect(result.safetyEvents).toHaveLength(1);
  });
});
