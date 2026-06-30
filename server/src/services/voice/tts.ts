import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

export interface TTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  language?: string;
}

export interface TTSChunk {
  audio: Buffer;
  isFinal: boolean;
}

export type TTSVoice = {
  id: string;
  name: string;
  description: string;
};

const DEFAULT_VOICE_ID = "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4";
const DEFAULT_MODEL_ID = "sonic-3.5";
const CARTESIA_BASE = "https://api.cartesia.ai";

let _voicesCache: TTSVoice[] | null = null;

function getApiKey(): string {
  const key = getEnv().CARTESIA_API_KEY;
  if (!key) throw new Error("Cartesia API key not configured — set CARTESIA_API_KEY");
  return key;
}

function headers() {
  return {
    "X-API-Key": getApiKey(),
    "Content-Type": "application/json",
    "Cartesia-Version": "2024-11-20",
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(`${CARTESIA_BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...(options?.headers as Record<string, string>) },
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Cartesia API error ${resp.status}: ${body.slice(0, 300)}`);
  }
  return resp.json() as Promise<T>;
}

export async function listVoices(): Promise<TTSVoice[]> {
  if (_voicesCache) return _voicesCache;
  const data = await request<{ data: TTSVoice[] }>("/voices/");
  _voicesCache = data.data;
  return _voicesCache;
}

export async function generateSpeech(opts: TTSOptions): Promise<Buffer> {
  const { text, voiceId = DEFAULT_VOICE_ID, modelId = DEFAULT_MODEL_ID, language = "en" } = opts;

  const resp = await fetch(`${CARTESIA_BASE}/tts/bytes`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model_id: modelId,
      transcript: text,
      voice: { mode: "id", id: voiceId },
      output_format: { container: "wav", sample_rate: 24000, encoding: "pcm_f32le" },
      language,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Cartesia TTS error ${resp.status}: ${body.slice(0, 300)}`);
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  logger.info({ size: buffer.length, voiceId, modelId }, "TTS speech generated");
  return buffer;
}

export async function* streamSpeech(opts: TTSOptions): AsyncGenerator<TTSChunk> {
  const { text, voiceId = DEFAULT_VOICE_ID, modelId = DEFAULT_MODEL_ID, language = "en" } = opts;

  const resp = await fetch(`${CARTESIA_BASE}/tts/sse`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model_id: modelId,
      transcript: text,
      voice: { mode: "id", id: voiceId },
      output_format: { container: "wav", sample_rate: 24000, encoding: "pcm_f32le" },
      language,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Cartesia TTS stream error ${resp.status}: ${body.slice(0, 300)}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("Cartesia TTS: no response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "chunk" || parsed.audio) {
              const chunk = parsed.audio
                ? Buffer.from(parsed.audio, "base64")
                : parsed.data
                  ? Buffer.from(parsed.data, "base64")
                  : null;
              if (chunk) {
                yield { audio: chunk, isFinal: false };
              }
            }
          } catch {
            const raw = Buffer.from(data, "base64");
            if (raw.length > 0) {
              yield { audio: raw, isFinal: false };
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function generateSpeechForTurn(text: string): Promise<Buffer> {
  const voiceId = getEnv().CARTESIA_VOICE_ID || DEFAULT_VOICE_ID;
  return generateSpeech({ text, voiceId });
}

export function clearVoicesCache(): void {
  _voicesCache = null;
}
