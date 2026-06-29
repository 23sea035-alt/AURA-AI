#!/usr/bin/env node
// Voice A/B harness — synthesize the SAME sample lines across the 4 candidate TTS providers
// (OpenAI gpt-4o-mini-tts, ElevenLabs Flash v2.5, Cartesia Sonic-3.5, Inworld Realtime TTS),
// write the audio + a scorecard, and measure first-audio latency. Then blind-listen and score.
//
// Spike tooling for docs/planning/realtime-voice-call-research.md (§5b). NOT shipped code:
// lives outside the pnpm workspace, zero npm deps, runs on plain Node 22+ (global fetch).
//
//   node spikes/voice-ab/ab-harness.mjs                 # all providers with a key set
//   node spikes/voice-ab/ab-harness.mjs --provider=openai,elevenlabs
//   node spikes/voice-ab/ab-harness.mjs --persona=aurora --line=greeting,crisis
//   node spikes/voice-ab/ab-harness.mjs --list          # show what would run, synthesize nothing
//
// Keys via env only (never commit them): OPENAI_API_KEY, ELEVENLABS_API_KEY,
// CARTESIA_API_KEY, INWORLD_API_KEY. Providers without a key are skipped.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PERSONA_VOICE, PERSONA_TRAITS, LINES,
  deliveryIntent, CRISIS_DELIVERY,
  resolveElevenLabs, resolveOpenAIInstruction,
} from "./config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "out");

// ── CLI args ────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);
const csv = (k) => (args[k] ? String(args[k]).split(",").map((s) => s.trim()).filter(Boolean) : null);
const providerFilter = csv("provider");
const personaFilter = csv("persona");
const lineFilter = csv("line");
const listOnly = !!args.list;

// ── Providers ─────────────────────────────────────────────────────────────--
// streaming=true → we read the HTTP body as a stream and report time-to-first-BYTE (a real TTFB).
// streaming=false → endpoint returns the whole clip at once, so the latency reported ≈ total
// synthesis time (NOT a streaming TTFB). See README "What the latency numbers mean".
const PROVIDERS = {
  openai: { env: "OPENAI_API_KEY", streaming: true },
  elevenlabs: { env: "ELEVENLABS_API_KEY", streaming: true },
  cartesia: { env: "CARTESIA_API_KEY", streaming: false },
  inworld: { env: "INWORLD_API_KEY", streaming: false },
};

// ── HTTP helpers ──────────────────────────────────────────────────────────--
async function fetchStreamedAudio(url, opts) {
  const t0 = performance.now();
  const res = await fetch(url, opts);
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const chunks = [];
  let ttfb = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (ttfb === null) ttfb = performance.now() - t0;
    chunks.push(value);
  }
  return { buffer: Buffer.concat(chunks), ttfbMs: Math.round(ttfb ?? 0), totalMs: Math.round(performance.now() - t0) };
}

async function fetchJsonBase64Audio(url, opts, pick) {
  const t0 = performance.now();
  const res = await fetch(url, opts);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  const b64 = pick(json);
  if (!b64) throw new Error(`no audio in response: ${JSON.stringify(json).slice(0, 200)}`);
  const totalMs = Math.round(performance.now() - t0);
  return { buffer: Buffer.from(b64, "base64"), ttfbMs: totalMs, totalMs };
}

// ── Provider adapters ───────────────────────────────────────────────────────
function synthesize(provider, { text, voiceId, delivery }) {
  switch (provider) {
    case "openai":
      return fetchStreamedAudio("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice: voiceId,
          input: text,
          instructions: resolveOpenAIInstruction(delivery),
          response_format: "mp3",
        }),
      });

    case "elevenlabs":
      return fetchStreamedAudio(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ text, model_id: "eleven_flash_v2_5", voice_settings: resolveElevenLabs(delivery) }),
        }
      );

    case "cartesia":
      // generation_config.speed is version-sensitive — omitted so the request can't 400 on it.
      // To apply pace, add: generation_config: { speed: resolveCartesia(delivery).speed } and verify.
      return fetchStreamedAudio("https://api.cartesia.ai/tts/bytes", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CARTESIA_API_KEY}`,
          "Cartesia-Version": "2026-03-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: "sonic-3.5",
          transcript: text,
          voice: { mode: "id", id: voiceId },
          output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
          language: "en",
        }),
      });

    case "inworld":
      // Inworld API key from the portal is already the base64 string for "Basic" auth — paste as-is.
      return fetchJsonBase64Audio(
        "https://api.inworld.ai/tts/v1/voice",
        {
          method: "POST",
          headers: { Authorization: `Basic ${process.env.INWORLD_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voiceId,
            modelId: "inworld-tts-1.5-max",
            audioConfig: { audioEncoding: "MP3", sampleRateHertz: 24000 },
          }),
        },
        (j) => j.audioContent
      );

    default:
      throw new Error(`unknown provider ${provider}`);
  }
}

