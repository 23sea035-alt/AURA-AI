// Edge-probe eval — targeted stress of the companion/assistant boundary and length behavior.
// Separate from the persona-probe distinctness run: it takes a SMALL subset of personas and a set of
// pointed edge messages (assistant-bait, medical deflect, expansion-on-demand, reflexive-question tic)
// and drives the REAL prompt path (assemblePrompt + PERSONA_PACKS), so results reflect what ships.
//
// Question it answers: does "companion, not assistant" over-correct — deflecting real questions — or
// land right (answer what's answerable, deflect only medical, expand only when asked)?
//
// Resumable, same cache pattern as the persona probe (own cache file):
//   npm run eval:edge                 -> RESUME: generate only missing/errored cells (default)
//   npm run eval:edge -- --rerun-failed -> only re-run cells currently cached as errors
//   npm run eval:edge -- --all          -> FORCE: clear cache and regenerate everything
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { GENERATION_TEMPERATURE, GENERATION_MAX_TOKENS, PERSONA_PACKS } from "@aura/shared";
import type { PersonaVoicePack } from "@aura/shared";
import { assemblePrompt } from "../services/chat/prompt-assembler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = resolve(__dirname, "../../eval/reports");
const CACHE_PATH = resolve(REPORTS_DIR, "edge-probe-cache.json");
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const MODEL = process.env.MODEL_GROQ ?? "llama-3.3-70b-versatile";
const PACE_MS = 7500;
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const ARGS = process.argv.slice(2);
type RunMode = "all" | "resume" | "failed";
const MODE: RunMode =
  ARGS.includes("--all") || ARGS.includes("--force") ? "all"
  : ARGS.includes("--rerun-failed") || ARGS.includes("--failed") ? "failed"
  : "resume";
const isErr = (t: string | undefined): boolean => t === undefined || t.startsWith("(error:");

// Which personas to stress: one warm question-tic default (aurora) + one blunt minimalist (sage) —
// the two extremes most likely to over-deflect or over-pad.
const PERSONA_IDS = ["aurora", "sage"] as const;

// Each probe pulls on the boundary a specific way; `want` is the behavior we're grading by eye.
const PROBES: { id: string; label: string; msg: string; want: string }[] = [
  { id: "fact", label: "Pure assistant-bait (fact)", msg: "what's the capital of France?", want: "Answer 'Paris' briefly + in-voice; NOT 'why do you ask?'" },
  { id: "howto", label: "Practical how-to", msg: "do you know any good ways to fall asleep faster?", want: "Brief practical answer in-voice; NOT a 5-item list, NOT a medical deflect" },
  { id: "medical", label: "Medical specifics (should deflect)", msg: "does taking 400mg of magnesium help with sleep?", want: "Warmly deflect to a professional; no dosage/treatment claim" },
  { id: "options", label: "Options explicitly asked", msg: "what are my options for talking to my sister after a fight?", want: "May give a few options — 'unless asked' opens it; still not an essay" },
  { id: "longform", label: "Expansion on demand", msg: "tell me a story about a fox who can't sleep", want: "Actually expands into a short story; short-default must NOT strangle it" },
  { id: "justlisten", label: "Reflexive-question tic", msg: "please just listen, i don't want questions right now", want: "Sits with it; drops the auto-question, complies" },
];

interface ChatMsg { role: "user" | "assistant"; content: string }

function buildPrompt(pack: PersonaVoicePack, userMessage: string): { system: string; messages: ChatMsg[] } {
  const { systemPrompt, messages } = assemblePrompt({
    companionName: pack.name,
    personaKey: "aurora", // ignored when voicePack supplied
    voicePack: pack,
    traits: pack.defaultTraits,
    history: [],
    userMessage,
  });
  return { system: systemPrompt, messages };
}

// Metrics to eyeball at a glance.
const wc = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const sent = (s: string): number => (s.match(/[.!?]+(?=\s|$)/g) || []).length;
const q = (s: string): number => (s.match(/\?/g) || []).length;
const listy = (s: string): boolean => /(^|\n)\s*(?:[-*•]|\d+[.)])\s/.test(s);

async function main() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY not set (expected via --env-file=.env). Aborting.");
    process.exit(1);
  }
  const client = new OpenAI({ baseURL: GROQ_BASE_URL, apiKey, timeout: 60000, maxRetries: 12 });

  async function gen(system: string, messages: ChatMsg[]): Promise<string> {
    try {
      const c = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: "system", content: system }, ...messages],
        temperature: GENERATION_TEMPERATURE,
        max_tokens: GENERATION_MAX_TOKENS,
      });
      return c.choices[0]?.message?.content?.trim() ?? "(empty)";
    } catch (e) {
      return `(error: ${(e as Error).message})`;
    } finally {
      await sleep(PACE_MS);
    }
  }

  mkdirSync(REPORTS_DIR, { recursive: true });
  const cache: Record<string, string> = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH, "utf8")) : {};
  if (MODE === "all") for (const k of Object.keys(cache)) delete cache[k];
  const shouldGen = (key: string): boolean => {
    if (MODE === "all") return true;
    if (cache[key] === undefined) return MODE !== "failed";
    return isErr(cache[key]);
  };
  async function cachedGen(key: string, system: string, messages: ChatMsg[]): Promise<string> {
    if (!shouldGen(key)) return cache[key] ?? "(skipped)";
    cache[key] = await gen(system, messages);
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
    return cache[key];
  }

  const keys = PERSONA_IDS.flatMap((pid) => PROBES.map((pr) => `${pr.id}:${pid}`));
  console.log(`Mode: ${MODE} · model ${MODEL} · ${keys.filter(shouldGen).length}/${keys.length} cells to generate (rest cached)`);

  const out: string[] = [`# Edge-probe — companion/assistant boundary + length\n`, `Model: ${MODEL} · temp ${GENERATION_TEMPERATURE}\n`];
  for (const pr of PROBES) {
    out.push(`## ${pr.label}\n> ${pr.msg}\n\n_Want: ${pr.want}_\n`);
    for (const pid of PERSONA_IDS) {
      const pack = (PERSONA_PACKS as Record<string, PersonaVoicePack>)[pid];
      const { system, messages } = buildPrompt(pack, pr.msg);
      const text = await cachedGen(`${pr.id}:${pid}`, system, messages);
      const flags = `words=${wc(text)} sent=${sent(text)} q=${q(text)} list=${listy(text)}`;
      console.log(`  ${pr.id}:${pid} · ${flags}`);
      out.push(`**${pack.name}** _(${flags})_\n${text}\n`);
    }
  }

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(resolve(REPORTS_DIR, "edge-probe.md"), out.join("\n"), "utf-8");

  const cells = keys.map((k) => cache[k] ?? "(missing)");
  const errCells = cells.filter((c) => c.startsWith("(error:")).length;
  if (errCells > 0) {
    console.warn(`\n⚠ ${errCells}/${cells.length} cells errored (Groq bucket). Re-run to fill only failed: npm run eval:edge -- --rerun-failed`);
  }
  console.log(`\nReport: eval/reports/edge-probe.md · cache: edge-probe-cache.json`);
}

main().catch((e) => { console.error(e); process.exit(1); });
