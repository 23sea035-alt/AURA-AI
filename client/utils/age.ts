// Age helpers for the DOB age gate. The policy number (18+) lives in @aura/shared — the server's
// registration check derives from the same constant; only the calendar math is local.

import { MIN_AGE } from '@aura/shared';

/** Whole-years age as of `now` (defaults to today; pass a fixed date in tests). */
function ageFromDate(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** True when the DOB makes the user at least MIN_AGE. */
export function isAdult(dob: Date, now: Date = new Date()): boolean {
  return ageFromDate(dob, now) >= MIN_AGE;
}