// ── Orchestration ─────────────────────────────────────────────────────────--
function selected(all, filter) {
  return filter ? all.filter((x) => filter.includes(x)) : all;
}

async function main() {
  const personas = selected(Object.keys(PERSONA_VOICE), personaFilter);
  const lines = lineFilter ? LINES.filter((l) => lineFilter.includes(l.id)) : LINES;

  const providers = selected(Object.keys(PROVIDERS), providerFilter).filter((p) => {
    if (process.env[PROVIDERS[p].env]) return true;
    console.log(`• skip ${p}: ${PROVIDERS[p].env} not set`);
    return false;
  });

  if (providers.length === 0) {
    console.error("\nNo providers to run. Set at least one API key, e.g. OPENAI_API_KEY=... (see README).");
    process.exit(1);
  }

  console.log(`\nProviders: ${providers.join(", ")}`);
  console.log(`Personas:  ${personas.join(", ")}`);
  console.log(`Lines:     ${lines.map((l) => l.id).join(", ")}`);

  if (listOnly) {
    console.log("\n--list: nothing synthesized.");
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  const results = [];

  for (const provider of providers) {
    for (const personaKey of personas) {
      const voiceId = PERSONA_VOICE[personaKey].voiceId[provider];
      if (!voiceId || voiceId === "TODO") {
        console.log(`• skip ${provider}/${personaKey}: voiceId is "TODO" — set a real voice in config.mjs`);
        results.push({ provider, personaKey, lineId: "-", register: "-", status: "skipped (no voiceId)" });
        continue;
      }
      for (const line of lines) {
        const delivery = line.crisis ? CRISIS_DELIVERY : deliveryIntent(PERSONA_TRAITS[personaKey]);
        const file = `${provider}__${personaKey}__${line.id}.mp3`;
        try {
          const { buffer, ttfbMs, totalMs } = await synthesize(provider, { text: line.text, voiceId, delivery });
          await writeFile(join(OUT_DIR, file), buffer);
          const tag = PROVIDERS[provider].streaming ? "ttfb" : "total";
          console.log(`✓ ${provider}/${personaKey}/${line.id}  ${tag}=${ttfbMs}ms  total=${totalMs}ms  ${buffer.length}B`);
          results.push({ provider, personaKey, lineId: line.id, register: line.register, file, ttfbMs, totalMs, bytes: buffer.length, status: "ok" });
        } catch (err) {
          console.log(`✗ ${provider}/${personaKey}/${line.id}  ${err.message}`);
          results.push({ provider, personaKey, lineId: line.id, register: line.register, file, status: "error", error: err.message });
        }
      }
    }
  }

  await writeManifest(results);
  await writeScorecard(results.filter((r) => r.status === "ok"));
  printSummary(results, providers);
}

async function writeManifest(results) {
  await writeFile(join(OUT_DIR, "manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
}

async function writeScorecard(ok) {
  const cols = [
    "provider", "persona", "line_id", "register", "file", "ttfb_or_total_ms", "total_ms",
    "naturalness_1_5", "warmth_match_1_5", "expressiveness_1_5", "intelligibility_1_5", "consistency_1_5", "notes",
  ];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = ok.map((r) => [r.provider, r.personaKey, r.lineId, r.register, r.file, r.ttfbMs, r.totalMs, "", "", "", "", "", ""].map(esc).join(","));
  await writeFile(join(OUT_DIR, "scorecard.csv"), [cols.join(","), ...rows].join("\n") + "\n");
}

function printSummary(results, providers) {
  console.log("\n── Summary ──────────────────────────────────────");
  for (const p of providers) {
    const rs = results.filter((r) => r.provider === p && r.status === "ok");
    if (rs.length === 0) { console.log(`${p}: no clips (check voiceId / errors above)`); continue; }
    const avg = Math.round(rs.reduce((s, r) => s + r.ttfbMs, 0) / rs.length);
    const tag = PROVIDERS[p].streaming ? "avg ttfb" : "avg total (non-streaming)";
    console.log(`${p}: ${rs.length} clips, ${tag} ${avg}ms`);
  }
  const errs = results.filter((r) => r.status === "error");
  if (errs.length) console.log(`\n${errs.length} error(s) — see above and out/manifest.json`);
  console.log(`\nAudio + scorecard.csv + manifest.json → ${OUT_DIR}`);
  console.log("Open scorecard.csv, blind-listen, fill the 1–5 columns. Rubric: README.md.");
}

main().catch((err) => {
  console.error("\nHarness failed:", err);
  process.exit(1);
});
