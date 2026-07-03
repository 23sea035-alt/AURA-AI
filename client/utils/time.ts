// Relative-time display for stored ISO timestamps. Purely presentational: the
// server owns the timestamps (companions.updated_at etc.); the client derives
// "Just now → 3m → 2h → 4d → Jun 26" at render time and re-derives on a timer
// (useNow) so labels never go stale between fetches.
import { useEffect, useState } from 'react';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "Just now" (<1m) → minutes → hours → days → a short date past a week. */
export function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const delta = Math.max(0, nowMs - then);
  if (delta < MIN) return 'Just now';
  if (delta < HOUR) return `${Math.floor(delta / MIN)}m`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h`;
  if (delta < 7 * DAY) return `${Math.floor(delta / DAY)}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Ticking clock for live relative-time labels; one interval per screen. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
