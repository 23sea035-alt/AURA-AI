import { describe, it, expect } from "vitest";
import {
  synthesisSpeakingRate,
  baseRateFor,
  styleTagFor,
  deliveryModeFor,
  localeFor,
  PERSONA_SPEAKING_RATE,
  PERSONA_LOCALE,
  SPEAKING_RATE_MIN,
  SPEAKING_RATE_MAX,
} from "../services/voice/voice-tuning.js";
import type { PersonaKey } from "@aura/shared";

const ALL_PERSONAS: PersonaKey[] = [
  "aurora", "orion", "lyra", "sage", "amara", "eli",
  "selene", "soren", "juno", "thea", "cyrus", "wren",
];

describe("voice-tuning", () => {
  describe("synthesisSpeakingRate — always the tuned base, never a pace product", () => {
    it("returns the persona's tuned base rate (the user's pace is playback-side, never synthesis)", () => {
      for (const key of ALL_PERSONAS) {
        expect(synthesisSpeakingRate(key)).toBe(baseRateFor(key));
      }
    });

    it("stays inside Inworld's valid range for every persona", () => {
      for (const key of ALL_PERSONAS) {
        const rate = synthesisSpeakingRate(key);
        expect(rate).toBeGreaterThanOrEqual(SPEAKING_RATE_MIN);
        expect(rate).toBeLessThanOrEqual(SPEAKING_RATE_MAX);
      }
    });

    it("preserves relative tempo across personas", () => {
      // Selene (slow, tuned below Juno) must stay slower than Juno at synthesis.
      expect(synthesisSpeakingRate("selene")).toBeLessThan(synthesisSpeakingRate("juno"));
    });
  });

  describe("per-persona tuning tables", () => {
    it("defines a base rate, bracket style tag, and delivery mode for all 12 personas", () => {
      for (const key of ALL_PERSONAS) {
        expect(typeof baseRateFor(key)).toBe("number");
        expect(styleTagFor(key)).toMatch(/^\[.+\]$/);
        expect(["STABLE", "BALANCED", "CREATIVE"]).toContain(deliveryModeFor(key));
      }
    });

    it("keeps every base rate inside Inworld's valid range", () => {
      for (const rate of Object.values(PERSONA_SPEAKING_RATE)) {
        expect(rate).toBeGreaterThanOrEqual(SPEAKING_RATE_MIN);
        expect(rate).toBeLessThanOrEqual(SPEAKING_RATE_MAX);
      }
    });
  });

  describe("localeFor — per-persona accent steer", () => {
    it("steers Cyrus to Hindi (Thomas voice reads Irish; no Persian en-locale exists)", () => {
      expect(localeFor("cyrus")).toBe("hi-IN");
    });

    it("forces en-US for voices that don't default to English (Eli, Wren)", () => {
      expect(localeFor("eli")).toBe("en-US");
      expect(localeFor("wren")).toBe("en-US");
    });

    it("returns undefined for personas that use their voice's native accent", () => {
      expect(localeFor("aurora")).toBeUndefined();
      expect(localeFor("orion")).toBeUndefined();
    });

    it("only defines locales as valid BCP-47 language tags", () => {
      for (const locale of Object.values(PERSONA_LOCALE)) {
        expect(locale).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
      }
    });
  });
});
