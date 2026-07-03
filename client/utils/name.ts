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
