import { eq, and, asc } from "drizzle-orm";
import { db, messagesTable, companionsTable } from "../../db/src/index.js";

type Message = typeof messagesTable.$inferSelect;

/**
 * Idempotency lookup: return the already-committed messages for a (user, companion, turnId)
 * so a client network-retry of the same turnId never produces a duplicate turn or a second
 * LLM generation (spec §3 — the connection is just a viewer). Returns null if no rows exist.
 */
export async function fetchExistingTurn(
  userId: string,
  companionId: string,
  turnId: string,
): Promise<{ userMessage: Message | null; aiMessage: Message | null } | null> {
  const rows = await db.select().from(messagesTable)
    .where(and(
      eq(messagesTable.userId, userId),
      eq(messagesTable.companionId, companionId),
      eq(messagesTable.turnId, turnId),
    ))
    .orderBy(asc(messagesTable.createdAt));
  if (rows.length === 0) return null;
  return {
    userMessage: rows.find((r) => r.role === "user") ?? null,
    aiMessage: rows.find((r) => r.role === "assistant") ?? null,
  };
}

/** True when a DB error is the `(turn_id, role)` unique-constraint violation (a duplicate turn). */
export function isTurnUniqueViolation(err: unknown): boolean {
  return err instanceof Error
    && (err.message.includes("unique") || err.message.includes("duplicate") || err.message.includes("uq_turn_id_role"));
}

export async function persistMessages(
  userId: string,
  companionId: string,
  turnId: string,
  userContent: string,
  aiContent: string,
  msgCount?: number,
): Promise<{ userMessage: typeof messagesTable.$inferSelect; aiMessage: typeof messagesTable.$inferSelect }> {
  return db.transaction(async (tx) => {
    const [userMessage] = await tx.insert(messagesTable).values({
      companionId, userId, turnId, role: "user", status: "complete", content: userContent,
    }).returning();
    const [aiMessage] = await tx.insert(messagesTable).values({
      companionId, userId, turnId, role: "assistant", status: "complete", content: aiContent,
    }).returning();
    await tx.update(companionsTable)
      .set({
        lastMessage: userContent.slice(0, 80),
        lastActiveAt: new Date(),
        ...(msgCount !== undefined && { messageCount: msgCount }),
      })
      .where(eq(companionsTable.id, companionId));
    return { userMessage, aiMessage };
  });
}
