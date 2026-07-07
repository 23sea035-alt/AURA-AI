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
// (persona.tsx onboarding, create.tsx base-picker, companions/firstchat/long-term-memory) index by
// Name and read `.voice` / `.traits`, so preserve that exact shape for the 3 anchors.
type PickerPersona = { name: string; voice: string; traits: PersonaTraits };
const pick = (id: string): PickerPersona => {
  const p = PERSONA_PRESETS.find((x) => x.id === id)!;
  return { name: p.name, voice: p.tagline, traits: p.defaultTraits };
};

export const PERSONAS = {
  Aurora: pick('aurora'),
  Orion: pick('orion'),
  Lyra: pick('lyra'),
} as const;
