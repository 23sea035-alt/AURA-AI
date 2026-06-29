import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createModerator } from "../services/moderation/index.js";
import type { ModerationAction } from "../services/moderation/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = resolve(__dirname, "../../eval/cases/moderation");
const REPORTS_DIR = resolve(__dirname, "../../eval/reports");

interface ModerationCase {
  id: string;
  corpusSet: string;
  category: string | null;
  input: string;
  draftReply?: string;
  expected: {
    action: ModerationAction;
    category: string | null;
    layer: string | null;
  };
  safetyCritical?: boolean;
  note?: string;
  naiveFlagCategory?: string;
}

interface CaseFile {
  callType: string;
  corpusSet: string;
  description: string;
  safetyReview: string;
  cases: ModerationCase[];
}

interface EvalResult {
  caseId: string;
  corpusSet: string;
  category: string | null;
  safetyCritical?: boolean;
  pipelineAction: ModerationAction;
  pipelineLayer: string;
  pipelineCategories: Array<{ category: string; score: number }>;
  expectedAction: ModerationAction;
  expectedCategory: string | null;
  expectedLayer: string | null;
  actionMatch: boolean;
  confusionCell: "TP" | "TN" | "FP" | "FN";
  note?: string;
}

function classifyConfusionCell(pipelineAction: ModerationAction, expectedAction: ModerationAction): "TP" | "TN" | "FP" | "FN" {
  const isBlockOrCrisis = (a: ModerationAction) => a === "block" || a === "crisis";
  const pipelineFlagged = isBlockOrCrisis(pipelineAction);
  const expectedFlagged = isBlockOrCrisis(expectedAction);
  if (pipelineFlagged && expectedFlagged) return "TP";
  if (!pipelineFlagged && !expectedFlagged) return "TN";
  if (pipelineFlagged && !expectedFlagged) return "FP";
  return "FN";
}

async function loadCases(): Promise<ModerationCase[]> {
  const files = (await readdir(CASES_DIR)).filter((f) => f.endsWith(".json"));
  const cases: ModerationCase[] = [];
  for (const file of files) {
    const content = await readFile(resolve(CASES_DIR, file), "utf-8");
    const parsed: CaseFile = JSON.parse(content);
    cases.push(...parsed.cases);
  }
  return cases;
}

function computeConfusionMatrix(results: EvalResult[]): Record<string, { TP: number; TN: number; FP: number; FN: number }> {
  const matrix: Record<string, { TP: number; TN: number; FP: number; FN: number }> = { __overall__: { TP: 0, TN: 0, FP: 0, FN: 0 } };
  for (const r of results) {
    const cat = r.expectedCategory ?? "__unflagged__";
    if (!matrix[cat]) matrix[cat] = { TP: 0, TN: 0, FP: 0, FN: 0 };
    matrix[cat][r.confusionCell]++;
    matrix.__overall__[r.confusionCell]++;
  }
  return matrix;
}

function precision(tp: number, fp: number): number {
  return tp + fp === 0 ? 1 : tp / (tp + fp);
}

function recall(tp: number, fn: number): number {
  return tp + fn === 0 ? 1 : tp / (tp + fn);
}

async function main(): Promise<void> {
  const cases = await loadCases();
  console.log(`Loaded ${cases.length} moderation cases`);

  const moderator = createModerator();
  const results: EvalResult[] = [];

  for (const c of cases) {
    const isOutputSide = c.draftReply !== undefined;
    const verdict = isOutputSide
      ? await moderator.screenOutput(c.draftReply!)
      : await moderator.screenInput(c.input, { userId: "eval", isMinor: false });
    const actionMatch = verdict.action === c.expected.action;
    const confusionCell = classifyConfusionCell(verdict.action, c.expected.action);

    results.push({
      caseId: c.id,
      corpusSet: c.corpusSet,
      category: c.category,
      safetyCritical: c.safetyCritical,
      pipelineAction: verdict.action,
      pipelineLayer: verdict.layer,
      pipelineCategories: verdict.categories,
      expectedAction: c.expected.action,
      expectedCategory: c.expected.category,
      expectedLayer: c.expected.layer,
      actionMatch,
      confusionCell,
      note: c.note,
    });
  }

  const matrix = computeConfusionMatrix(results);
  const mismatches = results.filter((r) => !r.actionMatch);

  const report = {
    timestamp: new Date().toISOString(),
    totalCases: cases.length,
    matched: results.filter((r) => r.actionMatch).length,
    mismatched: mismatches.length,
    confusionMatrix: Object.fromEntries(
      Object.entries(matrix).map(([cat, counts]) => [
        cat,
        { ...counts, precision: precision(counts.TP, counts.FP), recall: recall(counts.TP, counts.FN) },
      ])
    ),
    mismatches: mismatches.map((r) => ({
      caseId: r.caseId,
      corpusSet: r.corpusSet,
      category: r.category,
      safetyCritical: r.safetyCritical,
      pipelineAction: r.pipelineAction,
      pipelineLayer: r.pipelineLayer,
      pipelineCategories: r.pipelineCategories,
      expectedAction: r.expectedAction,
      expectedCategory: r.expectedCategory,
      expectedLayer: r.expectedLayer,
      confusionCell: r.confusionCell,
      note: r.note,
    })),
  };

  await mkdir(REPORTS_DIR, { recursive: true });
  const reportFile = resolve(REPORTS_DIR, `moderation-${Date.now()}.json`);
  await writeFile(reportFile, JSON.stringify(report, null, 2), "utf-8");

  // Print summary
  console.log(`\nModeration Eval Report`);
  console.log(`════════════════════`);
  console.log(`Total:  ${report.totalCases}`);
  console.log(`Match:  ${report.matched}`);
  console.log(`Mismatch: ${report.mismatched}`);
  console.log(`\nConfusion Matrix:`);
  for (const [cat, counts] of Object.entries(report.confusionMatrix)) {
    console.log(`  ${cat}:  TP=${counts.TP}  TN=${counts.TN}  FP=${counts.FP}  FN=${counts.FN}  P=${(counts.precision * 100).toFixed(1)}%  R=${(counts.recall * 100).toFixed(1)}%`);
  }
  if (mismatches.length > 0) {
    console.log(`\nMismatches (${mismatches.length}):`);
    for (const m of mismatches) {
      const safety = m.safetyCritical ? " ⚠" : "";
      console.log(`  ${m.caseId}: pipeline=${m.pipelineAction}(${m.pipelineLayer}) expected=${m.expectedAction}(${m.expectedLayer}) ${m.confusionCell}${safety}`);
    }
  }
  console.log(`\nReport written to ${reportFile}`);

  // SAFETY GATE: a missed safety-critical case (FN — pipeline allowed something it must have
  // blocked/escalated) fails the run, so an eval can actually PROTECT against an unsafe regression
  // rather than merely measuring it (spec: safety-critical FN = 0).
  const safetyFailures = mismatches.filter((m) => m.safetyCritical && m.confusionCell === "FN");
  if (safetyFailures.length > 0) {
    console.error(`\n❌ SAFETY GATE FAILED: ${safetyFailures.length} safety-critical false negative(s):`);
    for (const f of safetyFailures) {
      console.error(`   ${f.caseId} (${f.category}): pipeline=${f.pipelineAction} expected=${f.expectedAction}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`\n✅ Safety gate passed: 0 safety-critical false negatives.`);
  }
}

main().catch((err) => {
  console.error("Eval runner failed:", err);
  process.exit(1);
});
