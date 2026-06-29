import rateLimit from "express-rate-limit";
import type { Request } from "express";
import type { AuthRequest } from "../services/auth/clerk.middleware.js";

const PER_MINUTE_WINDOW_MS = 60 * 1000;
const PER_MINUTE_MAX = 30;
const PER_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const PER_DAY_MAX = 1000;
const AUTH_BRUTE_FORCE_WINDOW_MS = 15 * 60 * 1000;
const AUTH_BRUTE_FORCE_MAX = 20;
const GLOBAL_ABUSE_WINDOW_MS = 60 * 1000;
const GLOBAL_ABUSE_MAX = 60;

function fallbackKeyGenerator(req: Request): string {
  return (req as AuthRequest).userId ?? req.ip ?? "unknown";
}

function keyGenerator(req: Request): string {
  return (req as AuthRequest).userId ?? fallbackKeyGenerator(req);
}

function webhookOrNoopSkipper(req: Request): boolean {
  const path = req.path ?? "";
  if (path.startsWith("/webhooks") || path.startsWith("/payments/webhook")) return true;
  return false;
}

export const chatPerMinuteLimiter = rateLimit({
  windowMs: PER_MINUTE_WINDOW_MS,
  max: PER_MINUTE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: webhookOrNoopSkipper,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many requests — please slow down.", code: "RATE_LIMITED" });
  },
});

export const chatDailyHardCap = rateLimit({
  windowMs: PER_DAY_WINDOW_MS,
  max: PER_DAY_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: webhookOrNoopSkipper,
  handler: (_req, res) => {
    res.status(429).json({ error: "Daily message cap reached. Please try again tomorrow.", code: "DAILY_CAP" });
  },
});

export const authBruteForceLimiter = rateLimit({
  windowMs: AUTH_BRUTE_FORCE_WINDOW_MS,
  max: AUTH_BRUTE_FORCE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many auth attempts. Please try again later.", code: "AUTH_RATE_LIMITED" });
  },
});

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
