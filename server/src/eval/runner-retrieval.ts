import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MEMORY_RETRIEVAL_TOP_N } from "@aura/shared";
import { extractKeywords } from "../services/memory/keywords.js";
import { scoreAndRank, type ScorableMemory } from "../services/memory/scorer.js";

// Deterministic retrieval eval. NO LLM judge and NO API key required — it drives the pure
// scoreAndRank() with each case's pinned clock and asserts the returned id order exactly.

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_FILE = resolve(__dirname, "../../eval/cases/retrieval/retrieval.json");
const REPORTS_DIR = resolve(__dirname, "../../eval/reports");

interface StoredMemoryFixture {
  id: string;
  content: string;
  keywords: string[] | null;
  category: string;
  importance: number;
  createdAt?: string;
  lastRecalledAt?: string;
}

interface RetrievalCase {
  id: string;
  description?: string;
  now: string;
  storedMemories: StoredMemoryFixture[];
  query: string;
  expectedTopN: string[];
  note?: string;
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function main(): Promise<void> {
  const raw = await readFile(CASES_FILE, "utf-8");
  const parsed = JSON.parse(raw) as { cases: RetrievalCase[] };
  const cases = parsed.cases;
  console.log(`Loaded ${cases.length} retrieval cases`);

  const results = cases.map((c) => {
    const queryTokens = new Set(extractKeywords(c.query));
    const now = new Date(c.now).getTime();
    const memories: ScorableMemory[] = c.storedMemories.map((m) => ({
      id: m.id,
      content: m.content,
      keywords: m.keywords,
      category: m.category,
      importance: m.importance,
      createdAt: m.createdAt ? new Date(m.createdAt) : null,
      lastRecalledAt: m.lastRecalledAt ? new Date(m.lastRecalledAt) : null,
    }));

    const ranked = scoreAndRank(memories, queryTokens, now, MEMORY_RETRIEVAL_TOP_N);
    const actual = ranked.map((r) => r.id);
    const pass = arraysEqual(actual, c.expectedTopN);

    console.log(
      pass
        ? `  ✓ ${c.id}`
        : `  ✗ ${c.id}: expected [${c.expectedTopN.join(", ")}] got [${actual.join(", ")}]`,
    );

    return {
      caseId: c.id,
      query: c.query,
      expected: c.expectedTopN,
      actual,
      scores: ranked.map((r) => ({
        id: r.id,
        jaccard: Number(r.jaccard.toFixed(4)),
        score: Number(r.score.toFixed(4)),
      })),
      pass,
    };
  });

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  const report = {
    timestamp: new Date().toISOString(),
    status: "COMPLETE",
    totalCases: cases.length,
    results,
    summary: { passed, failed },
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  const reportFile = resolve(REPORTS_DIR, `retrieval-${Date.now()}.json`);
  await writeFile(reportFile, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nReport written to ${reportFile}`);
  console.log(`Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    console.error(`\n❌ Retrieval gate failed: ${failed} failed.`);
    process.exit(1);
  }
  console.log("\n✅ Retrieval gate passed.");
}

main().catch((err) => {
  console.error("Retrieval eval crashed:", err);
  process.exit(1);
});
