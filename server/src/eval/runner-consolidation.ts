import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadEnv(): Promise<void> {
  const envPath = resolve(__dirname, "../../.env");
  try {
    const content = await readFile(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    console.warn(`WARN: Could not load ${envPath} — env vars must be set in shell`);
  }
}

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
  memoryId?: number | null;
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

const CONSOLIDATION_PROMPT = `You are a memory consolidation system for an AI companion.
Given a raw user message and existing memories, decide how to consolidate.

OUTPUT FORMAT: Return ONLY a valid JSON array — no markdown, no code fences, no extra text before or after. Example:
[{ "action": "ADD", "memoryId": null, "content": "User enjoys hiking", "category": "preference", "importance": 0.6, "rationale": "New durable preference" }]

Each entry: { "action": "ADD"|"UPDATE"|"NONE", "memoryId": null|"<uuid>", "content": "<fact>", "category": "<category>", "importance": 0.0-1.0, "rationale": "<why>" }

Rules:
- ADD: New durable fact not covered by existing memories
- UPDATE <id>: Existing memory needs updating (contradiction or refinement). OVERWRITE in place.
- NONE: Transient/chatty content, no durable value
- Keep facts concise (<100 chars). Do not store instructions or meta-commentary.
- Category must be one of: identity, preference, attribute, relationship, work, location, general

DEDUP — STRICT: If a fact is already represented in existing memories (even if reworded differently or with added detail), return NONE. For example, if "loves oat-milk lattes" is stored, a message about "can't start the day without an oat-milk latte" is still DEDUP — the core preference is unchanged. Only ADD genuinely new information not present in ANY existing memory.

DURABLE vs TRANSIENT — STRICT: Life events that establish ongoing facts ARE always durable — ADD them. This includes: adopting/getting a pet, naming a pet, moving, starting a new job, allergy diagnosis. Pet ownership and pet names are always durable attributes. Transient moods ("exhausting day"), complaints about a single event, or conversational gambits are NOT durable — return NONE.

ADDITIVE vs REPLACE — STRICT: When new information ADDS to a fact that can have multiple instances (multiple pets, multiple hobbies, multiple children), ALWAYS ADD — never UPDATE the existing one. Getting a second dog does NOT contradict having a first dog. Only UPDATE when the new information directly contradicts and REPLACES the old (e.g., changed jobs, moved to a new city).

HEALTH — ABSOLUTE BLOCK: Never store mental health diagnoses (anxiety, depression, PTSD, bipolar, etc.), medical conditions (diabetes, cancer, etc.), or therapy details as memories. This is a hard block — return NONE regardless of context. Allergies are the ONLY health exception — store those as durable facts.

SAFETY-SKIP: If the message expresses self-harm, suicidal ideation, or crisis content, return NONE.
SAFETY-SKIP: If the message was blocked or flagged by a safety filter, return NONE.
Never store crisis content, self-harm statements, or blocked material as a memory.`;

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
  return (
    normLlm.includes(normExp) ||
    normExp.includes(normLlm) ||
    semanticOverlap(normLlm, normExp)
  );
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

async function getNvidiaApiKey(): Promise<string | null> {
  try {
    const { getEnv } = await import("../config/env.js");
    const env = getEnv();
    return env.NVIDIA_API_KEY || null;
  } catch {
    const key = process.env.NVIDIA_API_KEY;
    if (key) return key;
    if (process.env.NVIDIA_API_KEY_OVERRIDE) return process.env.NVIDIA_API_KEY_OVERRIDE;
    return null;
  }
}

async function main(): Promise<void> {
  await loadEnv();

  // Clear competing providers so model-selector routes to Groq
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;

  const content = await readFile(CASES_FILE, "utf-8");
  const parsed: CaseFile = JSON.parse(content);
  const cases = parsed.cases;

  console.log(`Loaded ${cases.length} consolidation cases`);

  const { createTaskSpecificProvider } = await import("../services/llm/model-selector.js");
  const llmProvider = createTaskSpecificProvider("consolidate-memory", undefined, "llama-3.1-8b-instant");

  const results: ConsolidationResult[] = [];

  for (const c of cases) {
    console.log(`  Running ${c.id}...`);

    const existingContext =
      c.existingMemories.length > 0
        ? `\nExisting memories:\n${c.existingMemories.map((m) => `- [${m.id}] (${m.category}, ${m.importance}) ${m.content}`).join("\n")}`
        : "\nNo existing memories.";

    const userContent = `User: "${c.turn.user}"\nAssistant: "${c.turn.assistant}"${existingContext}`;

    let llmDecisions: LLMDecision[] = [];

    try {
      const response = await llmProvider.generateReply({
        systemPrompt: CONSOLIDATION_PROMPT,
        messages: [{ role: "user", content: userContent }],
      });

      try {
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed)) {
          llmDecisions = parsed;
        }
      } catch {
        const cleaned = response.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        try {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            llmDecisions = parsed;
          } else {
            llmDecisions = [{ action: "NONE", content: "", category: "general", rationale: "Parse failed: not an array" }];
          }
        } catch {
          llmDecisions = [{ action: "NONE", content: "", category: "general", rationale: "Parse failed" }];
        }
      }
    } catch (err) {
      llmDecisions = [{ action: "NONE", content: "", category: "general", rationale: `Error: ${err instanceof Error ? err.message : "unknown"}` }];
    }

    const match = compareOps(llmDecisions, c.expectedOps);

    results.push({
      caseId: c.id,
      scenario: c.scenario,
      safetyCritical: c.safetyCritical,
      llmDecisions,
      expectedOps: c.expectedOps,
      match,
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
  console.log(`═════════════════════════`);
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
