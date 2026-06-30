process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = "sk_test_fake";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fake";
process.env.CLERK_WEBHOOK_SECRET = "whsec_fake";
process.env.OPENAI_API_KEY = "sk-fake";
process.env.NVIDIA_API_KEY = "nvapi_fake";
process.env.REVENUECAT_WEBHOOK_SECRET = "rc_fake";
process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("../db/src/index.js", () => ({
  db: { select: mockSelect, insert: mockInsert, delete: mockDelete },
  usersTable: { id: "id", role: "role", isAdmin: "is_admin" },
  safetyEventsTable: { id: "id", createdAt: "created_at" },
  bannedIdentitiesTable: { identifierHash: "identifier_hash", identifierType: "identifier_type", reason: "reason" },
  messagesTable: { id: "id", userId: "user_id" },
  companionsTable: { id: "id", userId: "user_id" },
  memoriesTable: { id: "id", userId: "user_id" },
  deviceTokensTable: { id: "id", userId: "user_id" },
}));

vi.mock("../middleware/auth.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../middleware/auth.js")>();
  return {
    ...actual,
    requireAuth: (req: any, _res: any, next: any) => {
      req.userId = req.testUserId ?? "test-user";
      req.clerkUserId = "clerk_" + req.userId;
      next();
    },
    requireAdmin: (_req: any, _res: any, next: any) => {
      next();
    },
  };
});

vi.mock("../lib/crypto.js", () => ({
  hashIdentifier: vi.fn((s: string) => `hash_${s}`),
}));

describe("Admin route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admin user to access safety-events", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    const { default: router } = await import("../routes/compliance.js");
    const handler = findHandler(router, "/admin/safety-events", "get");
    expect(handler).toBeDefined();

    const req: any = { testUserId: "admin-user", params: {}, body: {} };
    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status: (c: number) => { statusCode = c; return { json: (j: any) => { jsonBody = j; } }; },
    };

    await handler(req, res);

    expect(statusCode).toBe(200);
  });

  it("allows admin user to ban", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
        })),
      })),
    });

    mockInsert.mockReturnValue({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: "ban-001" }])),
      })),
    });

    const { default: router } = await import("../routes/compliance.js");
    const handler = findHandler(router, "/admin/ban", "post");
    expect(handler).toBeDefined();

    const req: any = { testUserId: "admin-user", params: {}, body: { email: "bad@example.com", reason: "spam" } };
    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status: (c: number) => { statusCode = c; return { json: (j: any) => { jsonBody = j; } }; },
    };

    await handler(req, res);

    expect(statusCode).toBe(201);
  });

  it("allows admin user to unban", async () => {
    mockDelete.mockReturnValue({
      where: vi.fn(() => Promise.resolve()),
    });

    const { default: router } = await import("../routes/compliance.js");
    const handler = findHandler(router, "/admin/unban", "post");
    expect(handler).toBeDefined();

    const req: any = { testUserId: "admin-user", params: {}, body: { email: "good@example.com" } };
    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status: (c: number) => { statusCode = c; return { json: (j: any) => { jsonBody = j; } }; },
    };

    await handler(req, res);

    expect(statusCode).toBe(200);
    expect(jsonBody).toMatchObject({ data: { unbanned: true } });
  });

  it("upsertUserFromClerk syncs role to users table", async () => {
    mockInsert.mockReturnValue({
      values: vi.fn(() => ({
        onConflictDoUpdate: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: "uuid", role: "admin" }])),
        })),
      })),
    });

    const { upsertUserFromClerk } = await import("../services/auth/auth.service.js");

    const result = await upsertUserFromClerk({
      clerkUserId: "clerk_admin",
      email: "admin@example.com",
      role: "admin",
    });

    expect(result).toBeDefined();
    expect(result.role).toBe("admin");
  });
});

function findHandler(router: any, path: string, method: string) {
  const layer = router.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method],
  );
  return layer?.route?.stack?.[layer.route.stack.length - 1]?.handle;
}
