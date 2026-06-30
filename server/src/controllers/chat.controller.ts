import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { processTurn, checkFreeTierLimit } from "../services/chat/index.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { logger } from "../lib/logger.js";
import { z } from "zod";
import { ChatInputSchema } from "@aura/shared";

export async function chat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const companionId = req.params.companionId as string;
    const { content, turnId, sessionStartedAt } = req.body as z.infer<typeof ChatInputSchema>;
    const result = await processTurn({
      userId: req.userId!,
      companionId,
      content,
      sessionStartedAt,
      providedTurnId: turnId,
    });
    if (result.error) {
      sendError(res, result.error, result.limitReached ? 429 : 400, result.limitReached ? "LIMIT_REACHED" : undefined);
      return;
    }
    sendSuccess(res, {
      turnId: result.turnId,
      userMessage: result.userMessage,
      aiMessage: result.aiMessage,
      safetyFlagged: result.safetyFlagged,
      memoriesUsed: result.memoriesUsed,
      breakReminder: result.breakReminder,
    });
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
