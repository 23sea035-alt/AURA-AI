process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashIdentifier } from "../lib/crypto.js";

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
};

vi.mock("../db/src/index.js", () => ({
  db: mockDb,
  usersTable: { id: "id", status: "status", updatedAt: "updated_at" },
  bannedIdentitiesTable: { identifierHash: "identifier_hash" },
  safetyEventsTable: { userId: "user_id", createdAt: "created_at" },
}));

vi.mock("@aura/shared", () => ({
  FLAGGED_USER_WINDOW_DAYS: 30,
  FLAGGED_USER_SUSPEND_THRESHOLD: 3,
}));

vi.mock("../lib/crypto.js", () => ({
  hashIdentifier: vi.fn((s: string) => `hash_${s}`),
}));

describe("Ban-evasion detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkBan", () => {
    it("returns true when email hash matches banned identity", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ identifierHash: "hash_bad@example.com" }])),
          })),
        })),
      });

      const { checkBan } = await import("../services/auth/auth.service.js");
      const result = await checkBan("bad@example.com");

      expect(result).toBe(true);
    });

    it("returns false when email hash is not banned", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      });

      const { checkBan } = await import("../services/auth/auth.service.js");
      const result = await checkBan("good@example.com");

      expect(result).toBe(false);
    });
  });

});
