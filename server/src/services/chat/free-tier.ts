import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "../../db/src/index.js";
import { messagesTable } from "../../db/src/index.js";
import { FREE_DAILY_LIMIT } from "@aura/shared";

export interface FreeTierResult {
  allowed: boolean;
  used: number;
  limit: number;
}

export async function checkFreeTierLimit(userId: string): Promise<FreeTierResult> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // No row lock here: Postgres rejects FOR UPDATE with aggregates (first live
  // request found this). The cap check is advisory — a perfectly-timed pair of
  // concurrent sends can overshoot by one message, which is acceptable.
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(and(
      eq(messagesTable.userId, userId),
      eq(messagesTable.role, "user"),
      gte(messagesTable.createdAt, today),
    ));
  const count = result?.count ?? 0;
  return { allowed: count < FREE_DAILY_LIMIT, used: count, limit: FREE_DAILY_LIMIT };
}
