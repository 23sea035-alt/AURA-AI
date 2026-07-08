import OpenAI, { toFile } from "openai";
import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { STT_MODEL, STT_MAX_RETRIES } from "@aura/shared";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function getClient(): OpenAI {
  return new OpenAI({ baseURL: GROQ_BASE_URL, apiKey: getEnv().GROQ_API_KEY, timeout: 10_000 });
}

/**
 * Whisper picks the decoder from the filename/mime — and the client can't label a raw
 * binary WS frame, so sniff the container from magic bytes. iOS records m4a/wav/caf;
 * webm only ever came from the original (web-era) assumption.
 */
export function sniffAudioFormat(buffer: Buffer): { mimeType: string; filename: string } {
  const head = buffer.subarray(0, 12);
  if (head.length >= 12 && head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WAVE") {
    return { mimeType: "audio/wav", filename: "audio.wav" };
  }
  if (head.length >= 12 && head.toString("ascii", 4, 8) === "ftyp") {
    return { mimeType: "audio/mp4", filename: "audio.m4a" };
  }
  if (head.toString("ascii", 0, 4) === "caff") {
    return { mimeType: "audio/x-caf", filename: "audio.caf" };
  }
  if (head.toString("ascii", 0, 4) === "OggS") {
    return { mimeType: "audio/ogg", filename: "audio.ogg" };
  }
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    return { mimeType: "audio/webm", filename: "audio.webm" };
  }
  if (head.toString("ascii", 0, 3) === "ID3" || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)) {
    return { mimeType: "audio/mpeg", filename: "audio.mp3" };
  }
  return { mimeType: "audio/wav", filename: "audio.wav" }; // least-wrong default for iOS captures
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType?: string): Promise<string> {
  const client = getClient();
  const format = mimeType
    ? { mimeType, filename: `audio.${mimeType.split("/")[1] ?? "bin"}` }
    : sniffAudioFormat(audioBuffer);
  let lastErr: unknown;

  for (let attempt = 1; attempt <= STT_MAX_RETRIES + 1; attempt++) {
    try {
      const file = await toFile(audioBuffer, format.filename, { type: format.mimeType });
      const result = await client.audio.transcriptions.create({
        model: STT_MODEL,
        file,
        response_format: "text",
      });
      const transcript = typeof result === "string" ? result.trim() : (result as { text: string }).text.trim();
      logger.info({ bytes: audioBuffer.length, attempt, chars: transcript.length }, "STT transcription complete");
      return transcript;
    } catch (err) {
      lastErr = err;
      logger.warn({ err, attempt }, "STT attempt failed");
      if (attempt <= STT_MAX_RETRIES) await new Promise((r) => setTimeout(r, 200 * attempt));
    }
  }
  throw lastErr;
}
