// Account domain: the You tab + edit profile + account management (export/delete)
// + subscription management + notification settings. Tokens: {AppName}, {Companion},
// {email}, {renewDate}.

export const ACCOUNT = {
  you: {
    tierPill: { free: 'Free', premium: 'Premium' },
    groups: {
      account: { header: 'Account', editProfile: 'Edit profile', subscription: 'Subscription' },
      notifications: { header: 'Notifications', replyToggle: '{Companion} replied' },
      privacy: {
        header: 'Privacy & Safety',
        safetyCenter: 'Safety center',
        privacyPolicy: 'Privacy policy',
        dataExport: 'Data export',
        deleteAccount: 'Delete account',
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
    error: "First name can't be empty",
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

  notifications: {
    toggleLabel: '{Companion} replied 💬',
    helper: "Get notified when your companion replies while you're away.",
  },
} as const;
