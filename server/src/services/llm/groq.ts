import OpenAI from "openai";
import { GENERATION_TEMPERATURE, GENERATION_MAX_TOKENS } from "@aura/shared";
import type { LLMProvider } from "./index.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

export function createGroqProvider(apiKey: string, model = DEFAULT_MODEL): LLMProvider {
  const client = new OpenAI({ baseURL: GROQ_BASE_URL, apiKey, timeout: 5000 });

  return {
    async generateReply({ systemPrompt, messages }) {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        temperature: GENERATION_TEMPERATURE,
        max_tokens: GENERATION_MAX_TOKENS,
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
