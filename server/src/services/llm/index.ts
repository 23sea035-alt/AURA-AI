export interface GenerateReplyParams {
  systemPrompt: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface LLMProvider {
  generateReply(params: GenerateReplyParams): Promise<string>;
  /**
   * Optional streaming variant: yields token deltas as they arrive. Providers that don't
   * implement it (or non-Groq fakes) fall back to the blocking `generateReply` path.
   * `signal` lets the caller abort an in-flight generation (e.g. on an output-moderation block).
   */
  generateReplyStream?(params: GenerateReplyParams, signal?: AbortSignal): AsyncIterable<string>;
}

let _provider: LLMProvider | null = null;

export function setLLMProvider(provider: LLMProvider): void {
  _provider = provider;
}

export function getLLMProvider(): LLMProvider {
  if (!_provider) throw new Error("LLM provider not configured — set one via setLLMProvider()");
  return _provider;
}
