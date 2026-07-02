// Informational utility screens: Privacy / legal and Help / support FAQ.
// Tokens: {AppName}, {Companion}.

export const LEGAL = {
  title: 'Privacy policy',
  retentionSummary:
    'In plain terms: your conversations are yours. We keep them so {Companion} can remember you, and you can export or delete everything anytime.',
  sections: [
    {
      title: 'What we collect',
      body: "Your messages, the memories your companion saves, and basic account details like your name and email. We don't collect data we don't need, and we never sell it.",
    },
    {
      title: 'Why we keep it',
      body: 'Conversations and memories are stored so your companion can remember you between visits. That continuity is the point. Account details let us keep your subscription and sign-in working.',
    },
    {
      title: 'Who can see it',
      body: "Your conversations are private to you. A small amount of content may be processed automatically to keep things safe (see the Safety center), but we don't share your chats with advertisers or third parties.",
    },
    {
      title: 'Your controls',
      body: 'You can export a copy of everything, or delete your account, at any time from Privacy & Safety. Deletion is permanent after a 30-day grace period.',
    },
  ],
  lastUpdated: 'Last updated June 24, 2026',
  fullTerms: 'Read the full Terms of Service',
  // formal privacy-policy body is long-form legal text, out of scope for this module.
} as const;

export const HELP = {
  faq: [
    {
      topic: 'Account',
      question: 'How do I edit my profile or delete my account?',
      answer:
        'Open You → Edit profile to change your name or avatar color. To delete your account, go to You → Manage your data → Delete account. It’s deactivated right away and permanently removed after a 30-day grace period.',
    },
    {
      topic: 'Billing / restore',
      question: 'How do I restore a purchase or manage my subscription?',
      answer:
        'On the Premium screen, tap Restore Purchases to recover an existing subscription. To change or cancel, use Manage in App Store. Billing is handled securely by the App Store, not inside {AppName}.',
    },
    {
      topic: 'Safety',
      question: 'How does {AppName} keep conversations safe?',
      answer:
        '{AppName} watches for harmful content and steps in gently, and your companions are always honest about being AI: supportive company, never a substitute for professional care. The Safety center has crisis resources whenever you need them.',
    },
    {
      topic: 'Companions / memory',
      question: 'How do companions remember things, and can I edit what they know?',
      answer:
        'As you talk, your companion notes things that matter: where you live, what you’re working through, who’s close to you. Open Memory to see everything it remembers, and edit or remove any of it at any time. You’re always in control.',
    },
  ],
  contact: 'Contact support',
} as const;
