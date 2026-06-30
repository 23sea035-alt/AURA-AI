import { validateEnv, getEnv } from "./config/env.js";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import app, { server } from "./app.js";
import { logger } from "./lib/logger.js";
import { stopJobWorker } from "./services/jobs/worker.js";
import { db } from "./db/src/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

validateEnv();
const env = getEnv();

// ── Run pending migrations before accepting connections ────────────
try {
  const migrationsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../db/migrations",
  );
  await migrate(db, { migrationsFolder: migrationsDir });
  logger.info("Database migrations up to date");
} catch (err: any) {
  const msg = [err?.message, err?.cause?.message, String(err)].join(" ");
  if (msg.includes("already exists")) {
    logger.warn("Migration tables already exist — skipping");
  } else {
    logger.fatal({ err }, "Migration failed — cannot start");
    process.exit(1);
  }
}

server.listen(env.PORT, "0.0.0.0", () => {
  logger.info({ port: env.PORT }, "Server listening");
});

// ── Graceful shutdown ──────────────────────────────────────────
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Shutting down gracefully");

  stopJobWorker();

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

export default app;
