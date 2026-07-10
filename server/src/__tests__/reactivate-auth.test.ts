// E-1: PATCH /account/reactivate was dead code — requireAuth's active-only gate 403'd the very
// users (status='deleted') the route exists for. requireAuthAllowDeleted admits active+deleted,
// and ONLY those: banned/suspended must never use reactivation as a side door.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyToken = vi.fn();
const mockLookupLocalUser = vi.fn();

vi.mock("@clerk/backend", () => ({ verifyToken: mockVerifyToken }));
vi.mock("@clerk/backend/errors", () => ({ TokenVerificationError: class extends Error { reason = ""; } }));
vi.mock("../config/env.js", () => ({ getEnv: () => ({ CLERK_SECRET_KEY: "sk_test" }) }));
vi.mock("../services/auth/auth.service.js", () => ({ lookupLocalUser: mockLookupLocalUser }));
vi.mock("../lib/logger.js", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
// The route-mount test imports the compliance router, which pulls the real db module (throws
// without DATABASE_URL at import time) — stub it; no test here touches the db.
vi.mock("../db/src/index.js", () => ({
  db: {},
  usersTable: {}, messagesTable: {}, companionsTable: {}, memoriesTable: {},
  deviceTokensTable: {}, safetyEventsTable: {}, bannedIdentitiesTable: {}, subscriptionsTable: {},
}));

function makeReqRes() {
  const req: any = { headers: { authorization: "Bearer token-1" } };
  let statusCode: number | undefined;
  let body: any;
  const res: any = {
    status: (c: number) => { statusCode = c; return { json: (j: any) => { body = j; } }; },
  };
  const next = vi.fn();
  return { req, res, next, get status() { return statusCode; }, get body() { return body; } };
}

describe("reactivation auth (requireAuthAllowDeleted)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyToken.mockResolvedValue({ sub: "clerk_u1" });
  });

  it("admits a soft-DELETED user (the whole point of the route)", async () => {
    mockLookupLocalUser.mockResolvedValue({ id: "u1", status: "deleted" });
    const { requireAuthAllowDeleted } = await import("../services/auth/clerk.middleware.js");
    const ctx = makeReqRes();
    await requireAuthAllowDeleted(ctx.req, ctx.res, ctx.next);
    expect(ctx.next).toHaveBeenCalled();
    expect(ctx.req.userId).toBe("u1");
  });

  it("admits an active user (handler then replies 400 'not deleted')", async () => {
    mockLookupLocalUser.mockResolvedValue({ id: "u1", status: "active" });
    const { requireAuthAllowDeleted } = await import("../services/auth/clerk.middleware.js");
    const ctx = makeReqRes();
    await requireAuthAllowDeleted(ctx.req, ctx.res, ctx.next);
    expect(ctx.next).toHaveBeenCalled();
  });

  it.each(["suspended", "banned"])("still blocks a %s user with 403", async (status) => {
    mockLookupLocalUser.mockResolvedValue({ id: "u1", status });
    const { requireAuthAllowDeleted } = await import("../services/auth/clerk.middleware.js");
    const ctx = makeReqRes();
    await requireAuthAllowDeleted(ctx.req, ctx.res, ctx.next);
    expect(ctx.next).not.toHaveBeenCalled();
    expect(ctx.status).toBe(403);
    expect(ctx.body).toMatchObject({ code: "ACCOUNT_SUSPENDED" });
  });

  it("plain requireAuth still 403s a deleted user (regression anchor for the E-1 boundary)", async () => {
    mockLookupLocalUser.mockResolvedValue({ id: "u1", status: "deleted" });
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const ctx = makeReqRes();
    await requireAuth(ctx.req, ctx.res, ctx.next);
    expect(ctx.next).not.toHaveBeenCalled();
    expect(ctx.status).toBe(403);
  });

  it("the reactivate route is mounted behind requireAuthAllowDeleted, not requireAuth", async () => {
    vi.doMock("../middleware/auth.js", async (importOriginal) => ({
      ...(await importOriginal<typeof import("../middleware/auth.js")>()),
    }));
    const { default: router } = await import("../routes/compliance.js");
    const { requireAuthAllowDeleted } = await import("../middleware/auth.js");
    const layer = (router as any).stack.find(
      (l: any) => l.route?.path === "/account/reactivate" && l.route?.methods?.patch,
    );
    expect(layer).toBeDefined();
    const middlewares = layer.route.stack.map((s: any) => s.handle);
    expect(middlewares).toContain(requireAuthAllowDeleted);
  });
});
