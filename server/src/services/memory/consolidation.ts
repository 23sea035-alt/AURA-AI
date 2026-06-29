import { db, memoriesTable, memoryJobsTable } from "../../db/src/index.js";
import { eq, and } from "drizzle-orm";
import { getLLMProvider } from "../llm/index.js";
import { logger } from "../../lib/logger.js";
import { extractKeywords } from "./keywords.js";

interface ConsolidationDecision {
  action: "ADD" | "UPDATE" | "NONE";
  memoryId?: string | null;
  content: string;
  category: string;
  importance: number;
  rationale: string;
}

const CATEGORIES = ["identity", "preference", "attribute", "relationship", "work", "location", "general"];

const CONSOLIDATION_PROMPT = `You are a memory consolidation system for an AI companion.
Given a raw user message and existing memories, decide how to consolidate.

Return a JSON array of consolidation decisions:
[{ "action": "ADD"|"UPDATE"|"NONE", "memoryId": null|"<uuid>", "content": "<fact>", "category": "<category>", "importance": 0.0-1.0, "rationale": "<why>" }]

Rules:
- ADD: New durable fact not covered by existing memories
- UPDATE <id>: Existing memory needs updating (contradiction or refinement). OVERWRITE in place.
- NONE: Transient/chatty content, no durable value
- Keep facts concise (<100 chars). Do not store instructions or meta-commentary.
- Category must be one of: ${CATEGORIES.join(", ")}

DEDUP: If a fact is already represented in existing memories (even if reworded differently), do NOT add it again — return NONE. Only ADD genuinely new information not present in any existing memory.

DURABLE vs TRANSIENT: Life events (adopting a pet, moving, starting a new job, allergy diagnosis) ARE durable. Transient moods ("exhausting day"), complaints about a single event, or conversational gambits are NOT durable — return NONE.

ADDITIVE vs REPLACE: If new information adds to an existing fact (e.g., getting a second pet while already having one), ADD a new memory — do not UPDATE the existing one. Only UPDATE when the new information directly contradicts and replaces the old (e.g., changed jobs, moved to a new city).

HEALTH: Never store mental health diagnoses, medical conditions (except allergies), or therapy details as memories. Allergies are the ONLY health exception — store those as durable facts.

SAFETY-SKIP: If the message expresses self-harm, suicidal ideation, or crisis content, return NONE.
SAFETY-SKIP: If the message was blocked or flagged by a safety filter, return NONE.
Never store crisis content, self-harm statements, or blocked material as a memory.`;

const CRISIS_PATTERNS = /\b(kill myself|want to die|end my life|suicide|self-harm|self harm|can'?t keep going|don'?t think I can|ending it all)\b/i;

export async function consolidateMemory(jobId: string): Promise<void> {
  const [job] = await db
    .select()
    .from(memoryJobsTable)
    .where(eq(memoryJobsTable.id, jobId))
    .limit(1);

  if (!job || job.status !== "pending") return;

  // Safety pre-check: skip crisis/self-harm content
  if (CRISIS_PATTERNS.test(job.rawContent)) {
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

    const response = await llm.generateReply({
      systemPrompt: CONSOLIDATION_PROMPT,
      messages: [{ role: "user", content: `Raw message: "${job.rawContent}"${existingContext}` }],
    });

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
        await db.update(memoriesTable)
          .set({
            content: decision.content.slice(0, 200),
            category: CATEGORIES.includes(decision.category) ? decision.category : "general",
            importance: Math.min(1, Math.max(0, decision.importance)),
            keywords: extractKeywords(decision.content),
            updatedAt: new Date(),
          })
          .where(eq(memoriesTable.id, decision.memoryId));
      }
    }

    await db.update(memoryJobsTable)
      .set({ status: "processed", result: JSON.stringify(decisions), processedAt: new Date() })
      .where(eq(memoryJobsTable.id, jobId));

    logger.info({ jobId, decisions: decisions.length }, "Memory consolidated");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown";
    await db.update(memoryJobsTable)
      .set({ status: "failed", error: message, processedAt: new Date() })
      .where(eq(memoryJobsTable.id, jobId));
    logger.error({ err, jobId }, "Memory consolidation failed");
  }
}
