import OpenAI from "openai";
import { GENERATION_TEMPERATURE, GENERATION_MAX_TOKENS } from "@aura/shared";
import { incrementMetric } from "../../lib/metrics.js";
import type { LLMProvider, GenerateReplyParams } from "./index.js";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

// The OpenAI SDK transparently retries 429s (maxRetries) and only throws once retries are exhausted,
// so a rate-limit reaching here means Groq is throttling us for real. Count it as an early-warning
// signal on GET /api/admin/metrics instead of only discovering throttling from failed user turns.
// Duck-typed on `.status` (OpenAI.APIError.status === 429) to stay robust to SDK internals/mocks.
function recordIfRateLimited(err: unknown): void {
  if ((err as { status?: unknown } | null)?.status === 429) {
    incrementMetric("groq.rate_limited");
  }
}

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

  function buildMessages({ systemPrompt, messages }: GenerateReplyParams) {
    return [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];
  }

  return {
    async generateReply(params) {
      const completion = await client.chat.completions.create({
        model: resolvedModel,
        messages: buildMessages(params),
        temperature: resolvedTemperature,
        max_tokens: maxTokensForModel(resolvedModel),
      }).catch((err: unknown) => {
        recordIfRateLimited(err);
        throw err;
      });

      const content = completion.choices[0]?.message?.content?.trim() ?? "";
      // Empty responses from classification models (e.g. gpt-oss-safeguard-20b
      // when given a system message) indicate the model couldn't process the
      // request — treat as a failure so the caller's fallback logic kicks in.
      if (!content) throw new Error("Empty model response");
      return content;
    },

    async *generateReplyStream(params, signal) {
      const stream = await client.chat.completions.create(
        {
          model: resolvedModel,
          messages: buildMessages(params),
          temperature: resolvedTemperature,
          max_tokens: maxTokensForModel(resolvedModel),
          stream: true,
        },
        signal ? { signal } : undefined,
      ).catch((err: unknown) => {
        recordIfRateLimited(err);
        throw err;
      });

      let emitted = false;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          emitted = true;
          yield delta;
        }
      }
      // A stream that produced no content is a model failure — surface it so the
      // caller's fallback logic kicks in (mirrors the non-streaming empty-response guard).
      if (!emitted) throw new Error("Empty model response (stream)");
    },
  };
}
