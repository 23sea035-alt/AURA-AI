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
      'Personality tuning: warmth, energy, and style',
      'Create extra companions',
      'Priority responses',
    ],
  },
  // honest free baseline (quiet, not a cold matrix) — shown only in the non-owned state.
  freeBaseline: 'Free always includes 3 base companions, their default personalities, and 30 messages a day.',
  subscribeCta: 'Subscribe',
  currentPlanCta: 'Current plan',
  manageSubscription: 'Manage subscription',
  renewsTemplate: 'Renews {renewDate}.', // owned state; demo: Jul 14, 2026
  // price slot, Restore Purchases, auto-renew legal line: see SYSTEM
} as const;
