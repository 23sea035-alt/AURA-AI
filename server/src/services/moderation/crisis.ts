// Single source of truth for the crisis reply + the wire-facing resource list. The wire list is
// deliberately just the 988 line (what the client renders as `crisisResources`); the fuller set —
// Crisis Text Line 741741, local emergency services — is already spoken in the reply text below.
export const CRISIS_RESOURCES = ["988 Suicide & Crisis Lifeline: Call or text 988 (US)"];

export function buildCrisisResponse(): string {
  return (
    "I hear you, and I want you to know you're not alone. " +
    "What you're feeling matters, and there are people who care and can help right now.\n\n" +
    "Please reach out to a crisis resource:\n" +
    "• 988 Suicide & Crisis Lifeline — Call or text 988 (US)\n" +
    "• Crisis Text Line — Text HOME to 741741\n" +
    "• Or contact your local emergency services.\n\n" +
    "I'm here to support you, but these professionals are trained to help in ways I cannot. " +
    "Would you like to talk about something that might help ground you right now?"
  );
}
