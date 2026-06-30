import { eq, and, lte, isNotNull } from "drizzle-orm";
import { db, usersTable, companionsTable, messagesTable, memoriesTable, memoryJobsTable, subscriptionsTable, safetyEventsTable, deviceTokensTable } from "../../db/src/index.js";
import { logger } from "../../lib/logger.js";

const GRACE_DAYS_SOFT_DELETE = 30;
const MS_PER_DAY = 86_400_000;

export async function softDeleteUser(userId: string): Promise<void> {
  const now = new Date();
  await db.update(usersTable)
    .set({ status: "deleted", deletedAt: now, updatedAt: now })
    .where(eq(usersTable.id, userId));
  logger.info({ userId }, "User soft-deleted");
}

export async function hardDeleteUser(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(deviceTokensTable).where(eq(deviceTokensTable.userId, userId));
    await tx.delete(memoryJobsTable).where(eq(memoryJobsTable.userId, userId));
    await tx.delete(safetyEventsTable).where(eq(safetyEventsTable.userId, userId));
    await tx.delete(messagesTable).where(eq(messagesTable.userId, userId));
    await tx.delete(memoriesTable).where(eq(memoriesTable.userId, userId));
    await tx.delete(companionsTable).where(eq(companionsTable.userId, userId));
    await tx.delete(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });
  logger.info({ userId }, "User hard-deleted");
}

export async function scheduleDeletion(userId: string): Promise<void> {
  await softDeleteUser(userId);
  logger.info({ userId }, "Deletion scheduled — grace period started");
}

export async function cancelDeletion(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ status: usersTable.status })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user || user.status !== "deleted") return false;

  await db.update(usersTable)
    .set({ status: "active", deletedAt: null, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
  logger.info({ userId }, "Deletion cancelled — user restored");
  return true;
}

export async function processPendingDeletions(dryRun = false): Promise<number> {
  const cutoff = new Date(Date.now() - GRACE_DAYS_SOFT_DELETE * MS_PER_DAY);

  const expired = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(
      and(
        eq(usersTable.status, "deleted"),
        lte(usersTable.deletedAt, cutoff),
        isNotNull(usersTable.deletedAt),
      ),
    );

  if (dryRun) {
    logger.warn({ count: expired.length, ids: expired.map(u => u.id) }, "DRY RUN — would hard-delete users");
    return expired.length;
  }

  for (const user of expired) {
    await hardDeleteUser(user.id);
  }

  if (expired.length > 0) {
    logger.info({ count: expired.length }, "Pending deletions processed");
  }
  return expired.length;
}
