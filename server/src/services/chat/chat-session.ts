import { randomUUID } from "crypto";
import { eq, and, asc, ne, gte } from "drizzle-orm";
import {
  db, messagesTable, companionsTable, safetyEventsTable,
} from "../../db/src/index.js";
import { logger } from "../../lib/logger.js";
import { captureException } from "../../lib/observability.js";
import { incrementMetric } from "../../lib/metrics.js";
import { logSafetyEvent } from "./safety-logging.js";
import { persistMessages, fetchExistingTurn, isTurnUniqueViolation } from "./persistence.js";
import { maybeSendReplyPush } from "./reply-push.js";
import { getLLMProvider } from "../llm/index.js";
import { retrieveMemories, enqueueMemoryJob } from "../memory.js";
import { assemblePrompt, GENERATION_FALLBACK_REPLY } from "./prompt-assembler.js";
import { createSentenceBuffer } from "./sentence-buffer.js";
import { checkFreeTierLimit } from "./free-tier.js";
import { shouldShowBreakReminder } from "./break-reminder.js";
import { shouldShowAiDisclosure } from "./ai-disclosure.js";
import { buildCrisisResponse, CRISIS_RESOURCES } from "../moderation/crisis.js";
import { createModerator } from "../moderation/moderation-engine.js";
import { runL0 } from "../moderation/deterministic.js";
import {
  SAFE_FALLBACK_REPLY,
  MEMORY_RETRIEVAL_TOP_N,
  HISTORY_WINDOW,
  FLAGGED_USER_WINDOW_DAYS,
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
  /**
   * Called once per approved sentence (already output-moderated). Text is safe to render.
   * `opts.crisis` marks the fixed 988 crisis reply so the voice adapter can speak it in the
   * calm crisis delivery style.
   */
  onToken?: (token: string, opts?: { crisis?: boolean }) => void;
  onComplete: (result: ChatSessionResult) => void;
  /** `opts.terminateSession` = zero-tolerance hit (sexual/minors): after delivering the abort, the
   * adapter should DROP the whole session (close the WS / end the call), not just fail the turn —
   * moderation spec §4. The REST path is stateless and ignores it. */
  onAbort: (reason: AbortReason, detail?: string, opts?: { terminateSession?: boolean }) => void;
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
  aiDisclosure?: boolean;
  memoriesUsed: boolean;
}

// Flagged-user window: a user with a safety event inside this window gets the engine's
// widened escalation band (repeat-offender handling). Mirrors the moderation spec §4.
const FLAGGED_USER_WINDOW_MS = FLAGGED_USER_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Shared execution engine for a single chat turn (text + voice adapters sit on top).
 *
 * Moderation runs through the same `ModerationEngine` as the REST path (fail-closed, full
 * L0–L3 + safeguard parity), and generation is **sentence-gated streaming**: each sentence
 * is output-moderated (L3) *before* it is forwarded to the client, so unsafe content is
 * never transmitted (closes the prior fail-open where the whole reply was sent pre-L3).
 */
export class ChatSession {
  readonly turnId: string;
  private aborted = false;

  constructor(private readonly params: ChatSessionParams) {
    this.turnId = params.providedTurnId ?? randomUUID();
  }

  abort(): void {
    this.aborted = true;
  }

  private async countRecentSafetyEvents(userId: string): Promise<number> {
    const since = new Date(Date.now() - FLAGGED_USER_WINDOW_MS);
    const rows = await db.select({ id: safetyEventsTable.id })
      .from(safetyEventsTable)
      .where(and(eq(safetyEventsTable.userId, userId), gte(safetyEventsTable.createdAt, since)));
    return rows.length;
  }

  /** If this turnId already has a committed (user+assistant) turn, return it for replay. */
  private async fetchReplay(): Promise<ChatSessionResult | null> {
    if (!this.params.providedTurnId) return null;
    const existing = await fetchExistingTurn(this.params.userId, this.params.companionId, this.turnId);
    if (existing?.userMessage && existing?.aiMessage) {
      return { userMessage: existing.userMessage, aiMessage: existing.aiMessage, turnId: this.turnId, memoriesUsed: false };
    }
    return null;
  }

