import type { PersonaKey } from "@aura/shared";
import type { DeliveryMode } from "./inworld-tts.js";

// Per-persona VOICE tuning — part of persona IDENTITY, not a user setting. Each persona carries a
// bracket style tag (steers Inworld prosody), a delivery mode, and a BASE speaking rate. The user's
// SPEAKING PACE setting is a separate MULTIPLIER applied on top of the base rate (see
// effectiveSpeakingRate), so pace scales every persona while preserving their relative tempo — e.g.
// Selene stays slower than Juno at every pace. Values derive from the character specs in
// docs/specs/companion-gallery-identities.md. Only the 3 anchors are voice-cast today; the 9 gallery
// entries are pre-tuned and dormant until their Inworld voiceId is assigned (getVoiceId).

export const DEFAULT_STYLE_TAG = "[warm and gentle]";
export const DEFAULT_DELIVERY_MODE: DeliveryMode = "BALANCED";
export const DEFAULT_SPEAKING_RATE = 1.0;

export const PERSONA_STYLE_TAG: Partial<Record<PersonaKey, string>> = {
  aurora: "[warm and gentle]",
  orion: "[direct and grounded]",
  lyra: "[bright and expressive]",
  sage: "[calm and measured]",
  amara: "[warm and effusive]",
  eli: "[easygoing and warm]",
  selene: "[tender and unhurried]",
  soren: "[dry and understated]",
  juno: "[bright and upbeat]",
  thea: "[soft and reassuring]",
  cyrus: "[warm and wise]",
  wren: "[curious and reflective]",
};

export const PERSONA_DELIVERY_MODE: Partial<Record<PersonaKey, DeliveryMode>> = {
  aurora: "BALANCED",
  orion: "STABLE",
  lyra: "CREATIVE",
  sage: "STABLE",
  amara: "CREATIVE",
  eli: "BALANCED",
  selene: "BALANCED",
  soren: "STABLE",
  juno: "CREATIVE",
  thea: "BALANCED",
  cyrus: "STABLE",
  wren: "BALANCED",
};

// Base tempo per persona (Inworld speakingRate; the pace multiplier scales this, clamped 0.5–1.5).
export const PERSONA_SPEAKING_RATE: Partial<Record<PersonaKey, number>> = {
  aurora: 0.98,
  orion: 0.95,
  lyra: 1.05,
  sage: 0.88,
  amara: 1.05,
  eli: 1.0,
  selene: 0.9,
  soren: 0.98,
  juno: 1.1,
  thea: 0.95,
  cyrus: 0.9,
  wren: 0.98,
};

// Inworld's supported speakingRate range — the effective rate is clamped to this after multiplying.
export const SPEAKING_RATE_MIN = 0.5;
export const SPEAKING_RATE_MAX = 1.5;

/**
 * Combine a persona's BASE speaking rate with the user's pace multiplier, clamped to Inworld's
 * 0.5–1.5 range. e.g. Selene base 0.9 × 1.2 (brisk) = 1.08; × 1.0 (natural) = 0.9. The clamp keeps a
 * fast persona × a fast pace (or a slow × slow) inside the API's valid band.
 */
export function effectiveSpeakingRate(base: number, multiplier: number): number {
  return Math.min(SPEAKING_RATE_MAX, Math.max(SPEAKING_RATE_MIN, base * multiplier));
}

export function styleTagFor(personaKey: PersonaKey): string {
  return PERSONA_STYLE_TAG[personaKey] ?? DEFAULT_STYLE_TAG;
}
export function deliveryModeFor(personaKey: PersonaKey): DeliveryMode {
  return PERSONA_DELIVERY_MODE[personaKey] ?? DEFAULT_DELIVERY_MODE;
}
export function baseRateFor(personaKey: PersonaKey): number {
  return PERSONA_SPEAKING_RATE[personaKey] ?? DEFAULT_SPEAKING_RATE;
}
