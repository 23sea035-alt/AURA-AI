// Curated "looks" — outfit recolors of a persona's portrait. A look tints ONLY the apparel (the
// garment art is pre-baked per persona, see components/companion/portraits.ts + the bake script),
// never the whole avatar. This catalog is just the labels + a swatch color for the picker; which
// looks a given persona actually offers comes from looksAvailableFor(personaId) (art-gated).
export interface Look {
  id: string;
  label: string;
  /** Chip color for the picker — the garment's target tone (Warm Sanctuary). */
  swatch: string;
}

export const LOOKS: Look[] = [
  { id: 'default', label: 'Default', swatch: '#EADFCB' }, // the original cream cardigan
  { id: 'sage', label: 'Sage', swatch: '#6F8168' },
  { id: 'rose', label: 'Rose', swatch: '#9E5A63' },
  { id: 'dusk', label: 'Dusk', swatch: '#5E6E82' },
];

export const DEFAULT_LOOK_ID = 'default';

export function lookById(id: string | undefined): Look {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[0];
}
