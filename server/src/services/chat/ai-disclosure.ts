// SB 243: periodically remind the user that they are talking to an AI. The prompt-level
// "never claim to be human" invariant is enforced separately in the system prompt (generation
// pipeline); this is the recurring *surfaced* notice, mirroring the break reminder.
//
// The server only decides *when* the notice is due; the client renders the standard disclosure
// copy (UI copy is client-owned). Cadence is per TURN, not per message — every turn writes two
// rows (user + assistant), so a message index is always odd and `% N` (N even) would never fire.
const AI_DISCLOSURE_INTERVAL_TURNS = 25;

export function shouldShowAiDisclosure(turnNumber: number): boolean {
  return turnNumber > 0 && turnNumber % AI_DISCLOSURE_INTERVAL_TURNS === 0;
}
