// Onboarding flow copy. Mirrors the (now design-only) deck at
// docs/redesign/screens/onboarding.md. Tokens: {AppName} (wrap with withAppName),
// {firstName} and {Companion} (bound at runtime; demo: Maya / Aurora).

export const ONBOARDING = {
  welcome: {
    // the wordmark renders BRAND.appName
    headline: 'A companion who remembers you.',
    support: "Talk through whatever's on your mind, quietly and at your own pace.",
    primaryCta: 'Get started', // rendered as "Get started →"
    secondaryCta: 'I already have an account',
    adultsNote: 'For adults 18+',
  },

  auth: {
    titles: {
      signup: 'Create your account',
      signin: 'Welcome back',
      forgot: 'Reset your password',
      verify: 'Check your email',
      reset: 'Set a new password',
    },
    // short warm sublines under the title. forgot + verify use their helper lines
    // (see helpers) as body text instead, so they have no subline here.
    sublines: {
      signup: 'Set up your account to meet your companion.',
      signin: 'Pick up right where you left off.',
      reset: 'Choose a new password for your account.',
    },
    fields: {
      emailLabel: 'Email',
      emailPlaceholder: 'you@email.com',
      passwordLabel: 'Password',
      passwordPlaceholderSignup: 'At least 8 characters',
      passwordPlaceholderSignin: 'Your password',
      newPasswordLabel: 'New password',
      confirmPasswordLabel: 'Confirm password',
    },
    ctas: {
      signup: 'Create account',
      signin: 'Sign in',
      forgot: 'Send reset link',
      verify: 'Verify',
      reset: 'Update password',
      apple: 'Continue with Apple',
      google: 'Continue with Google',
    },
    // Explicit agree-to-terms checkbox (signup only), placed under the SSO row. It
    // soft-gates SSO + the Create account CTA: tapping any signup method while it is
    // unchecked surfaces `termsNudge` inline and blocks the action. ToS/Privacy are
    // inline links in the label.
    terms: 'I agree to the Terms & Privacy Policy',
    termsNudge: 'Please agree to the Terms & Privacy Policy to continue.',
    forgotPasswordLink: 'Forgot password?',
    footers: {
      toSignin: 'Already have an account? Sign in.',
      toSignup: 'New to {AppName}? Create an account.', // wrap with withAppName()
    },
    helpers: {
      forgot: "We'll email you a 6-digit code to reset your password.",
      verify: 'Enter the 6-digit code we sent to {email}.',
      resend: 'Resend code', // enabled state
      resendCountdown: 'Resend in {n}s', // disabled while counting down (n: 30 -> 0)
    },
    // NOTE: auth is Clerk-managed; these are design-intent strings. Confirm against
    // Clerk's actual verify/error copy before they are truly locked.
    errors: {
      emailTaken: 'An account already exists for this email. Sign in instead.',
      badCredentials: "That email or password doesn't match. Try again.",
      wrongCode: "That code isn't right. Check it and re-enter.",
      passwordsMismatch: "Passwords don't match yet.",
    },
  },

  carousel: {
    skip: 'Skip',
    next: 'Continue', // rendered as "Continue →"
    slides: [
      {
        headline: 'Meet a companion who remembers you.',
        support: 'Every conversation picks up where you left off, nothing to repeat.',
      },
      {
        headline: 'A calm, private place to talk.',
        support: 'No judgment, no performance. What you share stays yours.',
      },
      {
        headline: 'Here whenever you need.',
        support: "Day or night, and always honest that you're talking to an AI.",
      },
    ],
  },

  ageGate: {
    title: 'How old are you?',
    body: '{AppName} is for adults. You must be 18 or older to continue.', // wrap with withAppName()
    cta: 'Continue',
    under18: 'You need to be 18 to use {AppName}. Thanks for stopping by.', // wrap with withAppName()
  },

  disclosure: {
    title: 'A few things to know.',
    cards: [
      {
        head: 'Your companion is an AI',
        body: 'Real support, not a real person, and never a substitute for professional care.',
      },
      {
        head: 'If things ever get heavy',
        body: "You'll always find real resources here, like the 988 Suicide & Crisis Lifeline.",
      },
      {
        head: 'Your conversations are private',
        body: "They're yours to export or delete anytime.",
      },
    ],
    // AI-understanding acknowledgment (NOT a ToS re-agreement; legal terms are
    // accepted at signup). The deliberate transparency affirmation.
    consent: 'I understand my companion is an AI, not a real person or a substitute for professional care.',
    cta: 'Continue',
  },

  profile: {
    title: 'What should your companion call you?',
    subline: 'First name is what your companion will use.',
    firstNameLabel: 'First name',
    lastNameLabel: 'Last name',
    cta: 'Continue',
    errors: { firstNameEmpty: "First name can't be empty" },
  },

  persona: {
    title: 'Who would you like to talk with?',
    sub: 'You can always meet the others later.',
    premiumNote: 'Personalities can be tuned with Premium.',
    ctaTemplate: 'Start chatting with {Companion}', // rendered with a trailing "→"
    // voice lines: see PERSONAS in ./personas (single source, shared with Companions).
  },

  firstChat: {
    // disclosure banner: see CHAT.disclosureBanner (shared with the Chat hero).
    greetingTemplate:
      "Hi {firstName}, I'm really glad you're here. There's no script and no rush. What's on your mind today?",
  },
} as const;