  /**
   * Persist the turn; on a concurrent duplicate (same turnId committed by a racing request
   * between our idempotency check and this write), return the already-committed turn instead.
   */
  private async persistOrReplay(userContent: string, aiContent: string, msgCount?: number):
    Promise<{ persisted: { userMessage: typeof messagesTable.$inferSelect; aiMessage: typeof messagesTable.$inferSelect } } | { replay: ChatSessionResult }> {
    try {
      return { persisted: await persistMessages(this.params.userId, this.params.companionId, this.turnId, userContent, aiContent, msgCount) };
    } catch (err) {
      if (isTurnUniqueViolation(err)) {
        const replay = await this.fetchReplay();
        if (replay) return { replay };
      }
      throw err;
    }
  }

  /**
   * Route a detected crisis: log the safety event, deliver the fixed 988 crisis reply, then
   * complete with crisis resources. Called from TWO sites — the L0 pre-filter that runs
   * BEFORE the free-tier gate (so a rate-limited free user in crisis is never dropped) and the
   * full input-moderation gate (L1/L2/safeguard) for subtler distress. `category`/`reason` come
   * from whichever layer detected the crisis.
   */
  private async handleCrisis(
    callbacks: ChatSessionCallbacks,
    opts: { category?: string; reason?: string; crisisResources?: string[] },
  ): Promise<void> {
    const { userId, companionId } = this.params;
    const trimmed = this.params.content.trim();
    await logSafetyEvent(userId, "crisis_detected", {
      severity: "critical", detail: opts.reason, content: trimmed,
      companionId, category: opts.category,
    });
    const crisisReply = buildCrisisResponse();
    // Deliver the crisis reply itself (text renders it; voice speaks it in the calm style),
    // then complete with the 988 resources.
    callbacks.onToken?.(crisisReply, { crisis: true });
    const persisted = await this.persistOrReplay(trimmed, crisisReply);
    if ("replay" in persisted) { callbacks.onComplete(persisted.replay); return; }
    callbacks.onComplete({
      userMessage: persisted.persisted.userMessage,
      aiMessage: persisted.persisted.aiMessage,
      turnId: this.turnId,
      crisisResources: opts.crisisResources ?? CRISIS_RESOURCES,
      memoriesUsed: false,
    });
  }

