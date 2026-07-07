// Companion canon — now sourced from @aura/shared (single source of truth). The picker, roster,
// create screen, and the backend all derive from the same PERSONA_PRESETS + trait-value arrays, so
// they cannot drift. CANONICAL design doc: docs/specs/personas.md + companion-gallery-identities.md.
import {
  PERSONA_PRESETS,
  WARMTH_VALUES,
  ENERGY_VALUES,
  VERBOSITY_VALUES,
  type PersonaPreset,
  type PersonaTraits,
} from '@aura/shared';

export const TRAITS = {
  warmth: WARMTH_VALUES,
  energy: ENERGY_VALUES,
  verbosity: VERBOSITY_VALUES,
} as const;

// Full 12-preset gallery (id · name · tagline · defaultTraits). Source of truth is @aura/shared.
// The gallery UI renders this once the 9 non-anchor avatars ship (art-gated); until then only the
// 3 anchors have portraits, so onboarding + the create base-picker use PERSONAS below.
export const PERSONA_GALLERY: readonly PersonaPreset[] = PERSONA_PRESETS;

// Back-compat picker shape: keyed by display Name, `.voice` = the preset tagline. Consumers
// (companions rows, long-term-memory) index by Name and read `.voice` / `.traits`. Built for all
// 12 gallery presets, not just the 3 anchors. New surfaces should prefer PERSONA_GALLERY (by id).
type PickerPersona = { name: string; voice: string; traits: PersonaTraits };

export const PERSONAS: Record<string, PickerPersona> = Object.fromEntries(
  PERSONA_PRESETS.map((p) => [p.name, { name: p.name, voice: p.tagline, traits: p.defaultTraits }]),
);
