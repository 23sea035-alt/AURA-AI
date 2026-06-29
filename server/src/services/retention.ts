import { eq, lte, and, isNotNull, sql } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import { db, usersTable, messagesTable, companionsTable, memoriesTable, subscriptionsTable, memoryJobsTable, safetyEventsTable, bannedIdentitiesTable } from "../db/src/index.js";
import { logger } from "../lib/logger.js";
import { getEnv } from "../config/env.js";
import { captureException } from "../lib/observability.js";

// Propagate erasure to Clerk (which holds email + credentials + OAuth subs). Best-effort: a local
// purge must still complete even if Clerk is unreachable, but we record the outcome in the audit.
async function deleteClerkUser(clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false;
  try {
    const clerk = createClerkClient({ secretKey: getEnv().CLERK_SECRET_KEY });
    await clerk.users.deleteUser(clerkUserId);
    return true;
  } catch (err) {
    logger.error({ err, clerkUserId }, "Failed to delete Clerk user during grace-expiry purge");
    captureException(err, { clerkUserId });
    return false;
  }
}

// ALL hardcoded retention numbers are defaults — LEGAL-REVIEW before launch
const RETENTION_DAYS_SAFETY_EVENTS = 365; // LEGAL-REVIEW
const RETENTION_DAYS_BANNED_IDENTITIES = 730; // LEGAL-REVIEW
const GRACE_DAYS_SOFT_DELETE = 30; // LEGAL-REVIEW
const MS_PER_DAY = 86_400_000;

function validateCutoff(cutoff: Date, context: string): void {
  if (Number.isNaN(cutoff.getTime())) {
    throw new Error(`Retention [${context}]: invalid cutoff date`);
  }
  // Cutoff must be at least 1 day in the past to prevent accidental mass-deletion
  const yesterday = new Date(Date.now() - MS_PER_DAY);
  if (cutoff >= yesterday) {
    throw new Error(`Retention [${context}]: cutoff ${cutoff.toISOString()} is too recent — refusing`);
  }
}

async function deleteWhere(
  table: any,
  where: any,
  context: string,
  dryRun = false,
): Promise<number> {
  if (!table) {
    throw new Error(`Retention [${context}]: table is null/undefined — refusing`);
  }
  if (!where) {
    throw new Error(`Retention [${context}]: WHERE clause is empty — refusing (would delete all rows)`);
  }
  if (dryRun) {
    const rows = await db.select({ id: table.id }).from(table).where(where).limit(100);
    logger.warn({ context, count: rows.length, sample: rows.map((r: { id: unknown }) => r.id) }, "DRY RUN — would delete rows");
    return rows.length;
  }
  const result = await db.delete(table).where(where);
  const count = (result as { rowCount: number | null }).rowCount ?? 0;
  logger.info({ context, count }, "Retention purge complete");
  return count;
}

// REMOVED: enforceRetention() (global 90-day message purge) and markInactiveUsers().
// Retention is account-deletion-only — live messages are retained for active users and
// hard-deleted ONLY via enforceGraceExpiry() after account deletion (data-retention-policy.md).

export async function enforceSafetyEventRetention(options?: { dryRun?: boolean }): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS_SAFETY_EVENTS * MS_PER_DAY);
  validateCutoff(cutoff, "enforceSafetyEventRetention");
  const dryRun = options?.dryRun ?? false;
  logger.info({ cutoff, dryRun }, "Running safety event retention enforcement");

  return deleteWhere(safetyEventsTable, lte(safetyEventsTable.createdAt, cutoff), "safety_events", dryRun);
}

export async function enforceBannedIdentitiesRetention(options?: { dryRun?: boolean }): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS_BANNED_IDENTITIES * MS_PER_DAY);
  validateCutoff(cutoff, "enforceBannedIdentitiesRetention");
  const dryRun = options?.dryRun ?? false;
  logger.info({ cutoff, dryRun }, "Running banned identities retention enforcement");

  return deleteWhere(
    bannedIdentitiesTable,
    and(lte(bannedIdentitiesTable.createdAt, cutoff), isNotNull(bannedIdentitiesTable.expiresAt)),
    "banned_identities",
    dryRun,
  );
}

