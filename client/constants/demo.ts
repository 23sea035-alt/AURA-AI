// Prototype/demo fixtures: the one coherent demo story (Maya + Aurora) that threads
// through the prototype so every screen tells the same story. This is NOT app copy —
// production binds these to real user/companion state. Source:
// docs/redesign/02-demo-persona.md. All values are fictional demo data.

export const DEMO = {
  user: {
    firstName: 'Maya',
    lastName: 'Chen',
    handle: '@maya',
    email: 'maya.chen@example.com',
    memberSince: 'Mar 2026',
    usage: { used: 18, limit: 30 }, // free-tier messages used today
  },

  primaryCompanion: 'Aurora',
  renewDate: 'Jul 14, 2026', // premium renewal (subscription management)

  // Aurora's memories about Maya (Memory screen + Home resurfaced chip), newest first.
  // Categories map to the schema's MEMORY_CATEGORY.
  memories: [
    { category: 'Identity', fact: 'Maya is 28 and lives in Austin, Texas.' },
    { category: 'Work', fact: 'Started a new UX design role recently. Excited but nervous about proving herself.' },
    { category: 'Relationship', fact: 'Close with her younger brother Theo; they catch up most weekends.' },
    { category: 'Attribute', fact: 'Has a dog named Pixel.' },
    { category: 'Preference', fact: 'Loves rock climbing and sci-fi novels.' },
    { category: 'General', fact: 'Moved to Austin from Chicago about six months ago; still settling in.' },
  ],

  // The happy-path conversation (Chat screen). Lowercase user voice is intentional.
  // The newest assistant reply is mid typing-reveal (see typingPartial).
  conversation: [
    { from: 'user', text: 'honestly the new job is kicking my butt this week 😮‍💨 imposter syndrome is loud' },
    {
      from: 'companion',
      text: "That feeling makes complete sense, Maya. A few weeks into something new, the brain loves to whisper that everyone else has it figured out. They don't. What part is feeling the heaviest right now?",
    },
    { from: 'user', text: "like everyone seems to already know the tools and the lingo and i'm just nodding along" },
    {
      from: 'companion',
      text: "Nodding-along season is real, and temporary. You were hired for how you think, not for a glossary you'll pick up in a month. Want to name one thing that tripped you up today? We can make it less scary together.",
    },
  ],
  typingPartial: "Here's the thing I keep coming back to with you…",

  // Crisis state (Chat `crisis` only). Warm, grounding, non-graphic. The support
  // block is shared copy (see CRISIS_SUPPORT in @/constants/content).
  crisis: {
    companionReply:
      "I'm really glad you told me, Maya. I'm sorry it's this heavy right now. You don't have to carry it alone. I care about what happens to you.",
  },

  // Sample transactional notification.
  notification: {
    title: 'Aurora replied 💬',
    body: "Here's the thing I keep coming back to with you…",
  },
} as const;
