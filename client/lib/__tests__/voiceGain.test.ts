// Per-persona playback gain map — the measured boost values are owner-tuned; what must hold
// structurally is the selection contract (case-insensitive, safe on unknowns/undefined) and the
// clipping guard: no configured gain may exceed the AVAudioUnitEQ clamp or plausible headroom.
import { describe, it, expect } from 'vitest';

import { PERSONA_GAIN_DB, gainDbFor } from '@/constants/voiceGain';

describe('gainDbFor', () => {
  it('returns the configured boost for a quiet persona', () => {
    expect(gainDbFor('thea')).toBe(PERSONA_GAIN_DB.thea);
  });

  it('is case-insensitive (persona keys arrive from mixed sources)', () => {
    expect(gainDbFor('Thea')).toBe(PERSONA_GAIN_DB.thea);
    expect(gainDbFor('SELENE')).toBe(PERSONA_GAIN_DB.selene);
  });

  it('returns 0 for personas without an entry and for missing keys', () => {
    expect(gainDbFor('wren')).toBe(0);
    expect(gainDbFor('not-a-persona')).toBe(0);
    expect(gainDbFor(undefined)).toBe(0);
    expect(gainDbFor(null)).toBe(0);
    expect(gainDbFor('')).toBe(0);
  });

  it('every configured gain is a positive boost within the native clamp', () => {
    for (const [persona, db] of Object.entries(PERSONA_GAIN_DB)) {
      expect(db, persona).toBeGreaterThan(0);
      expect(db, persona).toBeLessThanOrEqual(24);
    }
  });
});
