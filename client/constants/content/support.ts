// Informational utility screens: Privacy / legal and Help / support FAQ.
// Tokens: {AppName}, {Companion}.

export const LEGAL = {
  title: 'Privacy policy',
  retentionSummary:
    'In plain terms: your conversations are yours. We keep them so {Companion} can remember you, and you can export or delete everything anytime.',
  // The policy body itself is PRIVACY_POLICY_FULL (legal-docs.ts), condensed from
  // docs/compliance/privacy-policy-draft.md — the old 4-section plain summary was
  // removed because its "no third parties" line contradicted the Apple 5.1.2(i)
  // consent disclosure (compliance gap G4).
  fullTerms: 'Read the Terms of service',
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
