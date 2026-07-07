import {
  MAX_ACTIVE_COMPANIONS_FREE,
  MAX_ACTIVE_COMPANIONS_PREMIUM,
  MAX_TOTAL_COMPANIONS_FREE,
} from '@aura/shared';
import { describe, expect, it } from 'vitest';

import type { Companion } from '../models';
import {
  activeOf,
  archivedOf,
  canArchive,
  canCreate,
  canDelete,
  canRestore,
  inferPersonaKey,
  nextPrimaryAfter,
  planRestore,
} from '../roster';

let n = 0;
function companion(overrides: Partial<Companion> = {}): Companion {
  n += 1;
  return {
    id: `c${n}`,
    name: `Companion ${n}`,
    personaKey: 'aurora',
    persona: 'Warm and gentle.',
    traits: ['doting', 'calm', 'balanced'],
    colorFrom: '#000000',
    colorTo: '#ffffff',
    ...overrides,
  };
}

const roster = (active: number, archived: number, overrides: Partial<Companion> = {}) => [
  ...Array.from({ length: active }, () => companion(overrides)),
  ...Array.from({ length: archived }, () => companion({ ...overrides, archivedAt: '2026-07-01T00:00:00.000Z' })),
];

describe('canCreate', () => {
  it('allows a free user under both caps', () => {
    expect(canCreate(roster(4, 3), false)).toEqual({ ok: true });
  });

  it('blocks active-full at the free cap', () => {
    expect(canCreate(roster(MAX_ACTIVE_COMPANIONS_FREE, 0), false)).toEqual({ ok: false, block: 'active_full' });
  });

  it('blocks active-full when a downgraded user sits over the cap (soft-lock, spec §13)', () => {
    expect(canCreate(roster(MAX_ACTIVE_COMPANIONS_FREE + 3, 0), false)).toEqual({ ok: false, block: 'active_full' });
  });

  it('premium raises the active cap', () => {
    expect(canCreate(roster(MAX_ACTIVE_COMPANIONS_FREE, 0), true)).toEqual({ ok: true });
    expect(canCreate(roster(MAX_ACTIVE_COMPANIONS_PREMIUM, 0), true)).toEqual({ ok: false, block: 'active_full' });
  });

  it('total-full wins over active-full (archiving cannot help it)', () => {
    const full = roster(MAX_ACTIVE_COMPANIONS_FREE, MAX_TOTAL_COMPANIONS_FREE - MAX_ACTIVE_COMPANIONS_FREE);
    expect(canCreate(full, false)).toEqual({ ok: false, block: 'total_full' });
  });
});

describe('canArchive (min-1-active)', () => {
  it('allows archiving when another active remains', () => {
    const cs = roster(2, 0);
    expect(canArchive(cs, [cs[0].id])).toEqual({ ok: true });
  });

  it('blocks archiving the last active companion', () => {
    const cs = roster(1, 2);
    expect(canArchive(cs, [cs[0].id])).toEqual({ ok: false, block: 'last_active' });
  });

  it('blocks a batch that would archive every active companion', () => {
    const cs = roster(3, 0);
    expect(canArchive(cs, cs.map((c) => c.id))).toEqual({ ok: false, block: 'last_active' });
  });

  it('ignores already-archived ids in the selection', () => {
    const cs = roster(1, 1);
    expect(canArchive(cs, [archivedOf(cs)[0].id])).toEqual({ ok: true });
  });
});

describe('canDelete', () => {
  it('base personas disable delete for the whole selection', () => {
    const base = companion({ isDefault: true });
    const custom = companion();
    expect(canDelete([base, custom], [base.id, custom.id])).toEqual({ ok: false, block: 'base_delete' });
  });

  it('custom companions are deletable (including by free users)', () => {
    const cs = roster(2, 0);
    expect(canDelete(cs, [cs[0].id])).toEqual({ ok: true });
  });

  it('blocks deleting the last active companion', () => {
    const cs = roster(1, 3);
    expect(canDelete(cs, [cs[0].id])).toEqual({ ok: false, block: 'last_active' });
  });

  it('archived companions delete freely (never trips min-1-active)', () => {
    const cs = roster(1, 2);
    expect(canDelete(cs, archivedOf(cs).map((c) => c.id))).toEqual({ ok: true });
  });
});

describe('canRestore / planRestore', () => {
  it('blocks a single restore at the active cap', () => {
    expect(canRestore(roster(MAX_ACTIVE_COMPANIONS_FREE, 1), false)).toEqual({ ok: false, block: 'active_full' });
    expect(canRestore(roster(2, 1), false)).toEqual({ ok: true });
  });

  it('fills up to the remaining slots and reports the rest', () => {
    const cs = roster(MAX_ACTIVE_COMPANIONS_FREE - 2, 4);
    const ids = archivedOf(cs).map((c) => c.id);
    const plan = planRestore(cs, ids, false);
    expect(plan.restoreIds).toEqual(ids.slice(0, 2));
    expect(plan.blockedCount).toBe(2);
  });

  it('restores everything when there is room', () => {
    const cs = roster(1, 2);
    const ids = archivedOf(cs).map((c) => c.id);
    expect(planRestore(cs, ids, false)).toEqual({ restoreIds: ids, blockedCount: 0 });
  });

  it('ignores non-archived ids and clamps at zero room', () => {
    const cs = roster(MAX_ACTIVE_COMPANIONS_FREE + 1, 2); // over-cap (downgrade)
    const ids = [activeOf(cs)[0].id, ...archivedOf(cs).map((c) => c.id)];
    expect(planRestore(cs, ids, false)).toEqual({ restoreIds: [], blockedCount: 2 });
  });
});

describe('nextPrimaryAfter', () => {
  it('keeps the pin when it is not leaving', () => {
    const cs = roster(3, 0);
    expect(nextPrimaryAfter(cs, [cs[1].id], cs[0].id)).toBe(cs[0].id);
  });

  it('re-pins the next active survivor when the pinned one leaves', () => {
    const cs = roster(3, 0);
    expect(nextPrimaryAfter(cs, [cs[0].id], cs[0].id)).toBe(cs[1].id);
  });

  it('re-pins once for a batch, skipping every leaving id', () => {
    const cs = roster(3, 0);
    expect(nextPrimaryAfter(cs, [cs[0].id, cs[1].id], cs[0].id)).toBe(cs[2].id);
  });

  it('picks a survivor when nothing was pinned (empty pin)', () => {
    const cs = roster(2, 0);
    expect(nextPrimaryAfter(cs, [], '')).toBe(cs[0].id);
  });

  it('returns empty only when no active survivor remains', () => {
    const cs = roster(1, 1);
    expect(nextPrimaryAfter(cs, [cs[0].id], cs[0].id)).toBe('');
  });
});

describe('inferPersonaKey (legacy row migration)', () => {
  it('gallery row ids win', () => {
    expect(inferPersonaKey({ id: 'wren', name: 'Renamed', traits: [] })).toBe('wren');
  });

  it('falls back to a name match, then traits, then aurora', () => {
    expect(inferPersonaKey({ id: 'local-1', name: 'Juno', traits: [] })).toBe('juno');
    expect(inferPersonaKey({ id: 'local-2', name: 'Custom', traits: ['warm', 'playful', 'expansive'] })).toBe('lyra');
    expect(inferPersonaKey({ id: 'local-3', name: 'Custom', traits: ['warm', 'calm', 'concise'] })).toBe('orion');
    expect(inferPersonaKey({ id: 'local-4', name: 'Custom', traits: ['doting', 'calm', 'balanced'] })).toBe('aurora');
  });
});
