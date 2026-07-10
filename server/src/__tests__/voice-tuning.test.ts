import { describe, it, expect } from "vitest";
import {
  effectiveSpeakingRate,
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
  describe("effectiveSpeakingRate — the SPEAKING PACE multiplier", () => {
    it("natural pace (1.0) leaves the persona base rate unchanged", () => {
      expect(effectiveSpeakingRate(0.9, 1.0)).toBeCloseTo(0.9); // Selene stays 0.9
    });

    it("multiplies the persona base by the pace setting", () => {
      expect(effectiveSpeakingRate(0.9, 1.2)).toBeCloseTo(1.08); // Selene 0.9 × brisk 1.2
      expect(effectiveSpeakingRate(1.1, 1.2)).toBeCloseTo(1.32); // Juno 1.1 × 1.2
    });

    it("clamps above Inworld's max", () => {
      expect(effectiveSpeakingRate(1.1, 1.5)).toBe(SPEAKING_RATE_MAX); // 1.65 → 1.5
    });

    it("clamps below Inworld's min", () => {
      expect(effectiveSpeakingRate(0.88, 0.5)).toBe(SPEAKING_RATE_MIN); // 0.44 → 0.5
    });

    it("preserves relative tempo across personas at the same pace", () => {
      const pace = 1.15;
      // Selene (slow, 0.9) must stay slower than Juno (fast, 1.1) at every pace.
      expect(effectiveSpeakingRate(baseRateFor("selene"), pace))
        .toBeLessThan(effectiveSpeakingRate(baseRateFor("juno"), pace));
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
