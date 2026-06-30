// Home tab ("the companion's room"). Tokens: {firstName}, {Companion}, {used}/{limit}.

export const HOME = {
  greetings: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
  greetingTemplate: '{greeting}, {firstName}', // demo: "Good afternoon, Maya"
  // header AI marker: see CHAT.aiMarker
  resurfacedMemory: "{Companion} remembers you started a new job. How's it going?",
  cta: 'Continue your conversation',
  empty: {
    line: "{Companion}'s been looking forward to meeting you.",
    cta: 'Say hello',
  },
  error: "We couldn't reach {Companion} just now.", // pair with SYSTEM.error.retry
  usageTemplate: '{used} / {limit} today', // free only; demo 18 / 30. Hidden for premium.
} as const;
