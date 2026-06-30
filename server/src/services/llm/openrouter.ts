import OpenAI from "openai";
import type { LLMProvider } from "./index.js";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";

export function createOpenRouterProvider(apiKey: string, model = DEFAULT_MODEL): LLMProvider {
  const client = new OpenAI({ baseURL: OPENROUTER_BASE_URL, apiKey, timeout: 60000 });

  return {
    async generateReply({ systemPrompt, messages }) {
      const chatMessages = [
        ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
        ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      const completion = await client.chat.completions.create({
        model,
        messages: chatMessages,
        temperature: 1.0,
        max_tokens: 1024,
      });

      const content = completion.choices[0]?.message?.content?.trim() ?? "";
      return content;
    },
  };
}
