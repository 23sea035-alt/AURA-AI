// SB 243: periodically remind the user that they are talking to an AI. The prompt-level
// "never claim to be human" invariant is enforced separately in the system prompt (generation
// pipeline); this is the recurring *surfaced* notice, mirroring the break reminder.
//
// The server only decides *when* the notice is due; the client renders the standard disclosure
// copy (UI copy is client-owned). `messageCount` is the running message index for the companion.
const AI_DISCLOSURE_INTERVAL_MESSAGES = 50;

export function shouldShowAiDisclosure(messageCount: number): boolean {
  return messageCount > 0 && messageCount % AI_DISCLOSURE_INTERVAL_MESSAGES === 0;
}
