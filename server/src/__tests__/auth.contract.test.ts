process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = "sk_test_fake";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fake";
process.env.CLERK_WEBHOOK_SECRET = "whsec_fake";
process.env.OPENAI_API_KEY = "sk-fake";
process.env.GROQ_API_KEY = "gsk_fake";
process.env.REVENUECAT_WEBHOOK_SECRET = "rc_fake";
process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

import { describe, it, expect, vi, beforeEach } from "vitest";

const { TokenVerificationError, TokenVerificationErrorReason } = vi.hoisted(() => {
  class TVE extends Error {
    reason: string;
    constructor(opts: { message: string; reason: string }) {
      super(opts.message);
      this.name = "TokenVerificationError";
      this.reason = opts.reason;
    }
  }
  return {
    TokenVerificationError: TVE,
    TokenVerificationErrorReason: {
      TokenExpired: "token-expired",
      TokenInvalidSignature: "token-invalid-signature",
      TokenInvalid: "token-invalid",
      TokenNotActiveYet: "token-not-active-yet",
    },
  };
});

const mockVerifyToken = vi.fn();
const mockLookupLocalUser = vi.fn();

vi.mock("@clerk/backend", () => ({
  verifyToken: mockVerifyToken,
}));

vi.mock("@clerk/backend/errors", () => ({
  TokenVerificationError,
  TokenVerificationErrorReason,
  TokenVerificationErrorCode: {},
  TokenVerificationErrorAction: {},
  SignJWTError: class extends Error {},
}));

vi.mock("../services/auth/auth.service.js", () => ({
  lookupLocalUser: mockLookupLocalUser,
}));

function mockReqRes(authHeader?: string) {
  const req: any = {
    headers: authHeader ? { authorization: authHeader } : {},
  };
  const res: any = {
    _status: 0,
    _json: null,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(obj: any) {
      this._json = obj;
      return this;
    },
  };
  return { req, res };
}

describe("requireAuth ΓÇö contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 EXPIRED_TOKEN when token is expired", async () => {
    const err = new TokenVerificationError({
      message: "Token has expired",
      reason: TokenVerificationErrorReason.TokenExpired,
    });
    mockVerifyToken.mockRejectedValueOnce(err);
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer expiredtoken");
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toMatchObject({ code: "EXPIRED_TOKEN" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 INVALID_SIGNATURE when token signature is invalid", async () => {
    const err = new TokenVerificationError({
      message: "Signature mismatch",
      reason: TokenVerificationErrorReason.TokenInvalidSignature,
    });
    mockVerifyToken.mockRejectedValueOnce(err);
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer badsig");
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toMatchObject({ code: "INVALID_SIGNATURE" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 NO_TOKEN when no auth header", async () => {
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toMatchObject({ code: "NO_TOKEN" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 NO_TOKEN when header is not Bearer", async () => {
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Basic somecreds");
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toMatchObject({ code: "NO_TOKEN" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 TOKEN_VERIFICATION_FAILED when Clerk rejects the token", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("Invalid JWT"));
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer badtoken");
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toMatchObject({ code: "TOKEN_VERIFICATION_FAILED" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 404 USER_NOT_FOUND when token valid but no local user", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "clerk_unknown" });
    mockLookupLocalUser.mockResolvedValueOnce(null);
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer validtoken");
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(404);
    expect(res._json).toMatchObject({ code: "USER_NOT_FOUND" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() with userId when token valid and user exists (active)", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "clerk_test_001" });
    mockLookupLocalUser.mockResolvedValueOnce({ id: "local-uuid-001", status: "active" });
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer validtoken");
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe("local-uuid-001");
    expect(req.clerkUserId).toBe("clerk_test_001");
  });

  it("returns 403 ACCOUNT_SUSPENDED when user status is suspended", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "clerk_suspended" });
    mockLookupLocalUser.mockResolvedValueOnce({ id: "local-uuid-sus", status: "suspended" });
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer validtoken");
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(403);
    expect(res._json).toMatchObject({ code: "ACCOUNT_SUSPENDED" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 ACCOUNT_SUSPENDED when user status is banned", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "clerk_banned" });
    mockLookupLocalUser.mockResolvedValueOnce({ id: "local-uuid-ban", status: "banned" });
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer validtoken");
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(403);
    expect(res._json).toMatchObject({ code: "ACCOUNT_SUSPENDED" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 TOKEN_VERIFICATION_FAILED for generic Clerk error", async () => {
    const err = new TokenVerificationError({
      message: "Something went wrong",
      reason: TokenVerificationErrorReason.TokenVerificationFailed,
    });
    mockVerifyToken.mockRejectedValueOnce(err);
    const { requireAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer badtoken");
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json).toMatchObject({ code: "TOKEN_VERIFICATION_FAILED" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("optionalAuth ΓÇö contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls next() without userId when no auth header", async () => {
    const { optionalAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes();
    const next = vi.fn();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBeUndefined();
  });

  it("calls next() without userId when token is invalid (silent fail)", async () => {
    mockVerifyToken.mockRejectedValueOnce(new Error("Invalid JWT"));
    const { optionalAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer badtoken");
    const next = vi.fn();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBeUndefined();
  });

  it("sets userId when token valid and user exists", async () => {
    mockVerifyToken.mockResolvedValueOnce({ sub: "clerk_test_001" });
    mockLookupLocalUser.mockResolvedValueOnce({ id: "local-uuid-001", status: "active" });
    const { optionalAuth } = await import("../services/auth/clerk.middleware.js");
    const { req, res } = mockReqRes("Bearer validtoken");
    const next = vi.fn();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.userId).toBe("local-uuid-001");
    expect(req.clerkUserId).toBe("clerk_test_001");
  });
});
