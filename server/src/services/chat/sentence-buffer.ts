/**
 * Incremental sentence buffer for gated streaming.
 *
 * Token deltas arrive from the LLM stream in arbitrary chunks. For sentence-gated output
 * moderation (and better voice TTS intonation), we release text one *sentence* at a time —
 * each completed sentence is moderated (L3) before it is forwarded to the client, so unsafe
 * content is never transmitted.
 *
 * `push()` returns any sentences that completed with the new delta; `flush()` returns whatever
 * remains at stream end (the final sentence, which may lack trailing punctuation/whitespace).
 *
 * Short leading fragments (abbreviations like "Dr.", decimals like "3.14") are merged forward
 * into the next boundary via `minChars`, so we don't over-fragment mid-number or mid-abbreviation.
 */

/** Minimum trimmed length for a chunk to be released as its own sentence (else merge forward). */
export const SENTENCE_MIN_CHARS = 12;

// Sentence-ending punctuation, optional closing quote/bracket, then whitespace (the split point).
const BOUNDARY = /[.!?…]+["'”’)\]]*\s+/g;

export interface SentenceBuffer {
  /** Append a delta; return any sentences that completed. */
  push(delta: string): string[];
  /** Return the remaining buffered text (trimmed) and clear the buffer. */
  flush(): string;
}

export function createSentenceBuffer(minChars: number = SENTENCE_MIN_CHARS): SentenceBuffer {
  let buffer = "";

  return {
    push(delta: string): string[] {
      buffer += delta;
      const sentences: string[] = [];
      BOUNDARY.lastIndex = 0;
      let lastCut = 0;
      let match: RegExpExecArray | null;

      while ((match = BOUNDARY.exec(buffer)) !== null) {
        const candidate = buffer.slice(lastCut, match.index + match[0].length).trim();
        if (candidate.length >= minChars) {
          sentences.push(candidate);
          lastCut = BOUNDARY.lastIndex;
        }
        // else: candidate too short — keep scanning so this fragment merges into the next boundary
      }

      if (lastCut > 0) buffer = buffer.slice(lastCut);
      return sentences;
    },

    flush(): string {
      const rest = buffer.trim();
      buffer = "";
      return rest;
    },
  };
}
