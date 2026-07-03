import { describe, expect, it } from 'vitest';

import { timeAgo } from '../time';

const NOW = new Date('2026-07-03T18:00:00Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe('timeAgo', () => {
  it('under a minute is "Just now"', () => {
    expect(timeAgo(ago(0), NOW)).toBe('Just now');
    expect(timeAgo(ago(59_000), NOW)).toBe('Just now');
  });
  it('minutes, hours, days', () => {
    expect(timeAgo(ago(60_000), NOW)).toBe('1m');
    expect(timeAgo(ago(59 * 60_000), NOW)).toBe('59m');
    expect(timeAgo(ago(60 * 60_000), NOW)).toBe('1h');
    expect(timeAgo(ago(23 * 3_600_000), NOW)).toBe('23h');
    expect(timeAgo(ago(24 * 3_600_000), NOW)).toBe('1d');
    expect(timeAgo(ago(6 * 86_400_000), NOW)).toBe('6d');
  });
  it('past a week becomes a short date', () => {
    expect(timeAgo(ago(8 * 86_400_000), NOW)).toMatch(/^[A-Z][a-z]{2} \d+$/);
  });
  it('future timestamps clamp to "Just now" and garbage is empty', () => {
    expect(timeAgo(ago(-5_000), NOW)).toBe('Just now');
    expect(timeAgo('not-a-date', NOW)).toBe('');
  });
});
