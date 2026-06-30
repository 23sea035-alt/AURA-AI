import { eq, and, asc, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, messagesTable, companionsTable, usersTable, safetyEventsTable } from "../../db/src/index.js";
import type * as schema from "../../db/src/schema/index.js";
import { SAFE_FALLBACK_REPLY, MAX_MESSAGE_CHARS, MEMORY_RETRIEVAL_TOP_N, HISTORY_WINDOW } from "@aura/shared";
import type { PersonaTraits, PersonaKey } from "@aura/shared";
import { createModerator, buildCrisisResponse } from "../moderation/index.js";
import { getLLMProvider } from "../llm/index.js";
import { retrieveMemories, enqueueMemoryJob } from "../memory.js";
import { checkFreeTierLimit } from "./free-tier.js";
import { shouldShowBreakReminder } from "./break-reminder.js";
import { autoSuspendIfNeeded } from "../auth/auth.service.js";
import { assemblePrompt, GENERATION_FALLBACK_REPLY } from "./prompt-assembler.js";
import { logger } from "../../lib/logger.js";
import { deviceTokensTable } from "../../db/src/index.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";

type TxOrDb = NodePgDatabase<typeof schema> | PgTransaction<any, typeof schema, any>;

export interface ChatTurnInput {
  userId: string;
  companionId: string;
  content: string;
  sessionStartedAt?: string;
  providedTurnId?: string;
}

export interface ChatTurnResult {
  userMessage: typeof messagesTable.$inferSelect | null;
  aiMessage: typeof messagesTable.$inferSelect | null;
  turnId: string;
  safetyFlagged?: boolean;
  memoriesUsed?: boolean;
  breakReminder?: string;
  limitReached?: boolean;
  used?: number;
  limit?: number;
  error?: string;
}

async function logSafetyEvent(
  userId: string,
  eventType: string,
  details: { severity: string; detail?: string; content?: string },
  tx?: TxOrDb,
): Promise<void> {
  const client = tx ?? db;
  try {
    await client.insert(safetyEventsTable).values({
      userId,
      eventType,
      source: "input",
      detail: details.detail ?? null,
      flaggedContent: details.content ?? null,
      severity: details.severity,
    });
    logger.warn({ userId, eventType, severity: details.severity }, "Safety event logged");
  } catch (err) {
    logger.error({ err }, "Failed to log safety event");
  }
}

async function sendReplyPush(userId: string, companionName: string): Promise<void> {
  try {
    const tokens = await db
      .select()
      .from(deviceTokensTable)
      .where(eq(deviceTokensTable.userId, userId));

    if (tokens.length === 0) return;

    const { sendPushNotification } = await import("../notifications/apns.js");
    for (const t of tokens) {
      await sendPushNotification(t.token, {
        alert: { title: companionName, body: "Sent you a reply" },
        badge: 1,
        data: { userId, companionName },
      });
    }
  } catch (err) {
    logger.error({ err }, "Failed to send reply push");
  }
}

const MAX_TURN_RETRIES = 3;

