import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CONSOLIDATION_PROMPT } from "../services/memory/consolidation-prompt.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_FILE = resolve(__dirname, "../../eval/cases/consolidation/consolidation.json");
const REPORTS_DIR = resolve(__dirname, "../../eval/reports");

interface ExistingMemory {
  id: number;
  category: string;
  importance: number;
  content: string;
}

interface ExpectedOp {
  op: "ADD" | "UPDATE" | "NONE";
  id?: number;
  content?: string;
  category?: string;
  highSalience?: boolean;
}

interface ConsolidationCase {
  id: string;
  scenario: string;
  turn: { user: string; assistant: string };
  existingMemories: ExistingMemory[];
  expectedOps: ExpectedOp[];
  safetyCritical?: boolean;
  note?: string;
}

interface CaseFile {
  callType: string;
  description: string;
  safetyReview: string;
  cases: ConsolidationCase[];
}

interface LLMDecision {
  action: "ADD" | "UPDATE" | "NONE";
  memoryId?: number | string | null;
  content?: string;
  category?: string;
  importance?: number;
  rationale?: string;
}

interface ConsolidationResult {
  caseId: string;
  scenario: string;
  safetyCritical?: boolean;
  llmDecisions: LLMDecision[];
  expectedOps: ExpectedOp[];
  match: boolean;
  note?: string;
}

async function getGroqApiKey(): Promise<string | null> {
  try {
    const { getEnv } = await import("../config/env.js");
    const env = getEnv();
    return env.GROQ_API_KEY || null;
  } catch {
    const key = process.env.GROQ_API_KEY;
    if (key) return key;
    if (process.env.GROQ_API_KEY_OVERRIDE) return process.env.GROQ_API_KEY_OVERRIDE;
    return null;
  }
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function stem(word: string): string {
  return word.replace(/(ing|ed|ly|es|s|tion|ic|al|ies)$/, "").replace(/ie$/, "y");
}

function semanticOverlap(a: string, b: string): boolean {
  const wordsA = a.split(/\s+/).filter((w) => w.length > 2).map(stem);
  const wordsB = b.split(/\s+/).filter((w) => w.length > 2).map(stem);
  if (wordsA.length === 0 || wordsB.length === 0) return false;
  const intersection = wordsA.filter((w) => wordsB.includes(w));
  return intersection.length >= Math.min(wordsA.length, wordsB.length) * 0.5;
}

function contentMatches(llm: string, expected: string): boolean {
  const normLlm = normalizeForComparison(llm);
  const normExp = normalizeForComparison(expected);
  return normLlm.includes(normExp) || normExp.includes(normLlm) || semanticOverlap(normLlm, normExp);
}

function opsMatch(llmDecision: LLMDecision, expected: ExpectedOp): boolean {
  if (llmDecision.action !== expected.op) return false;
  if (expected.op === "NONE") return true;
  if (expected.op === "ADD") {
    if (!expected.content || !llmDecision.content) return false;
    return contentMatches(llmDecision.content, expected.content);
  }
  if (expected.op === "UPDATE") {
    if (expected.id && Number(llmDecision.memoryId) !== expected.id) return false;
    if (expected.content && llmDecision.content) {
      return contentMatches(llmDecision.content, expected.content);
    }
    return true;
  }
  return false;
}

function compareOps(llmDecisions: LLMDecision[], expectedOps: ExpectedOp[]): boolean {
  if (expectedOps.length === 0) {
    return llmDecisions.length === 0 || llmDecisions.every((d) => d.action === "NONE");
  }
  if (llmDecisions.length === 0 && expectedOps.length > 0) return false;

  const nonNoneExpected = expectedOps.filter((e) => e.op !== "NONE");
  const nonNoneLlm = llmDecisions.filter((d) => d.action !== "NONE");
  if (nonNoneExpected.length !== nonNoneLlm.length) return false;

  for (const expected of nonNoneExpected) {
    const found = nonNoneLlm.some((llm) => opsMatch(llm, expected));
    if (!found) return false;
  }
  return true;
}

function parseDecisions(response: string): LLMDecision[] {
  try {
    const parsed = JSON.parse(response);
    if (Array.isArray(parsed)) return parsed;
    return [{ action: "NONE", content: "", category: "general", rationale: "Parse failed: not an array" }];
  } catch {
    const cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
      return [{ action: "NONE", content: "", category: "general", rationale: "Parse failed: not an array" }];
    } catch {
      return [{ action: "NONE", content: "", category: "general", rationale: "Parse failed" }];
    }
  }
}

