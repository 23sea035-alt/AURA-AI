import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractKeywords, jaccardSimilarity } from "../services/memory/keywords.js";
import { MEMORY_RECENCY_HALFLIFE_DAYS, MEMORY_RELEVANCE_FLOOR, MEMORY_SCORE_WEIGHTS, MEMORY_RETRIEVAL_TOP_N } from "@aura/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CASES_FILE = resolve(__dirname, "../../eval/cases/retrieval/retrieval.json");
const REPORTS_DIR = resolve(__dirname, "../../eval/reports");

interface StoredMemory {
  id: string;
  content: string;
  keywords: string[] | null;
  category: string;
  importance: number;
  createdAt: string;
  lastRecalledAt?: string;
}

interface RetrievalCase {
  id: string;
  description: string;
  now: string;
  storedMemories: StoredMemory[];
  query: string;
  expectedTopN: string[];
  note?: string;
}

interface CaseFile {
  callType: string;
  description: string;
  safetyReview: string;
  cases: RetrievalCase[];
}

interface RetrievalResult {
  caseId: string;
  description: string;
  returnedIds: string[];
  expectedIds: string[];
  match: boolean;
  note?: string;
}

function tokenize(text: string): Set<string> {
  const words = text.toLowerCase().split(/\s+/);
  const tokens = new Set<string>();
  const stopWords = new Set([
    "a","an","the","i","you","he","she","it","we","they","me","him","her","us","them",
    "my","your","his","its","our","their","mine","yours","hers","ours","theirs",
    "this","that","these","those","is","am","are","was","were","be","been","being",
    "have","has","had","do","does","did","will","would","shall","should","may","might",
    "can","could","must","need","dare","ought","used","to","of","in","for","on","with",
    "at","by","from","as","into","through","during","before","after","above","below",
    "between","out","off","over","under","again","further","then","once","here","there",
    "when","where","why","how","all","each","every","both","few","more","most","some",
    "any","no","nor","not","only","own","same","so","than","too","very","just",
    "because","but","and","or","if","while","about","up","what","which","who","whom",
    "whose","whether","since","until","although","though","yet","still","else",
    "like","really","actually","basically","literally","quite","well","also",
  ]);
  for (const w of words) {
    const clean = w.replace(/[^a-z0-9']/g, "");
    if (clean.length > 2 && !stopWords.has(clean)) {
      tokens.add(clean);
    }
  }
  return tokens;
}

function scoreMemory(
  queryTokens: Set<string>,
  memory: StoredMemory,
  nowMs: number,
): { eligible: boolean; score: number } {
  let jaccard = 0;
  if (memory.keywords && memory.keywords.length > 0) {
    const memTokens = new Set(memory.keywords);
    jaccard = jaccardSimilarity(queryTokens, memTokens);
  }

  const referenceTime = memory.lastRecalledAt
    ? new Date(memory.lastRecalledAt).getTime()
    : new Date(memory.createdAt).getTime();
  const daysSinceReference = (nowMs - referenceTime) / 86_400_000;
  const recency = Math.pow(2, -daysSinceReference / MEMORY_RECENCY_HALFLIFE_DAYS);

  const eligible = jaccard > MEMORY_RELEVANCE_FLOOR || memory.importance >= 0.85;
  const score =
    jaccard * MEMORY_SCORE_WEIGHTS.jaccard +
    memory.importance * MEMORY_SCORE_WEIGHTS.importance +
    recency * MEMORY_SCORE_WEIGHTS.recency;

  return { eligible, score };
}

function runRetrieval(cases: RetrievalCase[]): RetrievalResult[] {
  const results: RetrievalResult[] = [];

  for (const c of cases) {
    const queryTokens = tokenize(c.query);
    const nowMs = new Date(c.now).getTime();

    interface Scored {
      id: string;
      score: number;
      importance: number;
    }
    const scored: Scored[] = [];

    for (const mem of c.storedMemories) {
      const { eligible, score } = scoreMemory(queryTokens, mem, nowMs);
      if (eligible) {
        scored.push({ id: mem.id, score, importance: mem.importance });
      }
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.importance !== a.importance) return b.importance - a.importance;
      return a.id.localeCompare(b.id);
    });

    const returnedIds = scored.slice(0, MEMORY_RETRIEVAL_TOP_N).map((s) => s.id);
    const match =
      returnedIds.length === c.expectedTopN.length &&
      returnedIds.every((id, i) => id === c.expectedTopN[i]);

    results.push({
      caseId: c.id,
      description: c.description,
      returnedIds,
      expectedIds: c.expectedTopN,
      match,
      note: c.note,
    });
  }

  return results;
}

async function main(): Promise<void> {
  const content = await readFile(CASES_FILE, "utf-8");
  const parsed: CaseFile = JSON.parse(content);
  const cases = parsed.cases;

  console.log(`Loaded ${cases.length} retrieval cases`);

  const results = runRetrieval(cases);
  const matched = results.filter((r) => r.match).length;
  const mismatched = results.filter((r) => !r.match).length;

  const report = {
    timestamp: new Date().toISOString(),
    totalCases: cases.length,
    matched,
    mismatched,
    results,
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  const reportFile = resolve(REPORTS_DIR, `retrieval-${Date.now()}.json`);
  await writeFile(reportFile, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\nRetrieval Eval Report`);
  console.log(`═════════════════════`);
  console.log(`Total:   ${report.totalCases}`);
  console.log(`Matched: ${report.matched}`);
  console.log(`Failed:  ${report.mismatched}`);

  if (mismatched > 0) {
    console.log(`\nMismatches:`);
    for (const r of results.filter((r) => !r.match)) {
      console.log(`  ${r.caseId}: got=${JSON.stringify(r.returnedIds)} expected=${JSON.stringify(r.expectedIds)}`);
    }
  }

  console.log(`\nReport written to ${reportFile}`);
}

main().catch((err) => {
  console.error("Retrieval eval runner failed:", err);
  process.exit(1);
});
