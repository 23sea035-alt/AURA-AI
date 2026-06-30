import OpenAI, { toFile } from "openai";
import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { STT_MODEL, STT_MAX_RETRIES } from "@aura/shared";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

function getClient(): OpenAI {
  return new OpenAI({ baseURL: GROQ_BASE_URL, apiKey: getEnv().GROQ_API_KEY, timeout: 10_000 });
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType = "audio/webm"): Promise<string> {
  const client = getClient();
  let lastErr: unknown;

  for (let attempt = 1; attempt <= STT_MAX_RETRIES + 1; attempt++) {
    try {
      const file = await toFile(audioBuffer, "audio.webm", { type: mimeType });
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
