import { randomUUID } from "crypto";
import { eq, and, asc, ne } from "drizzle-orm";
import {
  db, messagesTable, companionsTable,
} from "../../db/src/index.js";
import { logger } from "../../lib/logger.js";
import { captureException } from "../../lib/observability.js";
import { incrementMetric } from "../../lib/metrics.js";
import { logSafetyEvent } from "./safety-logging.js";
import { persistMessages } from "./persistence.js";
import { getLLMProvider } from "../llm/index.js";
import { retrieveMemories, enqueueMemoryJob } from "../memory.js";
import { assemblePrompt, GENERATION_FALLBACK_REPLY } from "./prompt-assembler.js";
import { checkFreeTierLimit } from "./free-tier.js";
import { shouldShowBreakReminder } from "./break-reminder.js";
import { autoSuspendIfNeeded } from "../auth/auth.service.js";
import { runL0 } from "../moderation/deterministic.js";
import { runL1 } from "../moderation/prompt-guard.js";
import { runL2Input, runL3Output } from "../moderation/openai-omni.js";
import { adjudicate } from "../moderation/safeguard.js";
import { buildCrisisResponse } from "../moderation/crisis.js";
import { createTaskSpecificProvider } from "../llm/model-selector.js";
import { getEnv } from "../../config/env.js";
import {
  SAFE_FALLBACK_REPLY,
  MEMORY_RETRIEVAL_TOP_N,
  HISTORY_WINDOW,
} from "@aura/shared";
import type { PersonaTraits, PersonaKey } from "@aura/shared";

export type AbortReason =
  | "input_blocked"
  | "input_crisis"
  | "output_blocked"
  | "rate_limited"
  | "free_limit_reached"
  | "internal_error";

export interface ChatSessionCallbacks {
  onToken?: (token: string) => void;
  onComplete: (result: ChatSessionResult) => void;
  onAbort: (reason: AbortReason, detail?: string) => void;
}

export interface ChatSessionParams {
  userId: string;
  companionId: string;
  content: string;
  isPremium: boolean;
  isMinor: boolean;
  sessionStartedAt?: string;
  providedTurnId?: string;
}

export interface ChatSessionResult {
  userMessage: typeof messagesTable.$inferSelect;
  aiMessage: typeof messagesTable.$inferSelect;
  turnId: string;
  crisisResources?: string[];
  breakReminder?: string;
  memoriesUsed: boolean;
}

export class ChatSession {
  readonly turnId: string;
  private aborted = false;

  constructor(private readonly params: ChatSessionParams) {
    this.turnId = params.providedTurnId ?? randomUUID();
  }

  abort(): void {
    this.aborted = true;
  }

