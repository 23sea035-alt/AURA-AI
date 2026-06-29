import { MODERATION_INPUT_THRESHOLDS, MODERATION_OUTPUT_THRESHOLDS } from "@aura/shared";

// Hard timeout for the omni-moderation call (ms). Keeps a slow/hung OpenAI request from
// holding a DB pool connection on the chat hot path; on timeout we fail closed (flagged: true).
const OMNI_TIMEOUT_MS = 8000;

export interface OmniCategoryScore {
  category: string;
  score: number;
}

export interface OmniResult {
  flagged: boolean;
  categories: OmniCategoryScore[];
  error?: string;
}

function scoreModeration(
  text: string,
  thresholds: Record<string, number>,
): Promise<OmniResult> {
  return (async () => {
    try {
      const { default: OpenAI } = await import("openai");
      const apiKey = process.env["OPENAI_API_KEY"];
      if (!apiKey) {
        return { flagged: true, categories: [], error: "OPENAI_API_KEY not set" };
      }
      // Bound the request: omni moderation runs on the chat hot path, so a hung call must not
      // pin a connection indefinitely (the SDK default timeout is ~10 min). Fail-closed on timeout.
      const client = new OpenAI({ apiKey, timeout: OMNI_TIMEOUT_MS, maxRetries: 1 });
      const response = await client.moderations.create({
        model: "omni-moderation-latest",
        input: text,
      });

      const result = response.results[0];
      if (!result) {
        return { flagged: true, categories: [], error: "No moderation result" };
      }

      const scores = result.category_scores as unknown as Record<string, number>;
      const categories: OmniCategoryScore[] = [];
      for (const [key, score] of Object.entries(scores)) {
        const threshold = thresholds[key];
        if (threshold !== undefined && score >= threshold) {
          categories.push({ category: key, score });
        }
      }

      return { flagged: categories.length > 0, categories };
    } catch (err) {
      return { flagged: true, categories: [], error: `Omni error: ${err instanceof Error ? err.message : "unknown"}` };
    }
  })();
}

export function runL2Input(text: string): Promise<OmniResult> {
  return scoreModeration(text, MODERATION_INPUT_THRESHOLDS);
}

export function runL3Output(text: string): Promise<OmniResult> {
  return scoreModeration(text, MODERATION_OUTPUT_THRESHOLDS);
}
