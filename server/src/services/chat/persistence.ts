import { eq } from "drizzle-orm";
import { db, messagesTable, companionsTable } from "../../db/src/index.js";

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