async function main(): Promise<void> {
  const apiKey = await getGroqApiKey();
  const content = await readFile(CASES_FILE, "utf-8");
  const parsed: CaseFile = JSON.parse(content);
  const cases = parsed.cases;

  console.log(`Loaded ${cases.length} consolidation cases`);

  if (!apiKey) {
    console.warn("\nWARNING: GROQ_API_KEY not available — consolidation eval requires an API key to invoke the LLM.\n");
    const report = {
      timestamp: new Date().toISOString(),
      status: "BLOCKED",
      message: "GROQ_API_KEY is not set. Set GROQ_API_KEY in the environment and re-run.",
      totalCases: cases.length,
      apiKeyAvailable: false,
      results: cases.map((c) => ({
        caseId: c.id,
        scenario: c.scenario,
        safetyCritical: c.safetyCritical,
        error: "GROQ_API_KEY not configured",
        note: c.note,
      })),
    };
    await mkdir(REPORTS_DIR, { recursive: true });
    const reportFile = resolve(REPORTS_DIR, `consolidation-${Date.now()}.json`);
    await writeFile(reportFile, JSON.stringify(report, null, 2), "utf-8");
    console.log(`Report written to ${reportFile}`);
    console.log(`\nTo run: set GROQ_API_KEY and re-run "pnpm eval:consolidation"`);
    return;
  }

  const { createTaskSpecificProvider } = await import("../services/llm/model-selector.js");
  // Match PRODUCTION: consolidation.ts calls getLLMProvider() (the global generate-reply provider
  // = llama-3.3-70b-versatile), not the consolidate-memory task model. Evaluate what actually ships.
  const llmProvider = createTaskSpecificProvider("consolidate-memory", apiKey, "llama-3.3-70b-versatile");

  const results: ConsolidationResult[] = [];

  for (const c of cases) {
    console.log(`  Running ${c.id}...`);
    const existingContext =
      c.existingMemories.length > 0
        ? `\nExisting memories:\n${c.existingMemories.map((m) => `- [${m.id}] (${m.category}, ${m.importance}) ${m.content}`).join("\n")}`
        : "\nNo existing memories.";
    const userContent = `Raw message: "${c.turn.user}"\nAssistant reply: "${c.turn.assistant}"${existingContext}`;

    let llmDecisions: LLMDecision[];
    try {
      const response = await llmProvider.generateReply({
        systemPrompt: CONSOLIDATION_PROMPT,
        messages: [{ role: "user", content: userContent }],
      });
      llmDecisions = parseDecisions(response);
    } catch (err) {
      llmDecisions = [{ action: "NONE", content: "", category: "general", rationale: `Error: ${err instanceof Error ? err.message : "unknown"}` }];
    }

    results.push({
      caseId: c.id,
      scenario: c.scenario,
      safetyCritical: c.safetyCritical,
      llmDecisions,
      expectedOps: c.expectedOps,
      match: compareOps(llmDecisions, c.expectedOps),
      note: c.note,
    });
  }

  const matched = results.filter((r) => r.match).length;
  const mismatched = results.filter((r) => !r.match).length;

  const report = {
    timestamp: new Date().toISOString(),
    status: "COMPLETE",
    totalCases: cases.length,
    apiKeyAvailable: true,
    matched,
    mismatched,
    results,
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  const reportFile = resolve(REPORTS_DIR, `consolidation-${Date.now()}.json`);
  await writeFile(reportFile, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\nConsolidation Eval Report`);
  console.log(`=========================`);
  console.log(`Total:   ${report.totalCases}`);
  console.log(`Matched: ${report.matched}`);
  console.log(`Failed:  ${report.mismatched}`);
  if (mismatched > 0) {
    console.log(`\nMismatches:`);
    for (const r of results.filter((r) => !r.match)) {
      console.log(`  ${r.caseId} (${r.scenario}): got=${JSON.stringify(r.llmDecisions)} expected=${JSON.stringify(r.expectedOps)}`);
    }
  }
  console.log(`\nReport written to ${reportFile}`);
}

main().catch((err) => {
  console.error("Consolidation eval runner failed:", err);
  process.exit(1);
});
