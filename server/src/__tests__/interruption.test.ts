import { describe, it, expect } from "vitest";
import { classifyInterruption } from "../services/voice/interruption.js";

describe("classifyInterruption", () => {
  it('returns "resume" for empty string', () => {
    expect(classifyInterruption("")).toBe("resume");
  });

  it('returns "resume" for whitespace-only string', () => {
    expect(classifyInterruption("   ")).toBe("resume");
  });

  it.each(["yes", "yeah", "ok", "mhm", "uh huh", "yep", "right", "sure", "go on", "got it", "i see"])(
    'returns "interjection" for "%s"',
    (input) => {
      expect(classifyInterruption(input)).toBe("interjection");
    },
  );

  it.each(["Yes!", "Okay.", "YEAH", "Mhm!", "Uh huh?"])(
    'returns "interjection" for "%s" (case/punctuation)',
    (input) => {
      expect(classifyInterruption(input)).toBe("interjection");
    },
  );

  it('returns "detour" for short non-affirmation phrase', () => {
    expect(classifyInterruption("tell me more")).toBe("detour");
  });

  it('returns "detour" for sentence exceeding INTERJECTION_MAX_WORDS', () => {
    expect(classifyInterruption("yes yes yes yes yes yes yes yes")).toBe("detour");
  });

  it('returns "detour" for longer content regardless of affirmation words', () => {
    expect(classifyInterruption("yeah I think we should go to the store today")).toBe("detour");
  });
});
