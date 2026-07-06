// Persona-probe eval — two questions, one harness, driving the REAL prompt path:
//   1. DISTINCTNESS: are the 12 packs (3 anchors + 9 gallery) tellable apart? (blind re-match)
//   2. TUNE-STEP DELTA: does each single-axis grid step visibly change one companion's output?
//
// Both build prompts via the live assemblePrompt() + PERSONA_PACKS + GRID_CONTRACTS, so a green
// result reflects what ships, not a mock. Reports -> server/eval/reports/persona-probe*.md.
//
// Resumable against the Groq free-tier rate limit: every generated cell is cached to disk by key, so
// a re-run only regenerates what's missing or errored (never re-runs cells we know worked). Modes:
//   npm run eval:persona                 -> RESUME: generate only missing/errored cells (default)
//   npm run eval:persona -- --rerun-failed -> only re-run cells currently cached as errors
//   npm run eval:persona -- --all         -> FORCE: clear the cache and regenerate everything
// (Pattern ported from ../ai-humanizer-app tools/run_production_chained_full_cohort.mjs.)
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { GENERATION_TEMPERATURE, GENERATION_MAX_TOKENS, PERSONA_PACKS } from "@aura/shared";
import type { PersonaTraits, PersonaVoicePack, Warmth, Energy, Verbosity } from "@aura/shared";
import { assemblePrompt } from "../services/chat/prompt-assembler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, "../../eval/reports");
const CACHE_PATH = resolve(REPORTS_DIR, "persona-probe-cache.json");
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const MODEL = process.env.MODEL_GROQ ?? "llama-3.3-70b-versatile";
// Serial + SDK retry: the free Groq tier caps ~12k tokens/min and the real system prompt is large,
// so concurrent calls trip 429s that would poison the scores. Correctness over speed here.
const CONCURRENCY = 1;
// Pace generation to stay under the free-tier ~12k tokens/min bucket. Deliberately slow (the real
// system prompt is ~1.5k tokens/call): a lower steady rate lets a depleted bucket refill mid-run.
const PACE_MS = 14000;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const ARGS = process.argv.slice(2);
type RunMode = "all" | "resume" | "failed";
const MODE: RunMode =
  ARGS.includes("--all") || ARGS.includes("--force") ? "all"
  : ARGS.includes("--rerun-failed") || ARGS.includes("--failed") ? "failed"
  : "resume";
const isErr = (t: string | undefined): boolean => t === undefined || t.startsWith("(error:");

// Deterministic markers — the grid contracts are defined as counts, so verify them by counting
// (no LLM judge needed for tuning, and it directly checks the contract rather than a proxy).
const ENDEARMENTS = /\b(love|sweet one|sweetheart|darling|dearest|dear|honey|hon|lovely|sweetie)\b/gi;
const countEndear = (t: string): number => (t.match(ENDEARMENTS) || []).length;
const countExclaim = (t: string): number => (t.match(/!/g) || []).length;
const countSentence = (t: string): number => (t.match(/[.!?]+(?=\s|$)/g) || []).length;
const countQuestion = (t: string): number => (t.match(/\?/g) || []).length;

const PACKS: PersonaVoicePack[] = Object.values(PERSONA_PACKS);
const LETTERS = "ABCDEFGHIJKLMNOP".split("");

// 3 probe messages pulling on warmth / energy / verbosity / stance differently. (Dropped the
// low-content "flat" probe — it gives every persona too little to differentiate on and just adds load.)
const PROBES: { id: string; label: string; userMessage: string }[] = [
  { id: "vent", label: "Venting / low", userMessage: "i've just been so drained lately. everything feels like too much and i don't even know why." },
  { id: "joy", label: "Happy news", userMessage: "i finally got the job!! i actually can't believe it, i've been trying for months." },
  { id: "advice", label: "Seeking advice", userMessage: "i had a fight with my sister and i don't know if i should text her first or wait." },
];

interface ChatMsg { role: "user" | "assistant"; content: string }

