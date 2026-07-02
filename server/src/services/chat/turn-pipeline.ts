import { eq, and, asc, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, messagesTable, companionsTable, usersTable } from "../../db/src/index.js";
import { SAFE_FALLBACK_REPLY, MAX_MESSAGE_CHARS, MEMORY_RETRIEVAL_TOP_N, HISTORY_WINDOW } from "@aura/shared";
import type { PersonaTraits, PersonaKey } from "@aura/shared";
import { createModerator, buildCrisisResponse } from "../moderation/index.js";
import { getLLMProvider } from "../llm/index.js";
import { retrieveMemories, enqueueMemoryJob } from "../memory.js";
import { checkFreeTierLimit } from "./free-tier.js";
import { shouldShowBreakReminder } from "./break-reminder.js";
import { shouldShowAiDisclosure } from "./ai-disclosure.js";
import { autoSuspendIfNeeded } from "../auth/auth.service.js";
import { assemblePrompt, GENERATION_FALLBACK_REPLY } from "./prompt-assembler.js";
import { logger } from "../../lib/logger.js";
import { deviceTokensTable } from "../../db/src/index.js";
import { logSafetyEvent } from "./safety-logging.js";
import { persistMessages } from "./persistence.js";

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
  aiDisclosure?: boolean;
  limitReached?: boolean;
  used?: number;
  limit?: number;
  error?: string;
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

