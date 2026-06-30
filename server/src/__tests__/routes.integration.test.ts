process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = "sk_test_fake";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fake";
process.env.CLERK_WEBHOOK_SECRET = "whsec_fake";
process.env.OPENAI_API_KEY = "sk-fake";
process.env.GROQ_API_KEY = "gsk_fake";
process.env.REVENUECAT_WEBHOOK_SECRET = "rc_fake";
process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

// End-to-end HTTP smoke test: mounts the real router + middleware stack and drives it through
// supertest, with the DB and Clerk auth mocked. Verifies route wiring, auth enforcement, request
// validation, and the response-envelope shape per route — things the unit/contract tests don't.

const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEST_USER = {
  id: TEST_USER_ID, clerkUserId: "clerk_test_user_001", email: "test@example.com",
  firstName: "Test", lastName: "User", dateOfBirth: "2000-01-01", status: "active",
  role: "user", isPremium: false, isMinor: false, ageVerified: true, onboardingDone: true,
  aiDisclosureAccepted: true,
};

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockExecute = vi.fn();

// Reuse the REAL schema table objects and swap ONLY `db` — avoids hand-duplicating every table
// shape (the original port did, which silently drifts from the schema).
vi.mock("../db/src/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/src/index.js")>();
  return {
    ...actual,
    db: { select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete, execute: mockExecute },
  };
});

// requireAuth/optionalAuth are re-exported from clerk.middleware by middleware/auth.ts, so mocking
// the source authenticates the whole router via an x-test-user-id header.
vi.mock("../services/auth/clerk.middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const uid = req.headers["x-test-user-id"] as string | undefined;
    if (!uid) { res.status(401).json({ error: "Unauthorized", code: "NO_TOKEN" }); return; }
    req.userId = uid; req.clerkUserId = "clerk_" + uid; next();
  },
  optionalAuth: (req: any, _res: any, next: any) => {
    const uid = req.headers["x-test-user-id"] as string | undefined;
    if (uid) { req.userId = uid; req.clerkUserId = "clerk_" + uid; }
    next();
  },
}));

// Resolves both `.from().where().limit()` and `.from().where().orderBy()` shapes.
function selectResolving(rows: unknown[]) {
  return {
    from: () => ({
      where: () => ({ limit: () => Promise.resolve(rows), orderBy: () => Promise.resolve(rows) }),
      orderBy: () => Promise.resolve(rows),
    }),
  };
}

function updateResolving(rows: unknown[]) {
  return { set: () => ({ where: () => ({ returning: () => Promise.resolve(rows) }) }) };
}

function deleteResolving(rows: unknown[]) {
  return { where: () => ({ returning: () => Promise.resolve(rows) }) };
}

let app: Express;

beforeAll(async () => {
  const { default: router } = await import("../routes/index.js");
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/api", router);
});

beforeEach(() => {
  mockSelect.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockExecute.mockReset();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("HTTP integration (router + middleware + envelope)", () => {
  it("GET /api/healthz → 200 ok when the DB probe succeeds", async () => {
    mockExecute.mockResolvedValue(undefined);
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("GET /api/healthz → 503 degraded when the DB probe fails", async () => {
    mockExecute.mockRejectedValue(new Error("db down"));
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("degraded");
  });

  it("GET /api/auth/me → 401 without auth", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me → 200 with the test-user header", async () => {
    mockSelect.mockReturnValue(selectResolving([TEST_USER]));
    const res = await request(app).get("/api/auth/me").set("x-test-user-id", TEST_USER_ID);
    expect(res.status).toBe(200);
    // /auth/me returns the user object RAW (no { data } envelope) — see audit M13.
    expect(res.body.email).toBe("test@example.com");
  });

  it("PUT /api/auth/me → 400 on an invalid date payload (Zod validation)", async () => {
    const res = await request(app)
      .put("/api/auth/me")
      .set("x-test-user-id", TEST_USER_ID)
      .send({ dateOfBirth: "not-a-date" });
    expect(res.status).toBe(400);
  });

  it("GET /api/companions → 401 without auth", async () => {
    const res = await request(app).get("/api/companions");
    expect(res.status).toBe(401);
  });

  it("GET /api/companions → 200 list (sendSuccess envelope)", async () => {
    mockSelect.mockReturnValue(selectResolving([{ id: "c1", name: "Aurora", personaKey: "aurora" }]));
    const res = await request(app).get("/api/companions").set("x-test-user-id", TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── Memory management (Memory screen) ──
  it("GET /api/companions/:id/memories → 401 without auth", async () => {
    const res = await request(app).get("/api/companions/comp-1/memories");
    expect(res.status).toBe(401);
  });

  it("GET /api/companions/:id/memories → 404 when the companion isn't the caller's", async () => {
    mockSelect.mockReturnValueOnce(selectResolving([])); // ownership check finds nothing
    const res = await request(app).get("/api/companions/comp-1/memories").set("x-test-user-id", TEST_USER_ID);
    expect(res.status).toBe(404);
  });

  it("GET /api/companions/:id/memories → 200 list (sendSuccess envelope)", async () => {
    mockSelect
      .mockReturnValueOnce(selectResolving([{ id: "comp-1" }])) // ownership ok
      .mockReturnValueOnce(selectResolving([{ id: "m1", content: "likes tea", category: "preference" }]));
    const res = await request(app).get("/api/companions/comp-1/memories").set("x-test-user-id", TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("PATCH /api/memories/:id → 400 on an invalid category (Zod validation)", async () => {
    const res = await request(app).patch("/api/memories/m1").set("x-test-user-id", TEST_USER_ID).send({ category: "nonsense" });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/memories/:id → 404 when the memory isn't the caller's (scoped update matches nothing)", async () => {
    mockUpdate.mockReturnValue(updateResolving([]));
    const res = await request(app).patch("/api/memories/m1").set("x-test-user-id", TEST_USER_ID).send({ content: "updated" });
    expect(res.status).toBe(404);
  });

  it("PATCH /api/memories/:id → 200 on success", async () => {
    mockUpdate.mockReturnValue(updateResolving([{ id: "m1", content: "updated", category: "preference" }]));
    const res = await request(app).patch("/api/memories/m1").set("x-test-user-id", TEST_USER_ID).send({ content: "updated" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/memories/:id → 404 when the memory isn't the caller's (scoped delete matches nothing)", async () => {
    mockDelete.mockReturnValue(deleteResolving([]));
    const res = await request(app).delete("/api/memories/m1").set("x-test-user-id", TEST_USER_ID);
    expect(res.status).toBe(404);
  });

  it("DELETE /api/memories/:id → 200 on success", async () => {
    mockDelete.mockReturnValue(deleteResolving([{ id: "m1" }]));
    const res = await request(app).delete("/api/memories/m1").set("x-test-user-id", TEST_USER_ID);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
