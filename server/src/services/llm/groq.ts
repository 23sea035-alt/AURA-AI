import OpenAI from "openai";
import { GENERATION_TEMPERATURE, GENERATION_MAX_TOKENS } from "@aura/shared";
import type { LLMProvider } from "./index.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const GUARD_MODELS = new Set(["llama-guard-3-8b"]);
const GUARD_MODEL_MAX_TOKENS = 512;

function maxTokensForModel(model: string): number {
  return GUARD_MODELS.has(model) ? GUARD_MODEL_MAX_TOKENS : GENERATION_MAX_TOKENS;
}

export function createGroqProvider(apiKey: string, model?: string, temperature?: number): LLMProvider {
  const resolvedModel = model ?? process.env.MODEL_GROQ ?? DEFAULT_MODEL;
  // temperature ?? default (nullish, so an explicit 0 is honored — moderation runs at 0).
  const resolvedTemperature = temperature ?? GENERATION_TEMPERATURE;
  const client = new OpenAI({ baseURL: GROQ_BASE_URL, apiKey, timeout: 30000 });

  return {
    async generateReply({ systemPrompt, messages }) {
      const chatMessages = [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const completion = await client.chat.completions.create({
        model: resolvedModel,
        messages: chatMessages,
        temperature: resolvedTemperature,
        max_tokens: maxTokensForModel(resolvedModel),
      });

      const content = completion.choices[0]?.message?.content?.trim() ?? "";
      // Empty responses from classification models (e.g. gpt-oss-safeguard-20b
      // when given a system message) indicate the model couldn't process the
      // request — treat as a failure so the caller's fallback logic kicks in.
      if (!content) throw new Error("Empty model response");
      return content;
    },
  };
}