  async run(callbacks: ChatSessionCallbacks): Promise<void> {
    const { userId, companionId, content, isPremium, isMinor, sessionStartedAt } = this.params;
    const trimmed = content.trim();
    const turnId = this.turnId;

    try {
      // ── Free-tier gate ─────────────────────────────────────────────
      if (!isPremium) {
        const limitCheck = await checkFreeTierLimit(userId);
        if (!limitCheck.allowed) {
          callbacks.onAbort("free_limit_reached");
          return;
        }
      }

      if (this.aborted) return;

      // ── L0: sync deterministic check ──────────────────────────────
      const l0 = runL0(trimmed);
      if (l0.action === "block") {
        await logSafetyEvent(userId, "input_blocked", { severity: "warning", detail: l0.reason, content: trimmed });
        await autoSuspendIfNeeded(userId);
        callbacks.onAbort("input_blocked", l0.reason ?? undefined);
        return;
      }
      if (l0.action === "crisis") {
        await logSafetyEvent(userId, "crisis_detected", { severity: "critical", detail: l0.reason, content: trimmed });
        await autoSuspendIfNeeded(userId);
        const crisisReply = buildCrisisResponse();
        const { userMessage, aiMessage } = await persistMessages(userId, companionId, turnId, trimmed, crisisReply);
        callbacks.onComplete({ userMessage, aiMessage, turnId, crisisResources: ["988 Suicide & Crisis Lifeline: Call or text 988 (US)"], memoriesUsed: false });
        return;
      }

      if (this.aborted) return;

      // ── L1: blocking prompt-guard ─────────────────────────────────
      const groqKey = getEnv().GROQ_API_KEY;
      let l1Provider: ReturnType<typeof createTaskSpecificProvider> | undefined;
      try { l1Provider = createTaskSpecificProvider("moderate-input", groqKey); } catch { /* skip */ }

      const l1Result = await runL1(trimmed, l1Provider).catch(() => ({ injectionProb: 1, action: "block" as const, error: "L1 failed" }));
      if (l1Result.action === "block") {
        await logSafetyEvent(userId, "injection_detected", { severity: "warning", content: trimmed });
        await autoSuspendIfNeeded(userId);
        callbacks.onAbort("input_blocked", "Injection blocked");
        return;
      }

      if (this.aborted) return;

      // ── L2: fire async, concurrent with generation ────────────────
      const l2Promise = runL2Input(trimmed).catch(() => ({ flagged: false, categories: [] as { category: string; score: number }[], error: "L2 degraded" }));

      // ── Load companion + history + memories (parallel) ─────────────
      const [[companion], history, memories] = await Promise.all([
        db.select().from(companionsTable)
          .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, userId)))
          .limit(1),
        db.select().from(messagesTable)
          .where(and(eq(messagesTable.companionId, companionId), eq(messagesTable.userId, userId), ne(messagesTable.turnId, turnId)))
          .orderBy(asc(messagesTable.createdAt)),
        retrieveMemories(userId, companionId, trimmed, MEMORY_RETRIEVAL_TOP_N),
      ]);

      if (!companion) {
        callbacks.onAbort("internal_error", "Companion not found");
        return;
      }

      const recentHistory = history.slice(-HISTORY_WINDOW * 2).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      const memoryContext = memories.length > 0 ? memories.map((m) => `- ${m.content}`).join("\n") : "";
      const { systemPrompt, messages } = assemblePrompt({
        companionName: companion.name,
        personaKey: (companion.personaKey as PersonaKey) ?? "aurora",
        traits: companion.traits as PersonaTraits,
        memoryBlock: memoryContext || undefined,
        history: recentHistory,
        userMessage: trimmed,
      });

      if (this.aborted) return;

      // ── Generation ────────────────────────────────────────────────
      let replyContent: string;
      try {
        const llm = getLLMProvider();
        replyContent = await llm.generateReply({ systemPrompt, messages: messages.map((m) => ({ role: m.role, content: m.content })) });
        if (!replyContent) replyContent = GENERATION_FALLBACK_REPLY;
      } catch (err) {
        logger.error({ err }, "LLM generation failed");
        replyContent = GENERATION_FALLBACK_REPLY;
      }

      callbacks.onToken?.(replyContent);

      if (this.aborted) return;

      // ── L2 resolve (generation already running above) ─────────────
      const l2Result = await l2Promise;
      const l2Categories = l2Result.categories.map((c) => c.category);

      const criticalCat = l2Result.categories.find((c) => c.category === "sexual/minors");
      if (criticalCat) {
        await logSafetyEvent(userId, "input_blocked", { severity: "critical", content: trimmed });
        await autoSuspendIfNeeded(userId);
        callbacks.onAbort("input_blocked", "Zero-tolerance category");
        return;
      }

      if (l2Result.flagged && l1Result.action === "escalate") {
        let outputGuardProvider: ReturnType<typeof createTaskSpecificProvider> | undefined;
        try { outputGuardProvider = createTaskSpecificProvider("moderate-output", groqKey); } catch { /* skip */ }
        const safeguard = await adjudicate(trimmed, "injection", l2Categories, outputGuardProvider).catch(() => ({ action: "allow" as const }));
        if (safeguard.action === "block") {
          callbacks.onAbort("input_blocked", safeguard.reason);
          return;
        }
      }

      // ── L3: output moderation ─────────────────────────────────────
      const l3Result = await runL3Output(replyContent).catch(() => ({ flagged: true, categories: [], error: "L3 failed" }));
      const outputBlocked = l3Result.flagged;
      if (outputBlocked) {
        await logSafetyEvent(userId, "output_blocked", { severity: "warning", content: replyContent });
        await autoSuspendIfNeeded(userId);
      }
      const finalReply = outputBlocked ? SAFE_FALLBACK_REPLY : replyContent;

      if (this.aborted) return;

      // ── Persist ───────────────────────────────────────────────────
      const msgCount = history.length + 1;
      const { userMessage, aiMessage } = await persistMessages(userId, companionId, turnId, trimmed, finalReply, msgCount);

      // ── Post-commit side-effects ──────────────────────────────────
      if (!outputBlocked) {
        enqueueMemoryJob(userId, companionId, trimmed).catch((err) => logger.error({ err }, "Memory job enqueue failed"));
      }

      const sessionStart = sessionStartedAt
        ? new Date(sessionStartedAt)
        : history.length > 0 ? new Date(history[0].createdAt) : new Date();
      const breakCheck = shouldShowBreakReminder(msgCount, sessionStart, isMinor);

      callbacks.onComplete({
        userMessage,
        aiMessage,
        turnId,
        memoriesUsed: memories.length > 0,
        breakReminder: breakCheck.remind ? breakCheck.reason : undefined,
      });

    } catch (err) {
      logger.error({ err, userId, companionId }, "ChatSession.run() uncaught error");
      captureException(err, { userId, companionId });
      incrementMetric("chat_session.error");
      callbacks.onAbort("internal_error", err instanceof Error ? err.message : "unknown");
    }
  }

}