function buildPrompt(pack: PersonaVoicePack, traits: PersonaTraits, userMessage: string): { system: string; messages: ChatMsg[] } {
  const { systemPrompt, messages } = assemblePrompt({
    companionName: pack.name,
    personaKey: "aurora", // ignored when voicePack is supplied
    voicePack: pack,
    traits,
    history: [],
    userMessage,
  });
  return { system: systemPrompt, messages };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Deterministic per-scenario anonymization (no Math.random): stride by a coprime of the count.
function anonOrder(count: number, scenarioIndex: number): number[] {
  const stride = 7 % count === 0 ? 5 : 7;
  const offset = 3 + scenarioIndex * 5;
  return Array.from({ length: count }, (_, i) => (i * stride + offset) % count);
}

async function main() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY not set (expected via --env-file=.env). Aborting.");
    process.exit(1);
  }
  // Groq = the PRODUCT model; used ONLY to generate replies (what ships). No LLM judge: distinctness
  // is judged externally by Claude from an anonymized blind sheet (see persona-probe-blind.md), so the
  // product model never grades itself and judging costs no API tokens. Tuning is deterministic.
  const client = new OpenAI({ baseURL: GROQ_BASE_URL, apiKey, timeout: 60000, maxRetries: 12 });

  async function gen(system: string, messages: ChatMsg[], temperature = GENERATION_TEMPERATURE): Promise<string> {
    try {
      const c = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "system", content: system }, ...messages],
        temperature,
        max_tokens: GENERATION_MAX_TOKENS,
      });
      return c.choices[0]?.message?.content?.trim() ?? "(empty)";
    } catch (e) {
      return `(error: ${(e as Error).message})`;
    } finally {
      await sleep(PACE_MS); // respect Groq's per-minute token bucket
    }
  }

  // Resumable cache: a cell is (re)generated only when the mode says so; good cells are reused with no
  // API call (and no pacing wait). Persisted after every cell so an interrupted run keeps its progress.
  mkdirSync(REPORTS_DIR, { recursive: true });
  const cache: Record<string, string> = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : {};
  if (MODE === "all") for (const k of Object.keys(cache)) delete cache[k];
  const shouldGen = (key: string): boolean => {
    if (MODE === "all") return true;
    if (cache[key] === undefined) return MODE !== "failed"; // resume fills gaps; failed-only leaves them
    return isErr(cache[key]);
  };
  async function cachedGen(key: string, system: string, messages: ChatMsg[]): Promise<string> {
    if (!shouldGen(key)) return cache[key] ?? "(skipped)";
    cache[key] = await gen(system, messages);
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
    return cache[key];
  }

  // ── Part 1: distinctness (blind re-match) ─────────────────────────────────
  const dKeys = PROBES.flatMap((pr) => PACKS.map((p) => `d:${pr.id}:${p.id}`));
  console.log(`Mode: ${MODE} · model ${MODEL} · distinctness ${dKeys.filter(shouldGen).length}/${dKeys.length} cells to generate (rest cached)`);
  const replies: string[][] = [];
  for (const probe of PROBES) {
    const row = await mapLimit(PACKS, CONCURRENCY, (p) => {
      const { system, messages } = buildPrompt(p, p.defaultTraits, probe.userMessage);
      return cachedGen(`d:${probe.id}:${p.id}`, system, messages);
    });
    replies.push(row);
    console.log(`  ${probe.id}: done`);
  }

  // Distinctness is judged EXTERNALLY by Claude: emit an anonymized blind sheet + a separate answer
  // key. Claude reads the blind sheet, re-matches replies -> personas, then scores against the key.
  const specList = PACKS.map((p) => `- ${p.name} [${p.defaultTraits.warmth}/${p.defaultTraits.energy}/${p.defaultTraits.verbosity}]: ${p.stance}`).join("\n");
  const blind: string[] = [`# Persona probe — BLIND re-match sheet (for Claude to judge)\n`,
    `Task: each scenario lists ${PACKS.length} replies (A–${LETTERS[PACKS.length - 1]}), one per distinct persona, all answering the same message. Match each letter to one persona (each used once). The roster + stances:\n`, specList, ""];
  const key: string[] = [`# Persona probe — ANSWER KEY (do not read before judging)\n`];
  for (let s = 0; s < PROBES.length; s++) {
    const order = anonOrder(PACKS.length, s);
    blind.push(`## ${PROBES[s].label}\n> ${PROBES[s].userMessage}\n`);
    key.push(`## ${PROBES[s].label}`);
    order.forEach((pIdx, k) => {
      blind.push(`${LETTERS[k]}. ${replies[s][pIdx].replace(/\s+/g, " ").trim()}\n`);
      key.push(`${LETTERS[k]} = ${PACKS[pIdx].name}`);
    });
    key.push("");
  }

  // ── Part 2: tune-step delta (one companion, vary one axis at a time) ───────
  const TUNE_BASE = PERSONA_PACKS.aurora;
  const TUNE_MSG = "i had a rough day and i'm not sure how to shake it off.";
  const AXES: { axis: "warmth" | "energy" | "verbosity"; levels: string[]; base: PersonaTraits }[] = [
    { axis: "warmth", levels: ["reserved", "warm", "doting"] as Warmth[], base: { warmth: "warm", energy: "calm", verbosity: "balanced" } },
    { axis: "energy", levels: ["calm", "balanced", "playful"] as Energy[], base: { warmth: "warm", energy: "calm", verbosity: "balanced" } },
    { axis: "verbosity", levels: ["concise", "balanced", "expansive"] as Verbosity[], base: { warmth: "warm", energy: "calm", verbosity: "concise" } },
  ];
  console.log(`Tune-step delta on ${TUNE_BASE.name} (deterministic marker counts)`);
  interface AxisResult { axis: string; pass: boolean; detail: string; replies: { level: string; text: string }[] }
  const tune: AxisResult[] = [];
  for (const a of AXES) {
    const rs = await mapLimit(a.levels, CONCURRENCY, (lvl) => {
      const traits = { ...a.base, [a.axis]: lvl } as PersonaTraits;
      const { system, messages } = buildPrompt(TUNE_BASE, traits, TUNE_MSG);
      return cachedGen(`t:${a.axis}:${lvl}`, system, messages).then((text) => ({ level: lvl, text }));
    });
    const by = (lvl: string): string => rs.find((r) => r.level === lvl)?.text ?? "";
    let pass = false, detail = "";
    if (a.axis === "warmth") {
      const e = a.levels.map((l) => countEndear(by(l)));
      pass = e[0] === 0 && e[1] === 0 && e[2] >= 1; // reserved 0, warm 0, doting ≥1
      detail = `endearments reserved/warm/doting = ${e.join("/")}`;
    } else if (a.axis === "energy") {
      const x = a.levels.map((l) => countExclaim(by(l)));
      pass = x[0] === 0 && x[2] >= 1; // calm 0, playful ≥1
      detail = `exclamations calm/balanced/playful = ${x.join("/")}`;
    } else {
      const s = a.levels.map((l) => countSentence(by(l)));
      const qC = countQuestion(by("concise"));
      pass = s[0] <= 2 && qC === 0 && s[2] > s[0]; // concise ≤2 & no question, expansive longer
      detail = `sentences concise/balanced/expansive = ${s.join("/")}; concise questions = ${qC}`;
    }
    tune.push({ axis: a.axis, pass, detail, replies: rs });
    console.log(`  ${a.axis}: ${pass ? "PASS" : "FAIL"} (${detail})`);
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  await mkdir(REPORTS_DIR, { recursive: true });
  const side: string[] = [`# Persona probe — replies by scenario\n`, `Model: ${MODEL} · temp ${GENERATION_TEMPERATURE}\n`];
  for (let s = 0; s < PROBES.length; s++) {
    side.push(`## ${PROBES[s].label}\n> ${PROBES[s].userMessage}\n`);
    for (let p = 0; p < PACKS.length; p++) {
      const t = PACKS[p].defaultTraits;
      side.push(`**${PACKS[p].name}** _(${t.warmth}/${t.energy}/${t.verbosity})_\n${replies[s][p]}\n`);
    }
  }
  side.push(`## Tune-step delta — ${TUNE_BASE.name}\n> ${TUNE_MSG}\n`);
  for (const t of tune) {
    side.push(`### ${t.axis} — ${t.pass ? "PASS" : "FAIL"} (${t.detail})`);
    for (const r of t.replies) side.push(`**${r.level}**\n${r.text}\n`);
  }
  await writeFile(resolve(REPORTS_DIR, "persona-probe.md"), side.join("\n"), "utf-8");
  await writeFile(resolve(REPORTS_DIR, "persona-probe-blind.md"), blind.join("\n"), "utf-8");
  await writeFile(resolve(REPORTS_DIR, "persona-probe-key.md"), key.join("\n"), "utf-8");

  const tunePass = tune.filter((t) => t.pass).length;
  const sum: string[] = [`# Persona probe — summary\n`,
    `Generation: ${MODEL} (Groq, product model). Distinctness: judged externally by Claude from persona-probe-blind.md (no self-grading). Tuning: deterministic marker counts.\n`,
    `## Tune-step delta (deterministic; the contracts are countable markers)`, `**${tunePass}/${tune.length} axes bite**\n`, `| Axis | Result | Markers |`, `|---|---|---|`];
  for (const t of tune) sum.push(`| ${t.axis} | ${t.pass ? "PASS" : "FAIL"} | ${t.detail} |`);
  sum.push(`\n## Distinctness`, `Judge persona-probe-blind.md (blind re-match), then score vs persona-probe-key.md. Gate: ≥60% + no pair collapsing every scenario.`);
  sum.push(`\n> tune-step gate = all 3 axes' markers move correctly across the steps. Failing packs get sharpened/merged; failing axes get stronger contracts.`);
  await writeFile(resolve(REPORTS_DIR, "persona-probe-summary.md"), sum.join("\n"), "utf-8");

  const cells = [...replies.flat(), ...tune.flatMap((t) => t.replies.map((r) => r.text))];
  const errCells = cells.filter((c) => c.startsWith("(error:")).length;
  const errRate = errCells / cells.length;
  console.log(`\nTune-step ${tunePass}/${tune.length} axes bite · distinctness → judge persona-probe-blind.md`);
  if (errCells > 0) {
    console.warn(`\n⚠ ${errCells}/${cells.length} cells errored (Groq free-tier bucket)${errRate > 0.1 ? " — results PARTIAL" : ""}. Good cells are cached; re-run to fill only the failed ones:`);
    console.warn(`    npm run eval:persona -- --rerun-failed`);
  }
  console.log(`Reports: persona-probe.md (labeled) · persona-probe-blind.md (judge me) · persona-probe-key.md · cache: persona-probe-cache.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
