import OpenAI from "openai";
import type { LLMProvider } from "./index.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const GUARD_MODELS = new Set(["llama-guard-3-8b"]);

function maxTokensForModel(model: string): number {
  return GUARD_MODELS.has(model) ? 512 : 2048;
}

export function createGroqProvider(apiKey: string, model?: string): LLMProvider {
  const resolvedModel = model ?? process.env.MODEL_GROQ ?? DEFAULT_MODEL;
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
        temperature: 0.8,
        max_tokens: maxTokensForModel(resolvedModel),
      });

      return completion.choices[0]?.message?.content?.trim() ?? "";
    },
  };
}
