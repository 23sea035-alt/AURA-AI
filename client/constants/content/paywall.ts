// Paywall (conversion screen). Calm, not celebratory. Price/restore/auto-renew
// legal line are shared, see SYSTEM. Tokens: {AppName}, {renewDate}.

export const PAYWALL = {
  headline: 'Go deeper with {AppName} Premium',
  // proposed; the deck left the subline unspecified ("+ one supportive subline") — review.
  subline: 'Unlimited time with your companion, and more ways to make them yours.',
  ownedHeadline: "You're on {AppName} Premium",
  features: {
    free: ['3 base companions', 'Default personalities', '30 messages/day'],
    premium: [
      'Unlimited messages',
      'Personality tuning (3×3×3 traits)',
      'Create extra companions',
      'Priority responses',
    ],
  },
  subscribeCta: 'Subscribe',
  currentPlanCta: 'Current plan',
  manageSubscription: 'Manage subscription',
  renewsTemplate: 'Renews {renewDate}.', // owned state; demo: Jul 14, 2026
  // price slot, Restore Purchases, auto-renew legal line: see SYSTEM
} as const;
