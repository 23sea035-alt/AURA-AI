import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import type { AuthRequest } from "../services/auth/clerk.middleware.js";
import { PgRateLimitStore } from "./pg-rate-limit-store.js";
import { incrementMetric } from "../lib/metrics.js";

const PER_MINUTE_WINDOW_MS = 60 * 1000;
const PER_MINUTE_MAX = 30;
const PER_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const PER_DAY_MAX = 1000;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX = 20;
const WEBHOOK_WINDOW_MS = 60 * 1000;
const WEBHOOK_MAX = 120;

function ipKey(req: Request): string {
  return ipKeyGenerator(req.ip ?? "0.0.0.0");
}

function keyGenerator(req: Request): string {
  return (req as AuthRequest).userId ?? ipKey(req);
}

const API_WINDOW_MS = 15 * 60 * 1000;
const API_MAX = 300;

export const chatPerMinuteLimiter = rateLimit({
  windowMs: PER_MINUTE_WINDOW_MS,
  max: PER_MINUTE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  store: new PgRateLimitStore("chat-min"),
  handler: (_req, res) => {
    incrementMetric("rate_limit.429.chat_per_minute");
    res.status(429).json({ error: "Too many requests — please slow down.", code: "RATE_LIMITED" });
  },
});

export const chatDailyHardCap = rateLimit({
  windowMs: PER_DAY_WINDOW_MS,
  max: PER_DAY_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  store: new PgRateLimitStore("chat-day"),
  handler: (_req, res) => {
    incrementMetric("rate_limit.429.chat_daily_cap");
    res.status(429).json({ error: "Daily message cap reached. Please try again tomorrow.", code: "DAILY_CAP" });
  },
});

// Brute-force protection for unauthenticated/auth routes (keyed by IP).
export const authBruteForceLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  store: new PgRateLimitStore("auth-bf"),
  handler: (_req, res) => {
    incrementMetric("rate_limit.429.auth_brute_force");
    res.status(429).json({ error: "Too many attempts — please try again later.", code: "RATE_LIMITED" });
  },
});

// Coarse limiter for webhook endpoints (keyed by IP) — abuse/DoS backstop on top of signature checks.
export const webhookLimiter = rateLimit({
  windowMs: WEBHOOK_WINDOW_MS,
  max: WEBHOOK_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  store: new PgRateLimitStore("webhook"),
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests.", code: "RATE_LIMITED" });
  },
});

// Baseline per-IP limiter for all /api traffic — restores the global limiter that was
// dropped during the refactor.
export const apiLimiter = rateLimit({
  windowMs: API_WINDOW_MS,
  max: API_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKey,
  store: new PgRateLimitStore("api"),
  // Webhooks (from provider IPs, with their own limiter + signature checks) are exempt so a
  // provider's bursts can't collectively throttle real users through the per-IP limiter.
  skip: (req: Request) => req.path.startsWith("/webhooks") || req.path.startsWith("/payments/webhook"),
  handler: (_req, res) => {
    incrementMetric("rate_limit.429.api");
    res.status(429).json({ error: "Too many requests — please slow down.", code: "RATE_LIMITED" });
  },
});


// WS rate limiters — in-memory sliding window keyed by userId.
// Each WS connection is already Clerk-authenticated and session-scoped, so flood risk
// is lower than HTTP. Upgrade to Postgres-backed if multi-instance scaling is needed.
function makeWsLimiter(max: number, windowMs: number): (userId: string) => boolean {
  const windows = new Map<string, number[]>();
  return function isAllowed(userId: string): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;
    const hits = (windows.get(userId) ?? []).filter((t) => t > cutoff);
    hits.push(now);
    windows.set(userId, hits);
    return hits.length <= max;
  };
}

export const wsChatLimiter = makeWsLimiter(30, PER_MINUTE_WINDOW_MS);
export const wsVoiceLimiter = makeWsLimiter(5, PER_MINUTE_WINDOW_MS);

const webhookOrNoopSkipper = (req: Request): boolean =>
  req.path.startsWith("/webhooks") || req.path.startsWith("/payments/webhook");

const GLOBAL_ABUSE_WINDOW_MS = 60 * 1000;
const GLOBAL_ABUSE_MAX = 300;

export const globalPerMinuteLimiter = rateLimit({
  windowMs: GLOBAL_ABUSE_WINDOW_MS,
  max: GLOBAL_ABUSE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  skip: webhookOrNoopSkipper,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests — please slow down.", code: "GLOBAL_RATE_LIMITED" });
  },
});
