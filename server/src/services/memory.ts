import { db, memoriesTable, memoryJobsTable, type DbOrTx } from "../db/src/index.js";
import { and, eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { extractKeywords } from "./memory/keywords.js";
import { scoreAndRank, type ScorableMemory } from "./memory/scorer.js";

const FACT_PATTERNS = [
  { regex: /I (?:am|feel|like|love|hate|enjoy|prefer|want|need|have|don't like|can't stand)\s+(.+?)(?:\.|,|!|\?|$)/i, category: "preference" },
  { regex: /my (\w+) (?:is|are)\s+(.+?)(?:\.|,|!|\?|$)/i, category: "attribute" },
  { regex: /I have (?:a|an) (\w+) named\s+(.+?)(?:\.|,|!|\?|$)/i, category: "relationship" },
  { regex: /I (?:work|study|volunteer) (?:at|for)\s+(.+?)(?:\.|,|!|\?|$)/i, category: "work" },
  { regex: /I (?:'m from|am from|live in|was born in)\s+(.+?)(?:\.|,|!|\?|$)/i, category: "location" },
  { regex: /my name (?:is|'s)\s+(.+?)(?:\.|,|!|\?|$)/i, category: "identity" },
];

export function extractFacts(userMessage: string): Array<{ content: string; category: string; importance: number }> {
  const facts: Array<{ content: string; category: string; importance: number }> = [];
  for (const { regex, category } of FACT_PATTERNS) {
    const match = regex.exec(userMessage);
    if (match && match[1]) {
      const factContent = match[1].trim();
      if (factContent.length > 3 && factContent.length < 200) {
        facts.push({
          content: factContent,
          category,
          importance: category === "identity" || category === "relationship" ? 0.9 : 0.6,
        });
      }
    }
  }
  return facts;
}

export async function storeMemory(
  userId: string,
  companionId: string,
  content: string,
  category: string,
  importance: number,
  sourceMessageId?: string,
): Promise<void> {
  try {
    const keywords = extractKeywords(content);
    await db.insert(memoriesTable).values({
      userId,
      companionId,
      content,
      category,
      importance,
      keywords,
      sourceMessageId: sourceMessageId ?? null,
    });
    logger.info({ userId, companionId, category }, "Memory stored");
  } catch (err) {
    logger.error({ err }, "Failed to store memory");
  }
}

export async function enqueueMemoryJob(
  userId: string,
  companionId: string,
  userMessage: string,
  assistantReply?: string,
  tx?: DbOrTx,
): Promise<string | null> {
  const client = tx ?? db;
  // Include the companion's reply as context so the consolidation LLM can resolve references
  // (e.g. "yeah, that one") — matches the consolidation eval's input shape.
  const rawContent = assistantReply
    ? `Raw message: "${userMessage}"\nAssistant reply: "${assistantReply}"`
    : userMessage;
  try {
    const [job] = await client.insert(memoryJobsTable).values({ userId, companionId, rawContent }).returning();
    logger.info({ jobId: job.id }, "Memory consolidation job enqueued");
    return job.id;
  } catch (err) {
    logger.error({ err }, "Failed to enqueue memory job");
    return null;
  }
}

export async function retrieveMemories(
  userId: string,
  companionId: string,
  query: string,
  limit = 5,
): Promise<Array<{ content: string; importance: number; category: string }>> {
  try {
    const queryTokens = new Set(extractKeywords(query));

    const allMemories = await db
      .select()
      .from(memoriesTable)
      .where(
        and(
          eq(memoriesTable.userId, userId),
          eq(memoriesTable.companionId, companionId),
        )
      )
      // Safety bound only — the write path caps memories at 50 per (user, companion).
      // Deliberately NOT ordered by importance (that importance-first cut was the retrieval
      // blind-spot); eligibility + ranking happen in scoreAndRank below.
      .limit(200);

    const scorable: ScorableMemory[] = allMemories.map((m) => ({
      id: m.id,
      content: m.content,
      keywords: m.keywords,
      category: m.category,
      importance: m.importance,
      createdAt: m.createdAt,
      lastRecalledAt: m.lastRecalledAt,
    }));

    const top = scoreAndRank(scorable, queryTokens, Date.now(), limit);

    if (top.length > 0) {
      const recalledAt = new Date();
      for (const t of top) {
        await db.update(memoriesTable)
          .set({ lastRecalledAt: recalledAt })
          .where(eq(memoriesTable.id, t.id));
      }
    }

    return top.map((t) => ({ content: t.content, importance: t.importance, category: t.category }));
  } catch (err) {
    logger.error({ err }, "Failed to retrieve memories");
    return [];
  }
}
