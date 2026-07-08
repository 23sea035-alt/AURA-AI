// Home tab ("the companion's room"). Tokens: {firstName}, {Companion}, {used}/{limit}.

export const HOME = {
  greetings: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
  greetingTemplate: '{greeting}, {firstName}', // demo: "Good afternoon, Maya"
  // header AI marker: see CHAT.aiMarker
  remembersLabel: '{Companion} remembers', // card eyebrow (uppercased in UI)
  // card line comes from companion.rememberQuestion (consolidation cache); demo line in demo.ts
  // Starter chips. Tapping one opens the chat with ONE of its `templates`
  // pre-filled at random: each template is a sentence OPENER the user finishes,
  // so their words append only at the end (never a fill-in-the-middle blank).
  // Every opener ends with a trailing space or punctuation + space. No em dashes.
  starters: {
    empty: [{ label: 'Tell {Companion} a little about your day', templates: [] as readonly string[] }],
    active: [
      {
        label: 'Talk through what’s on my mind',
        templates: [
          'Okay, the thing that keeps circling in my head is ',
          "Honestly, what's weighing on me most right now is ",
          "I haven't said this out loud yet, but ",
          'I keep going back and forth about ',
          "Something I can't quite untangle is ",
        ] as readonly string[],
      },
      {
        label: 'Share something good that happened',
        templates: [
          'Small win today: ',
          'Something good happened that I want to hold onto: ',
          'Okay, I have to tell someone about ',
          'Today surprised me in a good way, ',
          "I'm still smiling about ",
        ] as readonly string[],
      },
    ],
  },
  cta: 'Continue your conversation',
  empty: {
    line: "{Companion}'s been looking forward to meeting you.",
    cta: 'Say hello',
  },
  error: "We couldn't reach {Companion} just now.", // pair with SYSTEM.error.retry
  usageTemplate: '{used} / {limit} messages today', // free only; demo 18 / 30. Hidden for premium.
} as const;
