// Pure thread-presentation logic for the chat screen: serif day dividers,
// same-sender grouping/tails, per-message attachments (send-state captions,
// AI notice, crisis card) as their own rows, reversed for the inverted list.
// No React/RN imports — unit-tested in __tests__/thread.test.ts.

/** Structural subset of context Message that thread building needs. */
export interface ThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  audioUri?: string;
  status?: 'failed' | 'blocked';
  aiDisclosure?: boolean;
  safetyFlagged?: boolean;
}

export type ThreadRow<M extends ThreadMessage = ThreadMessage> =
  | { kind: 'divider'; key: string; label: string }
  | { kind: 'message'; key: string; msg: M; grouped: boolean; tail: boolean }
  | { kind: 'time'; key: string; msg: M }
  | { kind: 'sendState'; key: string; msg: M }
  | { kind: 'notice'; key: string }
  | { kind: 'crisis'; key: string };

/** Serif chapter label for a thread date: Today / Yesterday / "June 26". */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOf(now) - startOf(date)) / 86400000);
  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export interface ThreadRowOptions {
  /** Message currently mid typing-reveal — its notice/crisis rows wait for the reveal to finish. */
  revealId?: string | null;
  /** Message whose on-demand timestamp is toggled open. */
  timeFor?: string | null;
  now?: Date;
}

/**
 * Build the inverted list's rows from a chronological message window.
 * Returned array is REVERSED (index 0 renders at the visual bottom).
 */
export function buildThreadRows<M extends ThreadMessage>(
  windowed: readonly M[],
  { revealId = null, timeFor = null, now = new Date() }: ThreadRowOptions = {},
): ThreadRow<M>[] {
  const out: ThreadRow<M>[] = [];
  let lastDay = '';
  for (let i = 0; i < windowed.length; i++) {
    const msg = windowed[i];
    const prev = windowed[i - 1];
    const next = windowed[i + 1];
    const label = dayLabel(msg.createdAt, now);
    if (label !== lastDay) {
      lastDay = label;
      out.push({ kind: 'divider', key: `day-${label}-${msg.id}`, label });
    }
    // Grouping: consecutive same-sender, same day, unbroken by a send-state
    // caption. Only the last bubble of a group keeps the tail.
    const grouped =
      !!prev && prev.role === msg.role && dayLabel(prev.createdAt, now) === label && !prev.status;
    const tail =
      !next || next.role !== msg.role || dayLabel(next.createdAt, now) !== label || !!msg.status;
    out.push({ kind: 'message', key: msg.id, msg, grouped, tail });
    if (timeFor === msg.id) {
      out.push({ kind: 'time', key: `time-${msg.id}`, msg });
    }
    if (msg.status === 'failed' || msg.status === 'blocked') {
      out.push({ kind: 'sendState', key: `state-${msg.id}`, msg });
    }
    if (msg.role === 'assistant' && msg.aiDisclosure && msg.id !== revealId) {
      out.push({ kind: 'notice', key: `notice-${msg.id}` });
    }
    if (msg.role === 'assistant' && msg.safetyFlagged && msg.id !== revealId) {
      out.push({ kind: 'crisis', key: `crisis-${msg.id}` });
    }
  }
  return out.reverse();
}
