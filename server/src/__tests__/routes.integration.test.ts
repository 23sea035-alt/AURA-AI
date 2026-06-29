process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = "sk_test_fake";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fake";
process.env.CLERK_WEBHOOK_SECRET = "whsec_fake";
process.env.OPENAI_API_KEY = "sk-fake";
process.env.NVIDIA_API_KEY = "nvapi_fake";
process.env.REVENUECAT_WEBHOOK_SECRET = "rc_fake";
process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER = {
  id: TEST_USER_ID,
  clerkUserId: "clerk_test_user_001",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  dateOfBirth: "2000-01-01",
  status: "active",
  role: "user",
  isPremium: false,
  isMinor: false,
  ageVerified: true,
  onboardingDone: true,
  aiDisclosureAccepted: true,
  tosAcceptedVersion: null,
  tosAcceptedAt: null,
};

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockExecute = vi.fn();

vi.mock("../db/src/index.js", () => ({
  db: { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, execute: mockExecute },
  pool: {},
  usersTable: { id: "id", clerkUserId: "clerk_user_id", email: "email", firstName: "first_name", lastName: "last_name", dateOfBirth: "date_of_birth", status: "status", role: "role", isPremium: "is_premium", isMinor: "is_minor", ageVerified: "age_verified", onboardingDone: "onboarding_done", aiDisclosureAccepted: "ai_disclosure_accepted", tosAcceptedVersion: "tos_accepted_version", tosAcceptedAt: "tos_accepted_at" },
  companionsTable: { id: "id", userId: "user_id", name: "name", personaKey: "persona_key", traits: "traits", isDefault: "is_default", lastMessage: "last_message", messageCount: "message_count", createdAt: "created_at", updatedAt: "updated_at" },
  messagesTable: { id: "id", userId: "user_id", companionId: "companion_id", turnId: "turn_id", role: "role", content: "content", status: "status", createdAt: "created_at" },
  memoriesTable: { id: "id", userId: "user_id", companionId: "companion_id", content: "content", category: "category", importance: "importance", keywords: "keywords", createdAt: "created_at", updatedAt: "updated_at" },
  subscriptionsTable: { id: "id", userId: "user_id", status: "status", expiresAt: "expires_at", willRenew: "will_renew", environment: "environment", productId: "product_id" },
  safetyEventsTable: { id: "id", userId: "user_id", eventType: "event_type", severity: "severity", detail: "detail", content: "content", createdAt: "created_at" },
  bannedIdentitiesTable: { identifierHash: "identifier_hash", identifierType: "identifier_type", reason: "reason", createdAt: "created_at", expiresAt: "expires_at" },
  memoryJobsTable: { id: "id", userId: "user_id", companionId: "companion_id", rawContent: "raw_content", status: "status", safetySkipped: "safety_skipped", result: "result", error: "error", createdAt: "created_at", processedAt: "processed_at" },
  deviceTokensTable: { id: "id", userId: "user_id", token: "token", platform: "platform", createdAt: "created_at" },
}));

vi.mock("../services/auth/clerk.middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const uid = req.headers["x-test-user-id"] as string | undefined;
    if (!uid) {
      res.status(401).json({ error: "Unauthorized", code: "NO_TEST_USER" });
      return;
    }
    req.userId = uid;
    req.clerkUserId = "clerk_" + uid;
    next();
  },
  optionalAuth: (req: any, _res: any, next: any) => {
    const uid = req.headers["x-test-user-id"] as string | undefined;
    if (uid) {
      req.userId = uid;
      req.clerkUserId = "clerk_" + uid;
    }
    next();
  },
  default: {},
}));

vi.mock("../services/llm/index.js", () => ({
  getLLMProvider: () => ({
    generateReply: vi.fn().mockResolvedValue(
      JSON.stringify([{ action: "NONE", memoryId: null, content: "", category: "general", importance: 0, rationale: "test" }]),
    ),
  }),
  setLLMProvider: vi.fn(),
}));

function selectChain(result: any) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve(result)),
        orderBy: vi.fn(() => Promise.resolve(result)),
      })),
    })),
  };
}

function insertChain(result: any) {
  return {
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve(result)),
      onConflictDoNothing: vi.fn(),
    })),
  };
}

describe("HTTP integration", () => {
  let app: import("express").Express;
  let router: import("express").Router;

  beforeAll(async () => {
    const mod = await import("../routes/index.js");
    router = mod.default;
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use("/api", router);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("health", () => {
    beforeAll(() => { mockExecute.mockResolvedValue(undefined); });

    it("GET /api/healthz returns 200", { timeout: 15000 }, async () => {
      const res = await request(app).get("/api/healthz");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });

  describe("auth enforcement", () => {
    beforeAll(() => { mockSelect.mockReset(); });

    it("returns 401 without auth header", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("returns 200 with test-user header", async () => {
      mockSelect.mockReturnValue(selectChain([TEST_USER]));
      const res = await request(app).get("/api/auth/me").set("x-test-user-id", TEST_USER_ID);
      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe("test@example.com");
    });

    it("POST /api/auth/register creates a user", async () => {
      mockSelect.mockReturnValue(selectChain([]));
      mockInsert.mockReturnValue(insertChain([TEST_USER]));
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Test", email: "test@example.com" });
      expect(res.status).toBe(201);
      expect(res.body.data.user.email).toBe("test@example.com");
    });

    it("POST /api/auth/register rejects missing body", async () => {
      const res = await request(app).post("/api/auth/register").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("validation", () => {
    it("PUT /api/auth/me returns 400 for invalid payload", async () => {
      const res = await request(app)
        .put("/api/auth/me")
        .set("x-test-user-id", TEST_USER_ID)
        .send({ dateOfBirth: "not-a-date" });
      expect(res.status).toBe(400);
    });

    it("GET /api/companions returns 401 without auth", async () => {
      const res = await request(app).get("/api/companions");
      expect(res.status).toBe(401);
    });

    it("GET /api/companions returns companions list", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => Promise.resolve([
              { id: "c1", name: "Aurora", personaKey: "aurora" },
            ])),
          })),
        })),
      });
      const res = await request(app).get("/api/companions").set("x-test-user-id", TEST_USER_ID);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
