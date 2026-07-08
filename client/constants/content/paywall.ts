// Paywall (conversion screen). Calm, not celebratory. Price/restore/auto-renew
// legal line are shared, see SYSTEM. Tokens: {AppName}, {renewDate}.

export const PAYWALL = {
  headline: 'Go deeper with {AppName} Premium',
  // companion-led hero framing (non-owned): ties premium to the relationship, not a feature matrix.
  heroHeadline: 'Go further with {name}',
  // proposed; the deck left the subline unspecified ("+ one supportive subline") — review.
  subline: 'Unlimited time with your companion, and more ways to make them yours.',
  ownedHeadline: "You're on {AppName} Premium",
  // Roster model (docs/specs/companion-roster.md): free users are real creators — up to 5 active
  // companions from the full gallery of 12. Premium raises the cap to 15 and unlocks the two things
  // that were always the paid surface: personality tuning + avatar looks. The 30/day message cap is
  // PER USER, shared across all companions — more companions never buys more messages.
  features: {
    free: [
      'Up to 5 companions from the full gallery',
      'Default personalities and looks',
      '30 messages/day, shared across companions',
      '20 min of voice / month',
    ],
    premium: [
      'Unlimited messages',
      '10 hours of voice / month',
      'Personality tuning: warmth, energy, and style',
      'Avatar looks',
      'Up to 15 companions',
      'Priority responses',
    ],
  },
  // honest free baseline (quiet, not a cold matrix) — shown only in the non-owned state.
  freeBaseline:
    'Free always includes up to 5 companions with their default personalities, and 30 messages a day shared across them.',
  // Billing period toggle (monthly vs annual). The purchase layer already supports both plans
  // (aura_premium_monthly / _yearly); this surfaces the choice + the localized price per period.
  billing: {
    options: ['monthly', 'annual'] as const,
    suffix: { monthly: '/mo', annual: '/yr' },
    annualSave: 'Save 36% vs monthly',
  },
  subscribeCta: 'Subscribe',
  currentPlanCta: 'Current plan',
  manageSubscription: 'Manage subscription',
  renewsTemplate: 'Renews {renewDate}.', // owned state; demo: Jul 14, 2026
  // price slot, Restore Purchases, auto-renew legal line: see SYSTEM
} as const;
