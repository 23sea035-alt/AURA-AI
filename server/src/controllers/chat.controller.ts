import type { Response } from "express";
import { eq } from "drizzle-orm";
import type { AuthRequest } from "../middleware/auth.js";
import { checkFreeTierLimit } from "../services/chat/index.js";
import { ChatSession, type ChatSessionResult, type AbortReason } from "../services/chat/chat-session.js";
import { db, usersTable } from "../db/src/index.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { logger } from "../lib/logger.js";
import { z } from "zod";
import { ChatInputSchema } from "@aura/shared";

// The REST endpoint is a NON-STREAMING wrapper over the same ChatSession engine the WS path uses
// (single source of truth for moderation, generation, persistence, idempotency, memory, and the
// away-delivery push). The full reply lands in the collected result's aiMessage.content.
export async function chat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companionId = req.params.companionId as string;
    const { content, turnId, sessionStartedAt } = req.body as z.infer<typeof ChatInputSchema>;
    const userId = req.userId!;

    const [user] = await db.select({ isPremium: usersTable.isPremium, isMinor: usersTable.isMinor })
      .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { sendError(res, "User not found", 404); return; }

    const session = new ChatSession({
      userId, companionId, content,
      isPremium: user.isPremium ?? false, isMinor: user.isMinor ?? false,
      sessionStartedAt, providedTurnId: turnId,
    });

    let completed: ChatSessionResult | undefined;
    let aborted: { reason: AbortReason; detail?: string } | undefined;
    await session.run({
      onComplete: (r) => { completed = r; },
      onAbort: (reason, detail) => { aborted = { reason, detail }; },
    });

    if (completed) {
      sendSuccess(res, {
        turnId: completed.turnId,
        userMessage: completed.userMessage,
        aiMessage: completed.aiMessage,
        safetyFlagged: !!completed.crisisResources,
        crisisResources: completed.crisisResources,
        memoriesUsed: completed.memoriesUsed,
        breakReminder: completed.breakReminder,
        aiDisclosure: completed.aiDisclosure,
      });
      return;
    }

    switch (aborted?.reason) {
      case "free_limit_reached":
        sendError(res, "Daily message limit reached. Upgrade to premium for unlimited messages.", 429, "LIMIT_REACHED");
        return;
      case "rate_limited":
        sendError(res, "Too many requests — slow down.", 429, "RATE_LIMITED");
        return;
      case "input_blocked":
        sendError(res, aborted.detail ?? "Message blocked by safety check", 400, "BLOCKED");
        return;
      default:
        sendError(res, aborted?.detail ?? "Chat failed", 500);
        return;
    }
  } catch (err) {
    logger.error({ err }, "Chat failed");
    sendError(res, "Chat failed", 500);
  }
}

export async function getUsage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const { used, limit, allowed } = await checkFreeTierLimit(userId);
    sendSuccess(res, { used, limit, isPremium: !allowed });
  } catch (err) {
    logger.error({ err }, "Failed to check usage");
    sendError(res, "Failed to check usage", 500);
  }
}

export async function getMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companionId = req.params.companionId as string;
    const { db, messagesTable } = await import("../db/src/index.js");
    const { eq, and, asc } = await import("drizzle-orm");
    const messages = await db
      .select()
      .from(messagesTable)
      .where(and(eq(messagesTable.companionId, companionId), eq(messagesTable.userId, req.userId!)))
      .orderBy(asc(messagesTable.createdAt));
    sendSuccess(res, messages);
  } catch (err) {
    logger.error({ err }, "Failed to fetch messages");
    sendError(res, "Failed to fetch messages", 500);
  }
}
