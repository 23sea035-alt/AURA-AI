// Voice audition harness — synthesize each persona's opener line through the REAL TTS pipeline
// (synthesizeSpeech + per-persona tuning), so what you hear is exactly what ships. Dumps MP3s to
// server/audition-clips/ for review. See docs/specs/voice-casting-guide.md.
//
//   All 12:            node --env-file=.env --import tsx src/scripts/audition-voices.ts
//   One / a few:       node --env-file=.env --import tsx src/scripts/audition-voices.ts cyrus lyra
//   (pnpm shortcut:    pnpm voices:audition -- cyrus)
//
// Needs INWORLD_API_KEY + the INWORLD_VOICE_ID_* set in server/.env. Personas with no voice id are
// skipped. Each clip uses the persona's live styleTag / deliveryMode / base rate (× natural pace 1.0)
// and its accent-steer locale (e.g. Cyrus → hi-IN) — the same values production uses.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PersonaKey } from "@aura/shared";
import { synthesizeSpeech } from "../services/voice/inworld-tts.js";
import {
  styleTagFor,
  deliveryModeFor,
  baseRateFor,
  effectiveSpeakingRate,
  localeFor,
} from "../services/voice/voice-tuning.js";

// Each persona's first opener (no {firstName}) — a representative line for an apples-to-apples clip.
// Source: docs/specs/voice-casting-guide.md §Audition lines. Keep in sync if the openers change.
const OPENERS: Record<PersonaKey, string> = {
  aurora: "Hi, I'm so glad you're here. There's no rush at all. I'm just happy to sit with you. How are you, really?",
  orion: "Hey. Glad you found your way here. We'll take it one thing at a time. What's on your mind?",
  lyra: "Oh hi! New face, I love it. So, what's the weather like in your head today, stormy, sunny, somewhere in between?",
  sage: "Hello. You're welcome here. No need to say much. Start when you're ready.",
  amara: "Oh, hello you! I'm just delighted you're here. Come in, tell me everything. How are you, darling?",
  eli: "Hey, good to meet you. No agenda here, just glad you dropped in. What's up?",
  selene: "Hello, and welcome. Whatever you're carrying today, you can set some of it down here with me. How are you feeling?",
  soren: "Well, look who wandered in. Good timing, I was getting bored. What's on your mind?",
  juno: "Hey, you made it! So what's the headline of your day so far?",
  thea: "Hi, sweetheart. You're okay here. Take your time. What's on your mind?",
  cyrus: "Hello, and welcome. Whatever's on your mind, there's usually more to it than it first seems. Where shall we begin?",
  wren: "Hi. I'm glad you're here. I like figuring things out alongside people. What's on your mind today?",
};

const ALL_PERSONAS = Object.keys(OPENERS) as PersonaKey[];

const ENV_KEY: Record<PersonaKey, string> = {
  aurora: "INWORLD_VOICE_ID_AURORA",
  orion: "INWORLD_VOICE_ID_ORION",
  lyra: "INWORLD_VOICE_ID_LYRA",
  sage: "INWORLD_VOICE_ID_SAGE",
  amara: "INWORLD_VOICE_ID_AMARA",
  eli: "INWORLD_VOICE_ID_ELI",
  selene: "INWORLD_VOICE_ID_SELENE",
  soren: "INWORLD_VOICE_ID_SOREN",
  juno: "INWORLD_VOICE_ID_JUNO",
  thea: "INWORLD_VOICE_ID_THEA",
  cyrus: "INWORLD_VOICE_ID_CYRUS",
  wren: "INWORLD_VOICE_ID_WREN",
};

function isPersonaKey(value: string): value is PersonaKey {
  return value in OPENERS;
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith("-"));
  const bad = requested.filter((a) => !isPersonaKey(a));
  if (bad.length > 0) {
    console.error(`Unknown persona(s): ${bad.join(", ")}. Valid: ${ALL_PERSONAS.join(", ")}`);
    process.exit(1);
  }
  const targets: PersonaKey[] = requested.length > 0 ? (requested as PersonaKey[]) : ALL_PERSONAS;

  if (!process.env.INWORLD_API_KEY) {
    console.error("INWORLD_API_KEY not set. Run with: node --env-file=.env --import tsx src/scripts/audition-voices.ts");
    process.exit(1);
  }

  const outDir = path.resolve(fileURLToPath(new URL("../../audition-clips/", import.meta.url)));
  await mkdir(outDir, { recursive: true });

  const results: Array<{ persona: PersonaKey; voice: string; mode: string; rate: string; locale: string; status: string }> = [];

  for (const persona of targets) {
    const voiceId = process.env[ENV_KEY[persona]];
    if (!voiceId) {
      results.push({ persona, voice: "—", mode: "—", rate: "—", locale: "—", status: "SKIP (no voice id)" });
      continue;
    }

    const deliveryMode = deliveryModeFor(persona);
    const styleTag = styleTagFor(persona);
    const speakingRate = effectiveSpeakingRate(baseRateFor(persona), 1.0);
    const language = localeFor(persona);

    try {
      const audio = await synthesizeSpeech({ text: OPENERS[persona], voiceId, deliveryMode, styleTag, speakingRate, language });
      const file = path.join(outDir, `${persona}-${voiceId}.mp3`);
      await writeFile(file, audio);
      results.push({
        persona,
        voice: voiceId,
        mode: deliveryMode,
        rate: speakingRate.toFixed(2),
        locale: language ?? "native",
        status: `${(audio.length / 1024).toFixed(0)} KB`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ persona, voice: voiceId, mode: deliveryMode, rate: "—", locale: language ?? "native", status: `FAIL: ${msg.slice(0, 80)}` });
    }
  }

  console.table(results);
  console.log(`\nClips written to: ${outDir}`);
  const failed = results.filter((r) => r.status.startsWith("FAIL")).length;
  if (failed > 0) {
    console.error(`\n${failed} persona(s) failed to synthesize.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
