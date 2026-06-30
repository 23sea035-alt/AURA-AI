import { db, memoryJobsTable } from "../../db/src/index.js";
import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";
import { consolidateMemory } from "../memory/consolidation.js";

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 5;
// A job that has been 'processing' longer than this is treated as orphaned (the claiming instance
// crashed mid-consolidation) and requeued. Consolidation is a single short LLM call, so a live job
// is never this old — safe even across multiple instances.
const STALE_PROCESSING_SECONDS = 300;

let running = false;
let cycleInProgress = false;
let currentCycle: Promise<void> | null = null;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function reapStaleJobs(): Promise<void> {
  try {
    const result = await db.execute(sql`
      UPDATE ${memoryJobsTable}
      SET status = 'pending', claimed_at = NULL
      WHERE status = 'processing'
        AND claimed_at IS NOT NULL
        AND claimed_at < NOW() - make_interval(secs => ${STALE_PROCESSING_SECONDS})
      RETURNING id
    `);
    const rows = result.rows as Array<{ id: string }>;
    if (rows.length > 0) {
      logger.warn({ requeued: rows.length }, "Reaped stale 'processing' memory jobs");
    }
  } catch (err) {
    logger.error({ err }, "Stale-job reaper failed");
  }
}

async function runCycle(): Promise<void> {
  try {
    // Atomically CLAIM a batch (pending -> processing, stamped with claimed_at) so overlapping
    // cycles or multiple server instances never process the same job twice. FOR UPDATE SKIP LOCKED
    // lets concurrent claimers grab disjoint rows.
    const result = await db.execute(sql`
      UPDATE ${memoryJobsTable} SET status = 'processing', claimed_at = NOW()
      WHERE id IN (
        SELECT id FROM ${memoryJobsTable}
        WHERE status = 'pending'
        ORDER BY created_at
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id
    `);
    const rows = result.rows as Array<{ id: string }>;

    for (const row of rows) {
      await consolidateMemory(row.id);
    }

    if (rows.length > 0) {
      logger.info({ processed: rows.length }, "Job worker cycle complete");
    }
  } catch (err) {
    logger.error({ err }, "Job worker cycle error");
  }
}

async function processPendingJobs(): Promise<void> {
  if (cycleInProgress) return; // never run two cycles concurrently
  cycleInProgress = true;
  currentCycle = runCycle().finally(() => {
    cycleInProgress = false;
  });
  await currentCycle;
}

export function startJobWorker(): void {
  if (running) return;
  running = true;
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "Job worker started");
  // Requeue any jobs orphaned by a previous (crashed) run before polling for new work.
  void reapStaleJobs();
  intervalHandle = setInterval(() => void processPendingJobs(), POLL_INTERVAL_MS);
  void processPendingJobs();
}

export async function stopJobWorker(): Promise<void> {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  // Drain: wait for an in-flight cycle so a job is never abandoned mid-consolidation on shutdown.
  if (currentCycle) {
    try {
      await currentCycle;
    } catch {
      // Errors inside the cycle are already logged in runCycle().
    }
  }
  logger.info("Job worker stopped");
}
