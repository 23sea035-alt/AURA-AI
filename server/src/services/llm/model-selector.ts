import type { LLMProvider } from "./index.js";
import { getLLMProvider } from "./index.js";
import { logger } from "../../lib/logger.js";
import { createGroqProvider } from "./groq.js";

export type TaskType =
  | "generate-reply"
  | "moderate-input"
  | "moderate-output"
  | "consolidate-memory";

let modelOverrides: Partial<Record<TaskType, string>> = {};

export function setModelOverride(task: TaskType, modelId: string): void {
  modelOverrides[task] = modelId;
  logger.info({ task, modelId }, "Model override set");
}

export function resetModelOverrides(): void {
  modelOverrides = {};
}

function defaultModelForTask(task: TaskType): string {
  switch (task) {
    case "generate-reply": return process.env.MODEL_GENERATE_REPLY ?? "llama-3.3-70b-versatile";
    case "moderate-input": return process.env.MODEL_MODERATE_INPUT ?? "meta-llama/llama-prompt-guard-2-86m";
    case "moderate-output": return process.env.MODEL_MODERATE_OUTPUT ?? "openai/gpt-oss-safeguard-20b";
    // Consolidation runs via the global generate-reply provider (70b) in production; the 8b model
    // fails the structured consolidate_memory contract (parse failures on contradictions). Keep 70b.
    case "consolidate-memory": return process.env.MODEL_CONSOLIDATE_MEMORY ?? "llama-3.3-70b-versatile";
  }
}

function fallbackModelForTask(task: TaskType): string {
  switch (task) {
    case "generate-reply": return process.env.MODEL_FALLBACK_GENERATE_REPLY ?? "llama-3.1-8b-instant";
    case "moderate-input": return process.env.MODEL_FALLBACK_MODERATE_INPUT ?? "llama-3.3-70b-versatile";
    case "moderate-output": return process.env.MODEL_FALLBACK_MODERATE_OUTPUT ?? "llama-3.3-70b-versatile";
    case "consolidate-memory": return process.env.MODEL_FALLBACK_CONSOLIDATE_MEMORY ?? "llama-3.3-70b-versatile";
  }
}

export function getModelForTask(task: TaskType): string {
  return modelOverrides[task] ?? defaultModelForTask(task);
}

export function getFallbackForTask(task: TaskType): string {
  return fallbackModelForTask(task);
}

export function createTaskSpecificProvider(task: TaskType, apiKey: string, model?: string): LLMProvider {
  const primaryModel = model ?? getModelForTask(task);
  const fallbackModel = getFallbackForTask(task);

  const primary = createGroqProvider(apiKey, primaryModel);
  const fallback = createGroqProvider(apiKey, fallbackModel);

  return {
    async generateReply(params) {
      try {
        return await primary.generateReply(params);
      } catch (err) {
        logger.warn({ err, task, model: primaryModel, fallbackModel }, "Primary model failed, trying fallback");
        try {
          return await fallback.generateReply(params);
        } catch (fallbackErr) {
          logger.error({ err: fallbackErr, task, fallbackModel }, "Fallback model also failed");
          throw fallbackErr;
        }
      }
    },

    async *generateReplyStream(params, signal) {
      // Only fall back to the secondary model if the primary fails *before* emitting any
      // token — once tokens have streamed to the caller, restarting would duplicate output,
      // so a mid-stream failure propagates (the caller degrades to its canned fallback line).
      let emitted = false;
      try {
        for await (const delta of primary.generateReplyStream!(params, signal)) {
          emitted = true;
          yield delta;
        }
      } catch (err) {
        if (emitted || !fallback.generateReplyStream) throw err;
        logger.warn({ err, task, model: primaryModel, fallbackModel }, "Primary stream failed pre-token, trying fallback");
        yield* fallback.generateReplyStream(params, signal);
      }
    },
  };
}
