import { db, memoriesTable, memoryJobsTable } from "../../db/src/index.js";
import { eq, and } from "drizzle-orm";
import { getLLMProvider } from "../llm/index.js";
import { logger } from "../../lib/logger.js";
import { extractKeywords } from "./keywords.js";
import { isCrisisContent } from "../moderation/deterministic.js";
import { CATEGORIES, CONSOLIDATION_PROMPT } from "./consolidation-prompt.js";
import { refreshRemember } from "./remember.js";
import { enqueueBackground } from "../chat/turn-queue.js";

interface ConsolidationDecision {
  action: "ADD" | "UPDATE" | "NONE";
  memoryId?: string | null;
  content: string;
  category: string;
  importance: number;
  rationale: string;
}

// Extra crisis phrases beyond the shared L0 detector. The skip fires on isCrisisContent() (the
// single L0 source of truth — so consolidation is never narrower than L0) OR these broader phrases.
const EXTRA_CRISIS_PATTERNS = /\b(can'?t keep going|don'?t think I can|ending it all)\b/i;
const MAX_CONSOLIDATION_ATTEMPTS = 3;

export async function consolidateMemory(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(memoryJobsTable)
    .where(eq(memoryJobsTable.id, jobId))
    .limit(1);

  // Accept jobs claimed by the worker (status 'processing') as well as raw 'pending'.
  if (!job || (job.status !== "pending" && job.status !== "processing")) return;

  // Safety pre-check: skip crisis/self-harm content (shared L0 detector + broader extras).
  if (isCrisisContent(job.rawContent) || EXTRA_CRISIS_PATTERNS.test(job.rawContent)) {
    await db.update(memoryJobsTable)
      .set({ status: "processed", safetySkipped: true, result: JSON.stringify([{ action: "NONE", memoryId: null, content: "", category: "general", importance: 0, rationale: "Safety-skip: crisis content" }]), processedAt: new Date() })
      .where(eq(memoryJobsTable.id, jobId));
    logger.info({ jobId }, "Memory consolidation skipped — crisis content");
    return;
  }

  try {
    const existingMemories = await db
      .select()
      .from(memoriesTable)
      .where(and(eq(memoriesTable.userId, job.userId), eq(memoriesTable.companionId, job.companionId)))
      .limit(20);

    const llm = getLLMProvider();
    const existingContext = existingMemories.length > 0
      ? `\nExisting memories:\n${existingMemories.map(m => `- [${m.id}] (${m.category}, ${m.importance}) ${m.content}`).join("\n")}`
      : "\nNo existing memories.";

    // Datamark the raw user message: it is untrusted data to extract facts from, never instructions
    // to follow (it flows into a future system prompt via stored memories — an injection surface).
    // Runs on the background lane so it yields the shared Groq 70B budget to live replies under load.
    const response = await enqueueBackground(() => llm.generateReply({
      systemPrompt: CONSOLIDATION_PROMPT,
      messages: [{ role: "user", content: `<<RAW_MESSAGE data-only>>\n${job.rawContent}\n<</RAW_MESSAGE>>${existingContext}` }],
    }));

    let decisions: ConsolidationDecision[];
    try {
      decisions = JSON.parse(response);
      if (!Array.isArray(decisions)) throw new Error("Not an array");
    } catch (err) {
      logger.error({ err, jobId: job.id }, "LLM consolidation parse failed, using keyword fallback");
      const keywords = extractKeywords(job.rawContent);
      decisions = keywords.length > 0
        ? [{ action: "ADD", memoryId: null, content: keywords.slice(0, 3).join(", "), category: "general", importance: 0.5, rationale: "Keyword fallback" }]
        : [{ action: "NONE", memoryId: null, content: "", category: "general", importance: 0, rationale: "No extractable content" }];
    }

    for (const decision of decisions) {
      if (decision.action === "ADD") {
        await db.insert(memoriesTable).values({
          userId: job.userId,
          companionId: job.companionId,
          content: decision.content.slice(0, 200),
          category: CATEGORIES.includes(decision.category) ? decision.category : "general",
          importance: Math.min(1, Math.max(0, decision.importance)),
          keywords: extractKeywords(decision.content),
        });
      } else if (decision.action === "UPDATE" && decision.memoryId) {
        // Scope the write by the job's owner as well as the id: never trust an LLM-returned id
        // alone (defense-in-depth against a hallucinated/injected foreign memory id).
        await db.update(memoriesTable)
          .set({
            content: decision.content.slice(0, 200),
            category: CATEGORIES.includes(decision.category) ? decision.category : "general",
            importance: Math.min(1, Math.max(0, decision.importance)),
            keywords: extractKeywords(decision.content),
            updatedAt: new Date(),
          })
          .where(and(
            eq(memoriesTable.id, decision.memoryId),
            eq(memoriesTable.userId, job.userId),
            eq(memoriesTable.companionId, job.companionId),
          ));
      }
    }

    await db.update(memoryJobsTable)
      .set({ status: "processed", result: JSON.stringify(decisions), processedAt: new Date() })
      .where(eq(memoryJobsTable.id, jobId));

    logger.info({ jobId, decisions: decisions.length }, "Memory consolidated");

    // Refresh the Home "remembers" card cache when something durable changed. Best-effort: the job is
    // already 'processed', so a question-gen hiccup must never re-queue or fail it.
    const changed = decisions.some(d => d.action === "ADD" || d.action === "UPDATE");
    if (changed) {
      try {
        await refreshRemember(job.userId, job.companionId);
      } catch (rememberErr) {
        logger.warn({ err: rememberErr, jobId, companionId: job.companionId }, "Remember refresh failed (non-fatal)");
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    const attempts = (job.attempts ?? 0) + 1;
    const giveUp = attempts >= MAX_CONSOLIDATION_ATTEMPTS;
    // Re-queue (status -> 'pending') for a bounded number of retries; give up after that.
    await db.update(memoryJobsTable)
      .set({
        status: giveUp ? "failed" : "pending",
        attempts,
        error: message,
        processedAt: giveUp ? new Date() : null,
      })
      .where(eq(memoryJobsTable.id, jobId));
    logger.error({ err, jobId, attempts, giveUp }, "Memory consolidation failed");
  }
}
