import { z } from "zod";

export type LlmJsonResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Extract and schema-validate JSON from raw LLM text.
 *
 * Models wrap JSON in markdown fences, lead with prose, or return a shape that
 * parses but doesn't match the contract — bare `JSON.parse(x) as T` treats all
 * of those as success and hands garbage to safety-critical branches (the
 * pre-zod safeguard fail-OPENed on `{}`). This helper tries the raw text, the
 * fenced block, and the outermost {...}/[...] slice, and only returns ok when
 * the parsed value passes the caller's zod schema. Callers decide what a
 * failure means (moderation fails closed, consolidation falls back).
 */
export function parseLlmJson<S extends z.ZodTypeAny>(raw: string, schema: S): LlmJsonResult<z.output<S>> {
  const trimmed = raw.trim();
  const candidates = [trimmed];

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) candidates.push(fence[1].trim());

  const start = trimmed.search(/[{[]/);
  const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
  if (start !== -1 && end > start) candidates.push(trimmed.slice(start, end + 1));

  let shapeError: string | null = null;
  for (const candidate of candidates) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(candidate);
    } catch {
      continue; // not JSON — try the next extraction
    }
    const result = schema.safeParse(parsed);
    if (result.success) return { ok: true, data: result.data };
    shapeError = result.error.issues[0]?.message ?? "schema mismatch";
  }

  return {
    ok: false,
    error: shapeError
      ? `LLM JSON failed schema: ${shapeError}`
      : `LLM output is not JSON: ${trimmed.slice(0, 120)}`,
  };
}
