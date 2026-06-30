import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";

import http from "http";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger.js";
import { getEnv } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { apiLimiter } from "./middleware/rate-limit.js";
import { initObservability } from "./lib/observability.js";

const env = getEnv();

// ── Error tracking (Sentry, optional) ───────────────────────────────────
await initObservability(env.SENTRY_DSN, env.NODE_ENV);

const app: Express = express();

// Behind Render's proxy: trust the first X-Forwarded-For hop so req.ip is the real
// client IP. Without this, every request appears to come from the proxy's IP and the
// per-IP rate limiters would throttle ALL users collectively.
app.set("trust proxy", 1);

// Security headers (CSP, X-Frame-Options, etc.)
app.use(helmet());

// Raw body capture for webhook signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const corsOrigins = (env.CORS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : false, credentials: true }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiLimiter);
app.use("/api", router);

// Create HTTP server for WebSocket support
const server = http.createServer(app);

// Background services (LLM provider, job worker, retention sweeps). Called from index.ts
// AFTER migrations run, so the worker/retention never query un-migrated tables on first boot.
export async function startBackgroundServices(): Promise<void> {
  // ── Register WebSocket handler ───────────────────────────────────────
  try {
    const { registerWebSocketHandler } = await import("./websocket/handler.js");
    registerWebSocketHandler(server);
    logger.info("WebSocket handler registered");
  } catch (err) {
    logger.warn({ err }, "WebSocket handler failed to register");
  }

  // ── Initialize LLM provider ──────────────────────────────────────────
  try {
    const { setLLMProvider } = await import("./services/llm/index.js");
    const { createTaskSpecificProvider } = await import("./services/llm/model-selector.js");
    setLLMProvider(createTaskSpecificProvider("generate-reply", getEnv().GROQ_API_KEY));
    logger.info("Groq LLM provider initialized (llama-3.3-70b-versatile / 8b-instant fallback)");
  } catch (err) {
    logger.warn({ err }, "LLM provider failed to initialize — chat will use fallback responses");
  }

  // ── Start job worker ─────────────────────────────────────────────
  try {
    const { startJobWorker } = await import("./services/jobs/worker.js");
    startJobWorker();
    logger.info("Memory consolidation worker started");
  } catch (err) {
    logger.warn({ err }, "Job worker failed to start");
  }

  // ── Start retention enforcement ─────────────────────────────────
  try {
    const { enforceSafetyEventRetention, enforceGraceExpiry, enforceBannedIdentitiesRetention, reconcilePremiumStaleness } = await import("./services/retention.js");
    // Account-deletion-only retention: live messages are purged ONLY via the grace-expiry
    // hard-purge after account deletion — never on a blanket age cutoff, and no inactivity
    // auto-deletion. (See data-retention-policy.md.)
    const runRetention = async () => {
      try {
        await enforceSafetyEventRetention();
        await enforceGraceExpiry();
        await enforceBannedIdentitiesRetention();
        await reconcilePremiumStaleness();
      } catch (err) {
        logger.error({ err }, "Retention enforcement cycle failed");
      }
    };
    setInterval(runRetention, 60 * 60 * 1000); // hourly
    runRetention(); // first run immediately
  } catch (err) {
    logger.warn({ err }, "Retention enforcement failed to start");
  }
}

// ── Centralized error handler (must be last) ─────────────────────────
app.use(errorHandler);

export { server };
export default app;
