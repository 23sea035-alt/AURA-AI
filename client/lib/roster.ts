// Roster lifecycle policy (docs/specs/companion-roster.md) — pure functions, no IO, unit-tested.
// The client's single source for cap checks, min-1-active guards, delete gating,
// batch-restore planning, and the pinned-companion fallback. AppContext consumes these before its
// optimistic writes; the server re-enforces the same rules authoritatively (spec §9).
import { activeCompanionCap, totalCompanionCap, PERSONA_PRESETS } from '@aura/shared';

import type { Companion } from '@/lib/models';

/** Why a roster action was refused — maps 1:1 onto the server's 409 codes. */
export type RosterBlock = 'active_full' | 'total_full' | 'last_active';

export type RosterCheck = { ok: true } | { ok: false; block: RosterBlock };

export const activeOf = (companions: Companion[]): Companion[] => companions.filter((c) => !c.archivedAt);
export const archivedOf = (companions: Companion[]): Companion[] => companions.filter((c) => !!c.archivedAt);

/**
 * Create gate (spec §4): total-full first (archiving can't help it — archived rows still count),
 * then active-full. `>=` also covers the §13 downgrade soft-lock, where a premium→free user sits
 * OVER the free cap: existing companions stay usable, new creates stay blocked.
 */
export function canCreate(companions: Companion[], isPremium: boolean): RosterCheck {
  if (companions.length >= totalCompanionCap(isPremium)) return { ok: false, block: 'total_full' };
  if (activeOf(companions).length >= activeCompanionCap(isPremium)) return { ok: false, block: 'active_full' };
  return { ok: true };
}

/** Min-1-active (spec §6): a batch may not archive every active companion. Ids not currently
 * active are ignored (idempotence — archiving an archived row changes nothing). */
export function canArchive(companions: Companion[], ids: string[]): RosterCheck {
  const active = activeOf(companions);
  const leaving = active.filter((c) => ids.includes(c.id)).length;
  if (leaving > 0 && leaving >= active.length) return { ok: false, block: 'last_active' };
  return { ok: true };
}

/**
 * Delete gate (spec §6): any companion is deletable — the only guard is min-1-active (you can't
 * delete your last active companion). Deleting archived rows never trips it.
 */
export function canDelete(companions: Companion[], ids: string[]): RosterCheck {
  const active = activeOf(companions);
  const leaving = active.filter((c) => ids.includes(c.id)).length;
  if (leaving > 0 && leaving >= active.length) return { ok: false, block: 'last_active' };
  return { ok: true };
}

/** Restore gate (spec §6/§8): re-activating consumes a slot; reading never does. */
export function canRestore(companions: Companion[], isPremium: boolean): RosterCheck {
  if (activeOf(companions).length >= activeCompanionCap(isPremium)) return { ok: false, block: 'active_full' };
  return { ok: true };
}

/**
 * Batch restore fills up to the remaining active slots and reports the rest, rather than
 * half-failing silently (spec §6). Order follows the ids as passed (the selection order).
 */
export function planRestore(
  companions: Companion[],
  ids: string[],
  isPremium: boolean,
): { restoreIds: string[]; blockedCount: number } {
  const archivedIds = new Set(archivedOf(companions).map((c) => c.id));
  const eligible = ids.filter((id) => archivedIds.has(id));
  const room = Math.max(0, activeCompanionCap(isPremium) - activeOf(companions).length);
  return { restoreIds: eligible.slice(0, room), blockedCount: Math.max(0, eligible.length - room) };
}

/**
 * Pinned-companion fallback (spec §6): archiving/deleting the Home-pinned companion re-pins the
 * next active survivor (never leaves Home pointing at nothing). Batch callers invoke this once,
 * after the batch settles. Returns the current pin unchanged when it isn't leaving.
 */
export function nextPrimaryAfter(companions: Companion[], leavingIds: string[], currentPrimary: string): string {
  if (currentPrimary && !leavingIds.includes(currentPrimary)) return currentPrimary;
  const survivor = activeOf(companions).find((c) => !leavingIds.includes(c.id));
  return survivor?.id ?? '';
}

/**
 * Base persona for rows persisted before personaKey was first-class: gallery ids (the mock trio
 * stores the preset id as the row id) win, then a name match, then a trait heuristic, then Aurora.
 * Mirrors what lib/live.ts used to infer per-request; now inferred once at migration.
 */
export function inferPersonaKey(c: Pick<Companion, 'id' | 'name' | 'traits'>): string {
  const byId = PERSONA_PRESETS.find((p) => p.id === c.id.toLowerCase());
  if (byId) return byId.id;
  const byName = PERSONA_PRESETS.find((p) => p.name.toLowerCase() === c.name.toLowerCase());
  if (byName) return byName.id;
  if (c.traits.includes('playful')) return 'lyra';
  if (c.traits.includes('concise')) return 'orion';
  return 'aurora';
}
