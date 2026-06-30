// Shared system-state + commerce strings reused across many screens (the
// system-states kit, plus the store-driven price/legal lines). Screen files do
// NOT re-declare these; the React screens import them from here.

export const SYSTEM = {
  // System-states kit (docs/redesign/screens/oneoffs.md `states`).
  error: {
    title: 'Something went wrong',
    retry: 'Try again', // unifies the decks' mixed "Retry" / "Try again"
  },
  offline: "You're offline. Your companion will catch up when you're back.",
  blocked: 'This message was held back to keep things safe.',

  // Store-driven commerce (Paywall + Subscription management). RevenueCat/StoreKit
  // renders the real localized price; never hardcode it.
  storePriceSlot: '{storePrice}/mo',
  storePriceNote: 'The app injects the localized store price here.',
  restorePurchases: 'Restore Purchases',
  autoRenew:
    'Subscription renews automatically until canceled. Manage or cancel anytime in App Store settings.',
} as const;
