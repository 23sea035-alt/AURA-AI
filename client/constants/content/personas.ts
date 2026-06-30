// Companion canon: names, picker voice lines, and default trait tuning. The
// CANONICAL source is docs/specs/personas.md; this should ultimately derive from
// @aura/shared so the picker, the companions roster, and the backend cannot drift.
// TODO(shared): source PERSONAS / TRAITS from @aura/shared instead of duplicating.

export const TRAITS = {
  warmth: ['reserved', 'warm', 'affectionate'],
  energy: ['calm', 'balanced', 'playful'],
  verbosity: ['concise', 'balanced', 'expansive'],
} as const;

export const PERSONAS = {
  Aurora: {
    name: 'Aurora',
    voice: 'Warm and gentle, a soft place to land.',
    traits: { warmth: 'affectionate', energy: 'calm', verbosity: 'balanced' },
  },
  Orion: {
    name: 'Orion',
    voice: 'Steady and grounded, a calm anchor.',
    traits: { warmth: 'warm', energy: 'calm', verbosity: 'concise' },
  },
  Lyra: {
    name: 'Lyra',
    voice: 'Bright and playful, lifts the mood.',
    traits: { warmth: 'warm', energy: 'playful', verbosity: 'expansive' },
  },
} as const;
