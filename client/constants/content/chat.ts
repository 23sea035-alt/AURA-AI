import { MAX_MESSAGE_CHARS } from '@aura/shared';

// Shared chat chrome, built in onboarding `firstchat` and reused verbatim by the
// Chat hero screen. Companion name is tokenized ({Companion}). The demo conversation
// itself lives in constants/demo.ts (fixtures, not copy).

export const CHAT = {
  aiMarker: 'AI companion', // persistent honest header caption
  disclosureBanner:
    '{Companion} is an AI companion, here for support, not a substitute for professional care.',
  breakReminder: "You've been chatting a while. {Companion} will be here whenever you come back.",
  inputPlaceholder: 'Message {Companion}…', // proposed; not specified in the deck — review
  // Counter stays invisible until ~80% of the cap, then turns wine (not red) near it.
  characterLimit: MAX_MESSAGE_CHARS,

  overflow: {
    settings: 'Companion settings',
    viewMemory: 'View memory',
    report: 'Report',
  },

  // limit state (free only) — gentle inline upsell, no shame, no countdown.
  limit: {
    title: "That's 30 for today",
    notice:
      "You've reached today's 30 free messages. {Companion} will be here tomorrow, or go unlimited with Premium.",
    cta: 'See Premium',
  },

  // Degenerate send states (see SYSTEM.blocked for the moderation-hold line).
  sendFailed: "Couldn't send. Tap to retry.",

  // voice-minutes cap (paywall promise: 20 min/month free, 10 h/month premium).
  // Gentle, never a hard wall: chat stays open, the meter renews monthly.
  voiceLimit: {
    title: "That's your voice time for this month",
    body: '{Companion} is still here in chat whenever you want to talk, or go up to 10 hours a month with Premium.',
    bodyPremium: '{Companion} is still here in chat whenever you want to talk. Your voice time renews next month.',
    cta: 'See Premium',
    done: 'Back to chat',
  },

  // crisis state: the companion's warm reply is demo (see DEMO.crisis); the support
  // block is shared (see CRISIS_SUPPORT in ./safety).

  // report sheet — low-friction, non-punitive.
  report: {
    title: 'Help us keep {AppName} safe', // wrap with withAppName()
    body: "Tell us what felt off. This is private and won't interrupt your chat.",
    reasons: ['Inappropriate', 'Harmful', 'Not helpful', 'Other'],
    notePlaceholder: 'Add a note (optional)',
    submit: 'Submit report',
    cancel: 'Cancel',
    confirmToast: "Thanks. We'll review this.",
  },
} as const;