// Run a turn. The network-bound work (input moderation, memory retrieval, generation, output
// moderation) runs OUTSIDE any DB transaction so it never holds a pooled connection across an LLM
// round-trip (audit H1 — pool-starvation fix). Only the final message/companion writes run inside a
// short transaction so a turn is still atomic (no half-written turn) and turnId-idempotent.
async function executeTurn(
  input: ChatTurnInput,
  turnId: string,
): Promise<ChatTurnResult> {
  const { userId, companionId, content, sessionStartedAt } = input;
  const trimmed = content.trim();

  // ── Phase 1: reads (no transaction) ──
  const [user] = await db
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

  const [companion] = await db
    .select()
    .from(companionsTable)
    .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, userId)))
    .limit(1);
  if (!companion) return { error: "Companion not found", userMessage: null, aiMessage: null, turnId };

  // ── Phase 2: input moderation (no transaction) ──
  const moderator = createModerator();
  const inputVerdict = await moderator.screenInput(trimmed, { userId, isMinor });

  if (inputVerdict.action === "block") {
    await logSafetyEvent(userId, "input_blocked", { severity: "warning", detail: inputVerdict.reason, content });
    await autoSuspendIfNeeded(userId);
    return { error: inputVerdict.reason ?? "Message blocked by safety check", userMessage: null, aiMessage: null, turnId };
  }

  if (inputVerdict.action === "crisis") {
    await logSafetyEvent(userId, "crisis_detected", { severity: "critical", detail: inputVerdict.reason, content });
    await autoSuspendIfNeeded(userId);
    const crisisReply = buildCrisisResponse();
    // Safety log already committed on a separate connection, so a log failure can't suppress the lifeline reply.
    const { userMessage, aiMessage } = await persistMessages(userId, companionId, turnId, trimmed, crisisReply);
    return { userMessage, aiMessage, turnId, safetyFlagged: true };
  }

  // ── Phase 3: memory + history + generation + output moderation (no transaction) ──
  const relevantMemories = await retrieveMemories(userId, companionId, trimmed, MEMORY_RETRIEVAL_TOP_N);

  const history = await db
    .select()
    .from(messagesTable)
    .where(and(
      eq(messagesTable.companionId, companionId),
      eq(messagesTable.userId, userId),
      ne(messagesTable.turnId, turnId),
    ))
    .orderBy(asc(messagesTable.createdAt));

  const recentHistory = history.slice(-HISTORY_WINDOW * 2).map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
  const memoryContext = relevantMemories.length > 0 ? relevantMemories.map(m => `- ${m.content}`).join("\n") : "";

  const traits: PersonaTraits = companion.traits as PersonaTraits;
  const personaKey = (companion.personaKey as PersonaKey) ?? "aurora";

  const { systemPrompt, messages } = assemblePrompt({
    companionName: companion.name,
    personaKey,
    traits,
    memoryBlock: memoryContext || undefined,
    history: recentHistory,
    userMessage: trimmed,
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
  const outputBlocked = outputVerdict.action === "block";
  if (outputBlocked) {
    await logSafetyEvent(userId, "output_blocked", { severity: "warning", detail: "Output moderated", content: replyContent });
    await autoSuspendIfNeeded(userId);
  }
  const finalReply = outputBlocked ? (outputVerdict.safeFallback ?? SAFE_FALLBACK_REPLY) : replyContent;
  const msgCount = history.length + 1;

  // ── Phase 4: write (short transaction; atomic user + assistant + companion) ──
  const { userMessage, aiMessage } = await persistMessages(userId, companionId, turnId, trimmed, finalReply, msgCount);

  // ── Phase 5: post-commit side-effects (must never roll back a delivered turn) ──
  if (!outputBlocked) {
    // Enqueued AFTER commit on the root connection — a memory-job failure can't undo the turn.
    enqueueMemoryJob(userId, companionId, trimmed, finalReply).catch((err) => logger.error({ err }, "Failed to enqueue memory job"));
  }
  // Skip push if user has an active WS connection — they're already live.
  void (async () => {
    try {
      const { connectionManager } = await import("../../websocket/connection-manager.js");
      if (!connectionManager.isConnected(userId, companionId)) {
        await sendReplyPush(userId, companion.name);
      }
    } catch (err) {
      logger.warn({ err }, "Push notification failed");
    }
  })();

  const sessionStart = sessionStartedAt
    ? new Date(sessionStartedAt)
    : (history.length > 0 ? new Date(history[0].createdAt) : new Date());
  const breakCheck = shouldShowBreakReminder(msgCount, sessionStart, isMinor);

  return {
    userMessage, aiMessage, turnId,
    memoriesUsed: relevantMemories.length > 0,
    breakReminder: breakCheck.remind ? breakCheck.reason : undefined,
    aiDisclosure: shouldShowAiDisclosure(Math.ceil(msgCount / 2)) || undefined,
  };
}

// Idempotency lookup: return the already-committed turn for a (user, companion, turnId) if one
// exists, so a client network-retry of the same turnId never produces a duplicate turn or a
// second LLM generation (spec §3 — the connection is just a viewer).
async function fetchExistingTurn(
  userId: string,
  companionId: string,
  turnId: string,
): Promise<ChatTurnResult | null> {
  const rows = await db
    .select()
    .from(messagesTable)
    .where(and(
      eq(messagesTable.userId, userId),
      eq(messagesTable.companionId, companionId),
      eq(messagesTable.turnId, turnId),
    ))
    .orderBy(asc(messagesTable.createdAt));

  if (!rows || rows.length === 0) return null;
  return {
    userMessage: rows.find((r) => r.role === "user") ?? null,
    aiMessage: rows.find((r) => r.role === "assistant") ?? null,
    turnId,
  };
}

export async function processTurn(input: ChatTurnInput): Promise<ChatTurnResult> {
  const { userId, companionId, content, providedTurnId } = input;

  if (!content?.trim()) {
    return { error: "Message content is required", userMessage: null, aiMessage: null, turnId: "" };
  }

  if ([...content.trim()].length > MAX_MESSAGE_CHARS) {
    return {
      error: `Message exceeds ${MAX_MESSAGE_CHARS} character limit`,
      userMessage: null, aiMessage: null, turnId: "", limit: MAX_MESSAGE_CHARS,
    };
  }

  // True idempotency: a retry carrying a turnId that already has a committed turn returns it as-is.
  if (providedTurnId) {
    const existing = await fetchExistingTurn(userId, companionId, providedTurnId);
    if (existing) return existing;
  }

  let turnId = providedTurnId ?? randomUUID();

  for (let attempt = 1; attempt <= MAX_TURN_RETRIES; attempt++) {
    try {
      return await executeTurn(input, turnId);
    } catch (err) {
      const isUniqueViolation =
        err instanceof Error &&
        (err.message?.includes("unique") || err.message?.includes("duplicate") || err.message?.includes("uq_turn_id_role"));

      if (!isUniqueViolation) throw err;

      // A concurrent duplicate of the SAME client-provided turnId committed first — return that
      // existing turn (idempotent) instead of minting a second one.
      if (turnId === providedTurnId) {
        const existing = await fetchExistingTurn(userId, companionId, providedTurnId);
        if (existing) return existing;
      }

      if (attempt < MAX_TURN_RETRIES) {
        logger.warn({ turnId, attempt }, "Turn ID collision — retrying with new ID");
        turnId = randomUUID();
        continue;
      }
      throw new Error("Turn processing failed after max retries");
    }
  }

  throw new Error("Turn processing failed after max retries");
}
