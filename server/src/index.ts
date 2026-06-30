import { validateEnv, getEnv } from "./config/env.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import app, { server, startBackgroundServices } from "./app.js";
import { logger } from "./lib/logger.js";
import { stopJobWorker } from "./services/jobs/worker.js";
import { db } from "./db/src/index.js";
import { captureException } from "./lib/observability.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readdirSync } from "node:fs";

validateEnv();
const env = getEnv();

// Shared advisory-lock key so concurrent instances serialize migration on boot (one applies,
// the rest block then see an up-to-date DB). Any constant works as long as it is the same everywhere.
const MIGRATION_LOCK_KEY = 4011966;

// ── Run pending migrations before accepting connections ────────────
try {
  // Resolve relative to THIS entry file: src/index.ts in dev, dist/index.mjs in prod (build.mjs
  // copies migrations to dist/db/migrations). Either way the folder sits at ./db/migrations.
  const migrationsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "./db/migrations",
  );
  if (!existsSync(migrationsDir) || readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).length === 0) {
    throw new Error(`Migrations folder missing or empty at ${migrationsDir}`);
  }

  // Serialize across instances with a session-level advisory lock on a dedicated connection.
  const client = await db.$client.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await migrate(db, { migrationsFolder: migrationsDir });
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => undefined);
    client.release();
  }
  logger.info("Database migrations up to date");
} catch (err) {
  logger.fatal({ err }, "Migration failed — cannot start");
  captureException(err);
  process.exit(1);
}

// Start background services only after migrations have applied.
await startBackgroundServices();

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Server listening");
});

// ── Graceful shutdown ──────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down gracefully");

  // Drain the worker's in-flight consolidation cycle before closing the pool it uses.
  await stopJobWorker();

  try {
    await db.$client.end();
  } catch (err) {
    logger.error({ err }, "Error closing database connection");
  }

  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Last-resort crash handlers: log + report, then exit so the orchestrator restarts a clean process.
process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  captureException(reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  captureException(err);
  process.exit(1);
});

export default app;
