import { INTERJECTION_MAX_WORDS } from "@aura/shared";

export type InterruptionClass = "resume" | "interjection" | "detour";

// Short non-lexical tokens and affirmations that signal "keep going" rather than a new topic.
const AFFIRMATION_RE = /^(yeah|yes|yep|ok|okay|right|mhm|mm|uh huh|sure|go on|continue|and|so|hmm|uh|um|got it|i see)[.!?]*$/i;

export function classifyInterruption(transcript: string): InterruptionClass {
  const trimmed = transcript.trim();
  if (!trimmed) return "resume";

  const words = trimmed.split(/\s+/);
  if (words.length <= INTERJECTION_MAX_WORDS && AFFIRMATION_RE.test(trimmed)) {
    return "interjection";
  }

  return "detour";
}
