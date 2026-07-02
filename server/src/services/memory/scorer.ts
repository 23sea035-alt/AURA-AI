import {
  MEMORY_SCORE_WEIGHTS,
  MEMORY_RECENCY_HALFLIFE_DAYS,
  MEMORY_RELEVANCE_FLOOR,
  MEMORY_IDENTITY_BAR,
} from "@aura/shared";
import { jaccardSimilarity } from "./keywords.js";

const MS_PER_DAY = 86_400_000;

export interface ScorableMemory {
  id: string;
  content: string;
  keywords: string[] | null;
  category: string;
  importance: number;
  createdAt: Date | null;
  lastRecalledAt?: Date | null;
}

export interface RankedMemory extends ScorableMemory {
  jaccard: number;
  score: number;
}

/**
 * Pure, deterministic memory scorer + ranker. Mirrors docs/specs/memory-pipeline.md §3.2–§3.3:
 *  - score   = 0.7·Jaccard + 0.3·importance + 0.15·recency
 *  - recency = exp(-Δdays / halflife)        (base-e, per spec)
 *  - eligible if Jaccard component > FLOOR (0.08)  OR  importance ≥ IDENTITY_BAR (0.85, identity bypass)
 *  - deterministic tie-break: score desc → importance desc → id asc
 *
 * `now` is injected (epoch ms) so production passes Date.now() and eval fixtures pin a fixed clock.
 * This is intentionally DB-free so it can be unit-tested and driven by the retrieval eval runner.
 */
export function scoreAndRank(
  memories: ScorableMemory[],
  queryTokens: Set<string>,
  now: number,
  limit: number,
): RankedMemory[] {
  const scored: RankedMemory[] = memories.map((m) => {
    const jaccard =
      m.keywords && m.keywords.length > 0
        ? jaccardSimilarity(queryTokens, new Set(m.keywords))
        : 0;
    const referenceTime = m.lastRecalledAt ?? m.createdAt;
    const daysSince = referenceTime ? (now - referenceTime.getTime()) / MS_PER_DAY : 0;
    const recency = Math.exp(-daysSince / MEMORY_RECENCY_HALFLIFE_DAYS);
    const score =
      jaccard * MEMORY_SCORE_WEIGHTS.jaccard +
      m.importance * MEMORY_SCORE_WEIGHTS.importance +
      recency * MEMORY_SCORE_WEIGHTS.recency;
    return { ...m, jaccard, score };
  });

  // Eligibility is on the Jaccard COMPONENT (not the blended score), OR the identity bypass —
  // so a high-importance but topically-irrelevant fact is NOT force-fed into the prompt.
  const eligible = scored.filter(
    (s) => s.jaccard > MEMORY_RELEVANCE_FLOOR || s.importance >= MEMORY_IDENTITY_BAR,
  );

  eligible.sort(
    (a, b) =>
      b.score - a.score ||
      b.importance - a.importance ||
      String(a.id).localeCompare(String(b.id)),
  );

  return eligible.slice(0, limit);
}
