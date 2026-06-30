import type { LLMProvider } from "./index.js";
import { logger } from "../../lib/logger.js";
import { createNvidiaProvider } from "./nvidia.js";
import { createAnthropicProvider } from "./anthropic.js";
import { createOpenRouterProvider } from "./openrouter.js";
import { createGroqProvider } from "./groq.js";
import { getEnv } from "../../config/env.js";

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
  const env = getEnv();
  switch (task) {
    case "generate-reply": return env.MODEL_GENERATE_REPLY;
    case "moderate-input": return env.MODEL_MODERATE_INPUT;
    case "moderate-output": return env.MODEL_MODERATE_OUTPUT;
    case "consolidate-memory": return env.MODEL_CONSOLIDATE_MEMORY;
  }
}

function fallbackModelForTask(task: TaskType): string {
  const env = getEnv();
  switch (task) {
    case "generate-reply": return env.MODEL_FALLBACK_GENERATE_REPLY;
    case "moderate-input": return env.MODEL_FALLBACK_MODERATE_INPUT;
    case "moderate-output": return env.MODEL_FALLBACK_MODERATE_OUTPUT;
    case "consolidate-memory": return env.MODEL_FALLBACK_CONSOLIDATE_MEMORY;
  }
}

export function getModelForTask(task: TaskType): string {
  return modelOverrides[task] ?? defaultModelForTask(task);
}

export function getFallbackForTask(task: TaskType): string {
  return fallbackModelForTask(task);
}

export function createTaskSpecificProvider(task: TaskType, _apiKey?: string, model?: string): LLMProvider {
  const primaryModel = model ?? getModelForTask(task);
  const fallbackModel = getFallbackForTask(task);

  const env = getEnv();
  const useOpenRouter = !!env.OPENROUTER_API_KEY;
  const useAnthropic = !useOpenRouter && !!env.ANTHROPIC_API_KEY;
  const useGroq = !useOpenRouter && !useAnthropic && !!env.GROQ_API_KEY;

  let apiKey: string;
  let createProvider: (key: string, model: string) => LLMProvider;

  if (useOpenRouter) {
    apiKey = env.OPENROUTER_API_KEY!;
    createProvider = createOpenRouterProvider;
  } else if (useAnthropic) {
    apiKey = env.ANTHROPIC_API_KEY!;
    createProvider = createAnthropicProvider;
  } else if (useGroq) {
    apiKey = env.GROQ_API_KEY!;
    createProvider = createGroqProvider;
  } else {
    apiKey = _apiKey ?? env.NVIDIA_API_KEY;
    createProvider = createNvidiaProvider;
  }

  const primary = createProvider(apiKey, primaryModel);
  const fallback = createProvider(apiKey, fallbackModel);

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
  };
}
