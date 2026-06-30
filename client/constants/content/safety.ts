// Crisis support + Safety-center copy. The crisis block is the product's signature
// care moment: grounding and supportive, NEVER alarm-red. ONE canonical block,
// reused by Chat's crisis state, the AI-disclosure card, and the Safety center.
// Companion names/pronouns are tokenized so the block stays companion-agnostic.

export const CRISIS_SUPPORT = {
  intro: "If you're thinking about harming yourself, please reach out. People want to help.",
  lifeline: { action: 'Call or text 988', name: 'Suicide & Crisis Lifeline', detail: 'US, 24/7' },
  textLine: { action: 'Text HOME to 741741', name: 'Crisis Text Line' },
  buttons: { call: 'Call 988', text: 'Text 988' },
  keepTalking: '{Companion} is still here whenever you want to keep talking.',
} as const;

export const SAFETY = {
  moderation: '{AppName} watches for harmful content and steps in gently.',
  disclosure: 'Your companions are AI. Supportive company, never a substitute for professional care.',
  // crisis resources: see CRISIS_SUPPORT (shared verbatim with Chat's crisis state).
} as const;
