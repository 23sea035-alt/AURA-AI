// Age helpers for the DOB age gate. Framework-agnostic (no RN imports) so they can move to
// @aura/shared if the backend later needs to derive an age bracket from a stored DOB.

export const MIN_AGE = 18;

/** Whole-years age as of `now` (defaults to today; pass a fixed date in tests). */
export function ageFromDate(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

/** True when the DOB makes the user at least MIN_AGE. */
export function isAdult(dob: Date, now: Date = new Date()): boolean {
  return ageFromDate(dob, now) >= MIN_AGE;
}