export async function enforceGraceExpiry(options?: { dryRun?: boolean }): Promise<number> {
  const cutoff = new Date(Date.now() - GRACE_DAYS_SOFT_DELETE * MS_PER_DAY);
  validateCutoff(cutoff, "enforceGraceExpiry");
  const dryRun = options?.dryRun ?? false;
  logger.info({ cutoff, dryRun }, "Running grace-expiry hard purge");

  const expiredUsers = await db
    .select({ id: usersTable.id, clerkUserId: usersTable.clerkUserId, deletedAt: usersTable.deletedAt })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.status, "deleted"),
        lte(usersTable.deletedAt, cutoff),
        isNotNull(usersTable.deletedAt),
      ),
    );

  if (dryRun) {
    logger.warn({ count: expiredUsers.length, ids: expiredUsers.map(u => u.id) }, "DRY RUN — would hard-purge users");
    return expiredUsers.length;
  }

  let purged = 0;
  for (const user of expiredUsers) {
    // Propagate erasure to Clerk first (holds the PII/credentials), then purge locally + record proof.
    const clerkDeleted = await deleteClerkUser(user.clerkUserId);
    try {
      await db.transaction(async (tx) => {
        await tx.delete(memoryJobsTable).where(eq(memoryJobsTable.userId, user.id));
        await tx.delete(messagesTable).where(eq(messagesTable.userId, user.id));
        await tx.delete(memoriesTable).where(eq(memoriesTable.userId, user.id));
        await tx.delete(companionsTable).where(eq(companionsTable.userId, user.id));
        // Content-free proof-of-erasure record BEFORE removing the user row.
        await tx.execute(sql`
          INSERT INTO deletion_audit (user_id, clerk_user_id, deleted_at, clerk_deleted)
          VALUES (${user.id}, ${user.clerkUserId ?? null}, ${user.deletedAt ?? null}, ${clerkDeleted})
        `);
        await tx.delete(usersTable).where(eq(usersTable.id, user.id));
      });
      purged++;
      logger.info({ userId: user.id, clerkDeleted }, "Grace period expired — user hard-purged");
    } catch (err) {
      // Isolate per-user failures so one bad purge does not halt the whole retention cycle.
      logger.error({ err, userId: user.id }, "Grace-expiry purge failed for user — continuing");
      captureException(err, { userId: user.id });
    }
  }

  if (purged > 0) {
    logger.info({ count: purged }, "Grace-expiry hard purge complete");
  }
  return purged;
}

export async function reconcilePremiumStaleness(options?: { dryRun?: boolean }): Promise<number> {
  const now = new Date();
  const dryRun = options?.dryRun ?? false;
  logger.info({ dryRun }, "Running premium staleness reconciliation");

  const expiredSubs = await db
    .select({ id: subscriptionsTable.id, userId: subscriptionsTable.userId })
    .from(subscriptionsTable)
    .where(
      and(lte(subscriptionsTable.expiresAt, now), eq(subscriptionsTable.willRenew, false), isNotNull(subscriptionsTable.userId)),
    );

  if (dryRun) {
    logger.warn({ count: expiredSubs.length }, "DRY RUN — would expire subscriptions");
    return expiredSubs.length;
  }

  for (const sub of expiredSubs) {
    await db.update(subscriptionsTable)
      .set({ status: "expired", updatedAt: now })
      .where(eq(subscriptionsTable.id, sub.id));
    await db.update(usersTable)
      .set({ isPremium: false, updatedAt: now })
      .where(eq(usersTable.id, sub.userId!));
  }

  if (expiredSubs.length > 0) {
    logger.info({ count: expiredSubs.length }, "Stale premium subscriptions expired");
  }
  return expiredSubs.length;
}
