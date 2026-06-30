import type { LLMProvider } from "./index.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export function createAnthropicProvider(apiKey: string, model = DEFAULT_MODEL): LLMProvider {
  return {
    async generateReply({ systemPrompt, messages }) {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          max_tokens: 1024,
          temperature: 1.0,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`Anthropic API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
      };

      const text = data.content?.find((c) => c.type === "text")?.text ?? "";
      return text.trim();
    },
  };
}
