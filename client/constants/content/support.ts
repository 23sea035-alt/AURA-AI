// Informational utility screens: Privacy / legal and Help / support FAQ.
// Tokens: {AppName}, {Companion}.

export const LEGAL = {
  retentionSummary:
    'In plain terms: your conversations are yours. We keep them so {Companion} can remember you, and you can export or delete everything anytime.',
  fullTerms: 'Full Terms',
  // formal privacy-policy body is long-form legal text, out of scope for this module.
} as const;

export const HELP = {
  faq: [
    { topic: 'Account', question: 'How do I edit my profile or delete my account?' },
    { topic: 'Billing / restore', question: 'How do I restore a purchase or manage my subscription?' },
    { topic: 'Safety', question: 'How does {AppName} keep conversations safe?' },
    {
      topic: 'Companions / memory',
      question: 'How do companions remember things, and can I edit what they know?',
    },
  ],
  contact: 'Contact support',
} as const;