async function executeTurnTransaction(
  input: ChatTurnInput,
  turnId: string,
): Promise<ChatTurnResult> {
  const { userId, companionId, content, sessionStartedAt } = input;

  return await db.transaction(async (tx) => {
    const [user] = await tx
      .select({ isPremium: usersTable.isPremium, isMinor: usersTable.isMinor, status: usersTable.status })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);
    if (!user) return { error: "User not found", userMessage: null, aiMessage: null, turnId };

    if (!user.isPremium) {
      const limitCheck = await checkFreeTierLimit(userId);
      if (!limitCheck.allowed) {
        return {
          error: "Daily message limit reached. Upgrade to premium for unlimited messages.",
          userMessage: null, aiMessage: null, turnId,
          limitReached: true, used: limitCheck.used, limit: limitCheck.limit,
        };
      }
    }

    const isMinor = user.isMinor ?? false;

    const [companion] = await tx
      .select()
      .from(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, userId)))
      .limit(1);
    if (!companion) return { error: "Companion not found", userMessage: null, aiMessage: null, turnId };

    const moderator = createModerator();
    const inputVerdict = await moderator.screenInput(content.trim(), { userId, isMinor });

    if (inputVerdict.action === "block") {
      await logSafetyEvent(userId, "input_blocked", {
        severity: "warning", detail: inputVerdict.reason, content,
      }, tx);
      autoSuspendIfNeeded(userId);
      return { error: inputVerdict.reason ?? "Message blocked by safety check", userMessage: null, aiMessage: null, turnId };
    }

    if (inputVerdict.action === "crisis") {
      await logSafetyEvent(userId, "crisis_detected", {
        severity: "critical", detail: inputVerdict.reason, content,
      }, tx);
      autoSuspendIfNeeded(userId);
      const [blockedMsg] = await tx.insert(messagesTable).values({
        companionId, userId, turnId, role: "user", status: "complete", content: content.trim(),
      }).returning();
      const crisisReply = buildCrisisResponse();
      const [aiMsg] = await tx.insert(messagesTable).values({
        companionId, userId, turnId, role: "assistant", status: "complete", content: crisisReply,
      }).returning();
      await tx.update(companionsTable)
        .set({ lastMessage: content.trim().slice(0, 80), lastActiveAt: new Date() })
        .where(eq(companionsTable.id, companionId));
      return { userMessage: blockedMsg, aiMessage: aiMsg, turnId, safetyFlagged: true };
    }

    const [userMessage] = await tx.insert(messagesTable).values({
      companionId, userId, turnId, role: "user", status: "complete", content: content.trim(),
    }).returning();

    const relevantMemories = await retrieveMemories(userId, companionId, content.trim(), MEMORY_RETRIEVAL_TOP_N);

    const history = await tx
      .select()
      .from(messagesTable)
      .where(and(
        eq(messagesTable.companionId, companionId),
        eq(messagesTable.userId, userId),
        ne(messagesTable.turnId, turnId),
      ))
      .orderBy(asc(messagesTable.createdAt));

    const recentHistory = history.slice(-HISTORY_WINDOW * 2).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    let memoryContext = "";
    if (relevantMemories.length > 0) {
      memoryContext = relevantMemories.map(m => `- ${m.content}`).join("\n");
    }

    const traits: PersonaTraits = companion.traits as PersonaTraits;
    const personaKey = (companion.personaKey as PersonaKey) ?? "aurora";

    const { systemPrompt, messages } = assemblePrompt({
      companionName: companion.name,
      personaKey,
      traits,
      memoryBlock: memoryContext || undefined,
      history: recentHistory,
      userMessage: content.trim(),
    });

    let replyContent: string;
    try {
      const llm = getLLMProvider();
      replyContent = await llm.generateReply({
        systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      });
      if (!replyContent) replyContent = GENERATION_FALLBACK_REPLY;
    } catch (err) {
      logger.error({ err }, "LLM generation failed, using fallback reply");
      replyContent = GENERATION_FALLBACK_REPLY;
    }

    const outputVerdict = await moderator.screenOutput(replyContent);
    let finalReply = replyContent;
    if (outputVerdict.action === "block") {
      await logSafetyEvent(userId, "output_blocked", {
        severity: "warning", detail: "Output moderated", content: replyContent,
      }, tx);
      autoSuspendIfNeeded(userId);
      finalReply = outputVerdict.safeFallback ?? SAFE_FALLBACK_REPLY;
    }

    const [aiMessage] = await tx.insert(messagesTable).values({
      companionId, userId, turnId, role: "assistant", status: "complete", content: finalReply,
    }).returning();

    if (outputVerdict.action !== "block") {
      await enqueueMemoryJob(userId, companionId, content.trim(), tx);
    }

    const msgCount = history.length + 1;
    await tx.update(companionsTable)
      .set({ lastMessage: content.trim().slice(0, 80), lastActiveAt: new Date(), messageCount: msgCount })
      .where(eq(companionsTable.id, companionId));

    // Fire-and-forget push notification (outside transaction is fine)
    sendReplyPush(userId, companion.name).catch((err) => logger.warn({ err }, "Push notification failed"));

    const sessionStart = sessionStartedAt
      ? new Date(sessionStartedAt)
      : (history.length > 0 ? new Date(history[0].createdAt) : new Date());
    const breakCheck = shouldShowBreakReminder(msgCount, sessionStart, isMinor);

    return {
      userMessage, aiMessage, turnId,
      memoriesUsed: relevantMemories.length > 0,
      breakReminder: breakCheck.remind ? breakCheck.reason : undefined,
    };
  });
}

export async function processTurn(input: ChatTurnInput): Promise<ChatTurnResult> {
  const { content, providedTurnId } = input;

  if (!content?.trim()) {
    return { error: "Message content is required", userMessage: null, aiMessage: null, turnId: "" };
  }

  if ([...content.trim()].length > MAX_MESSAGE_CHARS) {
    return {
      error: `Message exceeds ${MAX_MESSAGE_CHARS} character limit`,
      userMessage: null, aiMessage: null, turnId: "", limit: MAX_MESSAGE_CHARS,
    };
  }

  let turnId = providedTurnId ?? randomUUID();

  for (let attempt = 1; attempt <= MAX_TURN_RETRIES; attempt++) {
    try {
      return await executeTurnTransaction(input, turnId);
    } catch (err) {
      const isUniqueViolation =
        err instanceof Error &&
        (err.message?.includes("unique") || err.message?.includes("duplicate") || err.message?.includes("uq_turn_id_role"));

      if (isUniqueViolation && attempt < MAX_TURN_RETRIES) {
        logger.warn({ turnId, attempt }, "Turn ID collision — retrying with new ID");
        turnId = randomUUID();
        continue;
      }
      if (isUniqueViolation) {
        throw new Error("Turn processing failed after max retries");
      }
      throw err;
    }
  }

  throw new Error("Turn processing failed after max retries");
}
