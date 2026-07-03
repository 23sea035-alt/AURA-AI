// Humanize a stored display name for greetings. The Clerk-shaped local auth
// shell derives names from emails ("maya.chen"), which reads as a handle in a
// warm greeting — take the first name-ish segment and title-case it. Once Clerk
// provides a real firstName this becomes a plain passthrough.
export function friendlyFirstName(name?: string | null): string {
  const first = name?.trim().split(/\s+/)[0] ?? '';
  const segment = first.split(/[._\-+]/)[0] ?? '';
  if (!segment) return 'there';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * A second "Aurora" auto-numbers to "Aurora 2" (then 3, 4 …) so companion
 * names stay distinct without blocking the save. Case-insensitive; skips
 * already-taken numbers.
 */
export function autoNumberName(requested: string, takenNames: Iterable<string>): string {
  const taken = new Set([...takenNames].map((n) => n.toLowerCase()));
  if (!taken.has(requested.toLowerCase())) return requested;
  let n = 2;
  while (taken.has(`${requested.toLowerCase()} ${n}`)) n += 1;
  return `${requested} ${n}`;
}
