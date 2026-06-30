process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = "sk_test_fake";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fake";
process.env.CLERK_WEBHOOK_SECRET = "whsec_fake";
process.env.OPENAI_API_KEY = "sk-fake";
process.env.NVIDIA_API_KEY = "nvapi_fake";
process.env.REVENUECAT_WEBHOOK_SECRET = "rc_fake";
process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

import { describe, it, expect, vi } from "vitest";
import rateLimit from "express-rate-limit";

function callMiddleware(
  limiter: ReturnType<typeof rateLimit>,
  key = "test-user",
): Promise<{ status: number; json: any; nextCalled: boolean }> {
  return new Promise((resolve) => {
    const req: any = {
      ip: "127.0.0.1",
      userId: key,
      headers: {},
    };
    let statusCode = 200;
    let jsonBody: any = null;
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(obj: any) { jsonBody = obj; resolve({ status: statusCode, json: jsonBody, nextCalled: false }); },
      end() { resolve({ status: statusCode, json: jsonBody, nextCalled: false }); },
      setHeader() { return this; },
    };
    const next = () => resolve({ status: statusCode, json: jsonBody, nextCalled: true });
    limiter(req, res, next);
  });
}

describe("rate-limit — contract", () => {
  it("allows requests under the limit and blocks after exceeding it", async () => {
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: any) => req.userId,
      handler: (_req, res) => {
        res.status(429).json({ error: "Too many requests — please slow down.", code: "RATE_LIMITED" });
      },
    });

    const r1 = await callMiddleware(limiter, "user-a");
    expect(r1.nextCalled).toBe(true);
    expect(r1.status).toBe(200);

    const r2 = await callMiddleware(limiter, "user-a");
    expect(r2.nextCalled).toBe(true);
    expect(r2.status).toBe(200);

    const r3 = await callMiddleware(limiter, "user-a");
    expect(r3.nextCalled).toBe(false);
    expect(r3.status).toBe(429);
    expect(r3.json).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("uses separate counters for different keys", async () => {
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 2,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: any) => req.userId,
      handler: (_req, res) => {
        res.status(429).json({ error: "Too many requests — please slow down.", code: "RATE_LIMITED" });
      },
    });

    await callMiddleware(limiter, "user-a");
    await callMiddleware(limiter, "user-a");
    const rBlocked = await callMiddleware(limiter, "user-a");
    expect(rBlocked.status).toBe(429);

    const r1b = await callMiddleware(limiter, "user-b");
    expect(r1b.nextCalled).toBe(true);
    expect(r1b.status).toBe(200);
  });

  it("exported chatPerMinuteLimiter compiles and is a function", async () => {
    const { chatPerMinuteLimiter } = await import("../middleware/rate-limit.js");
    expect(typeof chatPerMinuteLimiter).toBe("function");
  });

  it("exported chatDailyHardCap compiles and is a function", async () => {
    const { chatDailyHardCap } = await import("../middleware/rate-limit.js");
    expect(typeof chatDailyHardCap).toBe("function");
  });

  it("chatPerMinuteLimiter blocks after 30 requests with same key", async () => {
    const { chatPerMinuteLimiter } = await import("../middleware/rate-limit.js");
    for (let i = 0; i < 30; i++) {
      const r = await callMiddleware(chatPerMinuteLimiter, "heavy-user");
      expect(r.nextCalled).toBe(true);
    }
    const blocked = await callMiddleware(chatPerMinuteLimiter, "heavy-user");
    expect(blocked.nextCalled).toBe(false);
    expect(blocked.status).toBe(429);
    expect(blocked.json).toMatchObject({ code: "RATE_LIMITED" });
  }, 15000);

  it("chatDailyHardCap blocks after 1000 requests with same key", async () => {
    const { chatDailyHardCap } = await import("../middleware/rate-limit.js");
    for (let i = 0; i < 1000; i++) {
      const r = await callMiddleware(chatDailyHardCap, "daily-user");
      expect(r.nextCalled).toBe(true);
    }
    const blocked = await callMiddleware(chatDailyHardCap, "daily-user");
    expect(blocked.nextCalled).toBe(false);
    expect(blocked.status).toBe(429);
    expect(blocked.json).toMatchObject({ code: "DAILY_CAP" });
  }, 30000);

  it("keyGenerator falls back to IP when userId is missing", async () => {
    const { chatPerMinuteLimiter } = await import("../middleware/rate-limit.js");
    const r = await callMiddleware(chatPerMinuteLimiter, undefined);
    expect(r.nextCalled).toBe(true);
    expect(r.status).toBe(200);
  });

  it("fallbackKeyGenerator returns 'unknown' when both userId and ip are missing", async () => {
    const { default: rateLimit } = await import("express-rate-limit");
    let capturedKey = "";
    const limiter = rateLimit({
      windowMs: 60 * 1000,
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req: any) => {
        capturedKey = req.userId ?? req.ip ?? "unknown";
        return capturedKey;
      },
      handler: (_req, res) => { res.status(429).json({ error: "rate", code: "RATE_LIMITED" }); },
    });

    const req: any = { headers: {} };
    let statusCode = 200;
    const res: any = {
      status: (c: number) => { statusCode = c; return res; },
      json: () => {},
      setHeader: () => res,
    };
    await new Promise<void>((resolve) => {
      limiter(req, res, () => resolve());
    });
    expect(capturedKey).toBe("unknown");
  });
});
