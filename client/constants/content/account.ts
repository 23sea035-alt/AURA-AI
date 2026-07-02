// Account domain: the You tab + edit profile + account management (export/delete)
// + subscription management + notification settings. Tokens: {AppName}, {Companion},
// {email}, {renewDate}.

export const ACCOUNT = {
  you: {
    tierPill: { free: 'Free', premium: 'Premium' },
    groups: {
      // Notifications is its own screen now (room for more toggles) — a row, not an inline toggle.
      account: {
        header: 'Account',
        editProfile: 'Edit profile',
        signInSecurity: 'Sign-in & security',
        subscription: 'Subscription',
        notifications: 'Notifications',
      },
      // export + delete live together on one screen — delete is buried a level deeper, not a
      // top-level mistap.
      privacy: {
        header: 'Privacy & Safety',
        safetyCenter: 'Safety center',
        privacyPolicy: 'Privacy policy',
        manageData: 'Manage your data',
      },
      support: { header: 'Support', help: 'Help', rate: 'Rate {AppName}' },
    },
    subscriptionRow: { free: 'Upgrade to Premium', premium: 'Manage in App Store' },
    signOut: 'Sign out',
  },

  editProfile: {
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
    firstNameHelper: 'This is what your companion calls you.',
    changeAvatar: 'Change',
    save: 'Save',
    error: "Enter a first name. It's what your companion calls you.",
  },

  accountMgmt: {
    export: {
      line: 'Download a copy of your conversations and memories',
      cta: 'Request export',
      confirm: "We're preparing your export. We'll email a download link to {email} when it's ready.",
    },
    delete: {
      line: 'Permanently delete your account.',
      cta: 'Delete account',
      explainer:
        'Your account is deactivated now and permanently deleted after 30 days. Sign back in within 30 days to cancel.',
      cancel: 'Cancel',
    },
  },

  subscription: {
    currentPlanLabel: 'Current plan',
    currentPlan: 'Premium',
    renewsTemplate: 'Renews {renewDate}', // demo: Jul 14, 2026
    manageInAppStore: 'Manage in App Store',
    manageHelper: 'Billing is managed by the App Store. Changes happen there.',
    // restore: see SYSTEM.restorePurchases
  },

  // Transactional ONLY: a single push toggle. No marketing toggles, no category sprawl.
  notifications: {
    group: 'Push',
    toggleLabel: '{Companion} replied',
    sub: "Get notified when your companion replies while you're away.",
    footnote: 'The only notification Aura sends. No promos, no nudges.',
  },
} as const;
