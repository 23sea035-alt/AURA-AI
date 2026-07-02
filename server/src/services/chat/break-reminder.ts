const MINOR_BREAK_INTERVAL_MS = 3 * 60 * 60 * 1000;
const ADULT_BREAK_INTERVAL_MS = 6 * 60 * 60 * 1000;

export interface BreakReminderResult {
  remind: boolean;
  reason?: string;
}

export function shouldShowBreakReminder(
  turnNumber: number,
  sessionStartTime: Date,
  isMinor: boolean,
): BreakReminderResult {
  const elapsed = Date.now() - sessionStartTime.getTime();
  const interval = isMinor ? MINOR_BREAK_INTERVAL_MS : ADULT_BREAK_INTERVAL_MS;

  if (elapsed >= interval) {
    const hours = Math.floor(interval / (60 * 60 * 1000));
    if (isMinor) {
      return { remind: true, reason: `You've been chatting for ${hours} hours — time to take a break.` };
    }
    return { remind: true, reason: `You've been chatting for ${hours} hours. Take a moment to breathe.` };
  }

  // Turn-based cadence (each turn = 2 messages, so a raw message index is always odd and a
  // per-message modulo would never land): ~every 5 turns (minor) / 10 turns (adult).
  if (isMinor && turnNumber > 0 && turnNumber % 5 === 0) {
    return { remind: true, reason: "You've been chatting for a while — want to take a break?" };
  }
  if (turnNumber > 0 && turnNumber % 10 === 0) {
    return { remind: true, reason: "Take a moment to breathe and check in with yourself." };
  }

  return { remind: false };
}
