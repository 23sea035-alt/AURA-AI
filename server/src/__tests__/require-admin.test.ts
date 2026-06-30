process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = "sk_test_fake";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fake";
process.env.CLERK_WEBHOOK_SECRET = "whsec_fake";
process.env.OPENAI_API_KEY = "sk-fake";
process.env.NVIDIA_API_KEY = "nvapi_fake";
process.env.REVENUECAT_WEBHOOK_SECRET = "rc_fake";
process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDbSelect = vi.fn();

vi.mock("../db/src/index.js", () => ({
  db: { select: mockDbSelect },
  usersTable: { id: "id", role: "role" },
}));

describe("requireAdmin middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when user is not admin", async () => {
    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ role: "user" }]),
        })),
      })),
    });

    const { requireAdmin } = await import("../middleware/auth.js");
    const req: any = { userId: "regular-user" };
    let statusCode = 0;
    let jsonBody: any = null;
    const res: any = {
      status: (c: number) => { statusCode = c; return { json: (j: any) => { jsonBody = j; } }; },
    };
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(statusCode).toBe(403);
    expect(jsonBody).toMatchObject({ error: "Admin access required" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when user is admin", async () => {
    mockDbSelect.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ role: "admin" }]),
        })),
      })),
    });

    const { requireAdmin } = await import("../middleware/auth.js");
    const req: any = { userId: "admin-user" };
    const res: any = { status: vi.fn(() => ({ json: vi.fn() })) };
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when no userId", async () => {
    const { requireAdmin } = await import("../middleware/auth.js");
    const req: any = {};
    let statusCode = 0;
    let jsonBody: any = null;
    const res: any = {
      status: (c: number) => { statusCode = c; return { json: (j: any) => { jsonBody = j; } }; },
    };
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
