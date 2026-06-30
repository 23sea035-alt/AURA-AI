// Shared chat chrome, built in onboarding `firstchat` and reused verbatim by the
// Chat hero screen. Companion name is tokenized ({Companion}). The demo conversation
// itself lives in constants/demo.ts (fixtures, not copy).

export const CHAT = {
  aiMarker: 'AI companion', // persistent honest header caption
  disclosureBanner:
    '{Companion} is an AI companion, here for support, not a substitute for professional care.',
  breakReminder: "You've been chatting a while. {Companion} will be here whenever you come back. 💛",
  inputPlaceholder: 'Message {Companion}…', // proposed; not specified in the deck — review
  characterLimit: 2000, // counter stays invisible until ~80%, then turns wine (not red) near the cap

  overflow: {
    settings: 'Companion settings',
    viewMemory: 'View memory',
    report: 'Report',
  },

  // limit state (free only) — gentle inline upsell, no shame, no countdown.
  limit: {
    notice:
      "You've reached today's 30 free messages. {Companion} will be here tomorrow, or go unlimited with Premium.",
    cta: 'See Premium',
  },

  // crisis state: the companion's warm reply is demo (see DEMO.crisis); the support
  // block is shared (see CRISIS_SUPPORT in ./safety).

  // report sheet — low-friction, non-punitive.
  report: {
    title: 'Help us keep {AppName} safe',
    reasons: ['Inappropriate', 'Harmful', 'Not helpful', 'Other'],
    submit: 'Submit report',
    cancel: 'Cancel',
    confirmToast: "Thanks. We'll review this.",
  },
} as const;
