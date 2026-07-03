import { describe, expect, it } from 'vitest';

import { buildThreadRows, dayLabel, type ThreadMessage } from '../thread';

const NOW = new Date('2026-07-03T18:00:00Z');

function msg(overrides: Partial<ThreadMessage> & { id: string }): ThreadMessage {
  return {
    role: 'user',
    content: `content of ${overrides.id}`,
    createdAt: '2026-07-03T12:00:00Z',
    ...overrides,
  };
}

describe('dayLabel', () => {
  it('labels today / yesterday / older dates', () => {
    // Local-time strings (no zone suffix) keep this test timezone-agnostic —
    // dayLabel compares LOCAL calendar days.
    const localNow = new Date('2026-07-03T18:00:00');
    expect(dayLabel('2026-07-03T01:00:00', localNow)).toBe('Today');
    expect(dayLabel('2026-07-02T23:59:00', localNow)).toBe('Yesterday');
    expect(dayLabel('2026-06-26T12:00:00', localNow)).toBe('June 26');
  });
});

describe('buildThreadRows', () => {
  it('reverses rows for the inverted list (newest first)', () => {
    const rows = buildThreadRows([msg({ id: 'a' }), msg({ id: 'b', role: 'assistant' })], { now: NOW });
    expect(rows.map((r) => r.key)).toEqual(['b', 'a', expect.stringContaining('day-')]);
  });

  it('inserts one divider per day, before that day’s messages (in visual order)', () => {
    const rows = buildThreadRows(
      [
        msg({ id: 'old', createdAt: '2026-07-01T10:00:00Z' }),
        msg({ id: 'new', createdAt: '2026-07-03T10:00:00Z' }),
      ],
      { now: NOW },
    );
    // reversed: [new, day-Today, old, day-July 1]
    expect(rows.map((r) => r.kind)).toEqual(['message', 'divider', 'message', 'divider']);
  });

  it('groups consecutive same-sender messages and keeps the tail on the last only', () => {
    const rows = buildThreadRows(
      [msg({ id: 'u1' }), msg({ id: 'u2' }), msg({ id: 'a1', role: 'assistant' })],
      { now: NOW },
    );
    const byKey = Object.fromEntries(rows.filter((r) => r.kind === 'message').map((r) => [r.key, r]));
    expect(byKey.u1).toMatchObject({ grouped: false, tail: false });
    expect(byKey.u2).toMatchObject({ grouped: true, tail: true });
    expect(byKey.a1).toMatchObject({ grouped: false, tail: true });
  });

  it('a send-state caption breaks grouping and forces the tail', () => {
    const rows = buildThreadRows(
      [msg({ id: 'u1', status: 'failed' }), msg({ id: 'u2' })],
      { now: NOW },
    );
    const byKey = Object.fromEntries(rows.filter((r) => r.kind === 'message').map((r) => [r.key, r]));
    expect(byKey.u1).toMatchObject({ tail: true });
    expect(byKey.u2).toMatchObject({ grouped: false });
    expect(rows.some((r) => r.kind === 'sendState' && r.key === 'state-u1')).toBe(true);
  });

  it('adds notice and crisis rows after flagged assistant turns, but not mid-reveal', () => {
    const flagged = [msg({ id: 'a1', role: 'assistant', aiDisclosure: true, safetyFlagged: true })] as const;
    const settled = buildThreadRows(flagged, { now: NOW });
    expect(settled.map((r) => r.kind)).toEqual(['crisis', 'notice', 'message', 'divider']);
    const revealing = buildThreadRows(flagged, { now: NOW, revealId: 'a1' });
    expect(revealing.map((r) => r.kind)).toEqual(['message', 'divider']);
  });

  it('adds a time row only for the toggled message', () => {
    const rows = buildThreadRows([msg({ id: 'u1' }), msg({ id: 'u2' })], { now: NOW, timeFor: 'u1' });
    expect(rows.filter((r) => r.kind === 'time').map((r) => r.key)).toEqual(['time-u1']);
  });
});