  async run(callbacks: ChatSessionCallbacks): Promise<void> {
    const { userId, companionId, content, isPremium, isMinor, sessionStartedAt } = this.params;
    const trimmed = content.trim();
    const turnId = this.turnId;
    const moderator = createModerator();

    try {
      // ── Idempotency: a reconnect/retry carrying a committed turnId returns it (no regeneration) ──
      const replay = await this.fetchReplay();
      if (replay) { callbacks.onComplete(replay); return; }

      // ── Crisis pre-filter (runs BEFORE the free-tier gate) ─────────
      // Safety must never be gated by the paywall. Run the cheap, deterministic L0 crisis
      // detector (local regex, no external call) ahead of the free-tier limit so a rate-limited
      // free user disclosing self-harm is still routed to support instead of being silently
      // dropped with an upgrade prompt. Only explicit L0 crisis language bypasses the cap;
      // subtler distress is still adjudicated by L1/L2/safeguard after the gate.
      const l0Precheck = runL0(trimmed);
      if (l0Precheck.action === "crisis") {
        await this.handleCrisis(callbacks, { category: l0Precheck.category, reason: l0Precheck.reason });
        return;
      }

      // ── Free-tier gate ─────────────────────────────────────────────
      // ORDERING INVARIANT (do not reorder): this cap sits ABOVE all paid work — `screenInput`
      // (OpenAI/Groq moderation) and LLM generation — and BELOW only the idempotency replay and
      // the L0 crisis pre-filter above. That guarantees a rate-limited free user can never reach a
      // paid API call or a generated reply with ANY input; the sole thing that bypasses the cap is
      // an explicit L0 crisis (answered with a fixed, free canned reply). Two ways a refactor
      // breaks it: moving paid moderation/generation ABOVE this gate reopens a budget-drain vector;
      // moving the crisis pre-filter BELOW it silently drops a crisis message behind the paywall
      // (the D-2 bug this ordering fixes).
      if (!isPremium) {
        const limitCheck = await checkFreeTierLimit(userId);
        if (!limitCheck.allowed) {
          callbacks.onAbort("free_limit_reached");
          return;
        }
      }

      if (this.aborted) return;

      // ── Input moderation gate: L0–L2 + safeguard via the shared engine ──
      // (fail-closed; includes self-harm→crisis routing, OR-escalation, and flagged-user
      //  widening — full parity with the REST turn-pipeline.)
      const recentSafetyEvents = await this.countRecentSafetyEvents(userId);
      const inputVerdict = await moderator.screenInput(trimmed, { userId, isMinor, recentSafetyEvents });

      if (inputVerdict.action === "block") {
        const isInjection = inputVerdict.layer.includes("L1")
          || inputVerdict.categories.some((c) => c.category === "injection");
        // Zero-tolerance (sexual/minors, spec §4): severity CRITICAL so it surfaces at the top of
        // the admin review queue, and the session is dropped (not just the turn). The user-facing
        // message stays the generic block — never reveal which boundary tripped.
        const isZeroTolerance = inputVerdict.categories.some((c) => c.category === "sexual/minors");
        await logSafetyEvent(userId, isInjection ? "injection_detected" : "input_blocked", {
          severity: isZeroTolerance ? "critical" : "warning", detail: inputVerdict.reason, content: trimmed,
          companionId, category: inputVerdict.categories[0]?.category,
        });
        // Policy: the violation is logged to `safety_events` (above) for HUMAN review and the user
        // is warned via the block below. We do NOT auto-suspend — suspensions are a manual decision
        // a developer makes after evaluating the logged events (no automated account action).
        callbacks.onAbort("input_blocked", inputVerdict.reason ?? "Blocked",
          isZeroTolerance ? { terminateSession: true } : undefined);
        return;
      }

      if (inputVerdict.action === "crisis") {
        const crisisCategory = inputVerdict.categories.find((c) => c.category.startsWith("self-harm"))?.category;
        await this.handleCrisis(callbacks, {
          category: crisisCategory,
          reason: inputVerdict.reason,
          crisisResources: inputVerdict.crisisResources,
        });
        return;
      }

      if (this.aborted) return;

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
      const genMessages = messages.map((m) => ({ role: m.role, content: m.content }));

      if (this.aborted) return;

      // ── Sentence-gated streaming generation + L3 output moderation ──
      const llm = getLLMProvider();
      const abortController = new AbortController();
      const buffer = createSentenceBuffer();
      let approved = "";
      let outputBlocked = false;
      let blockedDraft = "";
      let blockedCategory: string | undefined;

      // Moderate one completed sentence; forward it only if it clears L3. Returns false
      // (and records the offending sentence) when the sentence must be withheld.
      const gate = async (sentence: string): Promise<boolean> => {
        const verdict = await moderator.screenOutput(sentence);
        if (verdict.action !== "allow") {
          blockedDraft = sentence;
          blockedCategory = verdict.categories[0]?.category;
          return false;
        }
        approved += (approved ? " " : "") + sentence;
        callbacks.onToken?.(sentence + " ");
        return true;
      };

      try {
        if (typeof llm.generateReplyStream === "function") {
          for await (const delta of llm.generateReplyStream({ systemPrompt, messages: genMessages }, abortController.signal)) {
            if (this.aborted) { abortController.abort(); return; }
            for (const sentence of buffer.push(delta)) {
              if (!(await gate(sentence))) { outputBlocked = true; break; }
            }
            if (outputBlocked) { abortController.abort(); break; }
          }
          if (!outputBlocked && !this.aborted) {
            const tail = buffer.flush();
            if (tail && !(await gate(tail))) outputBlocked = true;
          }
        } else {
          // Non-streaming provider (e.g. a fake in tests): generate the whole reply, gate once.
          let reply: string;
          try {
            reply = await llm.generateReply({ systemPrompt, messages: genMessages });
            if (!reply) reply = GENERATION_FALLBACK_REPLY;
          } catch (err) {
            logger.error({ err }, "LLM generation failed");
            reply = GENERATION_FALLBACK_REPLY;
          }
          if (this.aborted) return;
          if (reply === GENERATION_FALLBACK_REPLY) {
            // The canned fallback is safe by construction — skip L3, send as-is.
            approved = reply;
            callbacks.onToken?.(reply);
          } else if (!(await gate(reply))) {
            outputBlocked = true;
          }
        }
      } catch (streamErr) {
        // Generation stream failed (mid-way or before the first token). Degrade to the safe
        // canned line. Any sentences already released are safe (they passed L3) — keep them.
        logger.error({ err: streamErr }, "LLM stream generation failed");
        if (this.aborted) return;
        if (!approved) {
          approved = GENERATION_FALLBACK_REPLY;
          callbacks.onToken?.(GENERATION_FALLBACK_REPLY);
        }
      }

      if (this.aborted) return;

      // ── Resolve final reply + persist ──────────────────────────────
      if (outputBlocked) {
        // A sexual/minors OUTPUT block is the model's fault, not the user's — no session drop, but
        // it IS a critical incident (a jailbreak may be steering the model there): review-queue it.
        await logSafetyEvent(userId, "output_blocked", {
          severity: blockedCategory === "sexual/minors" ? "critical" : "warning",
          content: blockedDraft || approved,
          companionId, category: blockedCategory, source: "output",
        });
      }
      // On an output block we persist the safe approved prefix (what the user already saw); if
      // nothing was approved, the generic safe fallback. Suppress + safe fallback, no oracle.
      const finalReply = (outputBlocked ? (approved.trim() || SAFE_FALLBACK_REPLY) : (approved.trim() || GENERATION_FALLBACK_REPLY));
      const msgCount = history.length + 1;
      const persisted = await this.persistOrReplay(trimmed, finalReply, msgCount);
      if ("replay" in persisted) { callbacks.onComplete(persisted.replay); return; }
      const { userMessage, aiMessage } = persisted.persisted;

      // ── Post-commit side-effects ──────────────────────────────────
      if (!outputBlocked) {
        enqueueMemoryJob(userId, companionId, trimmed, finalReply).catch((err) => logger.error({ err }, "Memory job enqueue failed"));
      }
      // Away-delivery (D10): push only if the user has no live WS connection (e.g. the REST
      // fallback, or a WS client that dropped mid-turn). No-op when they're live on the socket.
      maybeSendReplyPush(userId, companionId, companion.name).catch(() => { /* best-effort */ });

      const sessionStart = sessionStartedAt
        ? new Date(sessionStartedAt)
        : history.length > 0 ? new Date(history[0].createdAt) : new Date();
      const breakCheck = shouldShowBreakReminder(Math.ceil(msgCount / 2), sessionStart, isMinor);

      callbacks.onComplete({
        userMessage,
        aiMessage,
        turnId,
        memoriesUsed: memories.length > 0,
        breakReminder: breakCheck.remind ? breakCheck.reason : undefined,
        aiDisclosure: shouldShowAiDisclosure(Math.ceil(msgCount / 2)) || undefined,
      });

    } catch (err) {
      logger.error({ err, userId, companionId }, "ChatSession.run() uncaught error");
      captureException(err, { userId, companionId });
      incrementMetric("chat_session.error");
      callbacks.onAbort("internal_error", err instanceof Error ? err.message : "unknown");
    }
  }

}
