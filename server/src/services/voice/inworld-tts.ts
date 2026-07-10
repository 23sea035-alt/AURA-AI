import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

const INWORLD_TTS_URL = "https://api.inworld.ai/tts/v1/voice";
export const TTS_MODEL_ID = "inworld-tts-2";
const MODEL_ID = TTS_MODEL_ID;

export type DeliveryMode = "STABLE" | "BALANCED" | "CREATIVE";

export interface SynthesizeOptions {
  text: string;
  voiceId?: string;
  // deliveryMode: STABLE = consistent/calm, BALANCED = natural, CREATIVE = expressive/varied
  deliveryMode?: DeliveryMode;
  // styleTag: bracket tag prepended to text for per-persona or crisis delivery steering
  // e.g. "[warm and gentle]", "[direct and grounded]", "[calm and measured]"
  styleTag?: string;
  speakingRate?: number; // 0.5–1.5, default 1.0
  // language: BCP-47 locale to STEER a voice's accent without re-cloning (e.g. "en-GB", "hi-IN").
  // Omit to use the voice's native accent. Per-persona map lives in voice-tuning (PERSONA_LOCALE).
  language?: string;
}

// Inworld API keys from the portal are already the base64 value for Basic auth — paste as-is.
function authHeader(): string {
  const key = getEnv().INWORLD_API_KEY;
  if (!key) throw new Error("Inworld API key not configured — set INWORLD_API_KEY");
  return `Basic ${key}`;
}

export async function synthesizeSpeech(opts: SynthesizeOptions): Promise<Buffer> {
  const {
    text,
    voiceId,
    deliveryMode = "BALANCED",
    styleTag,
    speakingRate,
    language,
  } = opts;

  if (!voiceId) throw new Error("voiceId is required — set INWORLD_VOICE_ID_AURORA/ORION/LYRA and pass the correct one");

  const body: Record<string, unknown> = {
    text: styleTag ? `${styleTag} ${text}` : text,
    voiceId,
    modelId: MODEL_ID,
    deliveryMode,
    ...(language && { language }),
    audioConfig: {
      audioEncoding: "MP3",
      sampleRateHertz: 24000,
      ...(speakingRate !== undefined && { speakingRate }),
    },
  };

  const res = await fetch(INWORLD_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Inworld TTS ${res.status} ${res.statusText}: ${errBody.slice(0, 300)}`);
  }

  const json = (await res.json()) as { audioContent?: string };
  if (!json.audioContent) {
    throw new Error("Inworld TTS: missing audioContent in response");
  }

  const audio = Buffer.from(json.audioContent, "base64");
  logger.info({ voiceId, deliveryMode, styleTag, language, bytes: audio.length }, "Inworld TTS synthesized");
  return audio;
}

export async function synthesizeBatch(
  texts: string[],
  opts?: Omit<SynthesizeOptions, "text">,
): Promise<Buffer[]> {
  return Promise.all(texts.map((text) => synthesizeSpeech({ ...opts, text })));
}
