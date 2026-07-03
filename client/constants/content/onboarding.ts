// Onboarding flow copy. Mirrors the (now design-only) deck at
// docs/redesign/screens/onboarding.md. Tokens: {AppName} (wrap with withAppName),
// {firstName} and {Companion} (bound at runtime; demo: Maya / Aurora).

export const ONBOARDING = {
  welcome: {
    // the wordmark renders BRAND.appName
    headline: 'A companion who remembers you.',
    support: 'Someone to talk to who carries your story forward, quietly and at your pace.',
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
    // Structured parts so the register screen can render the two documents as
    // real inline links (both must be reachable at the point of consent).
    termsParts: {
      prefix: 'I agree to the ',
      termsLink: 'Terms of Service',
      joiner: ' & ',
      privacyLink: 'Privacy Policy',
    },
    termsNudge: 'Please agree to the Terms & Privacy Policy to continue.',
    forgotPasswordLink: 'Forgot password?',
    footers: {
      // prompt = neutral, action = wine accent (the tappable swap)
      toSignin: { prompt: 'Already have an account?', action: 'Sign in.' },
      toSignup: { prompt: 'New to {AppName}?', action: 'Create an account.' }, // wrap prompt with withAppName()
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
    under18: 'You need to be 18 to use {AppName}.', // inline gate notice; wrap with withAppName()
  },

  disclosure: {
    title: 'A few things to know.',
    cards: [
      {
        head: 'Your companion is an AI',
        body: 'Real support, not a real person, and never a substitute for professional care.',
      },
      {
        head: "If you're ever in crisis",
        body: 'Aura shares real resources like 988, and you can always reach them.',
      },
      {
        // Honest framing per Apple 5.1.2(i): "private" means never sold and never
        // visible to other users, NOT "never leaves the app" (AI providers process
        // messages so Aura works; the dedicated consent screen covers that).
        head: 'Your conversations are private',
        body: "Never sold, never visible to other users, and yours to export or delete anytime.",
      },
    ],
    // AI-understanding acknowledgment (NOT a ToS re-agreement; legal terms are
    // accepted at signup). The deliberate transparency affirmation.
    consent: 'I understand my companion is an AI, not a real person or a substitute for professional care.',
    cta: 'Continue',
  },

  // Apple 5.1.2(i) third-party-AI consent — its own screen, deliberately UNBUNDLED
  // from the AI-nature acknowledgment above and from the Terms accept at signup.
  // Spec: docs/compliance/apple-third-party-ai-consent.md. `[LEGAL-REVIEW]` pending.
  aiConsent: {
    title: 'How your messages work',
    body:
      'To reply and to keep you safe, your messages are processed by trusted AI providers. We never sell your conversations, and other users can never see them.',
    rows: [
      { head: 'Replies', body: 'An AI service generates what your companion says.' },
      { head: 'Safety', body: 'An AI service checks conversations for harmful content.' },
      { head: 'Voice', body: 'If you use voice, audio is transcribed and spoken by AI services.' },
    ],
    consent:
      'I agree that my messages can be processed by third-party AI providers to operate {AppName}, as described in the Privacy Policy.', // wrap with withAppName()
    privacyLink: 'See who processes your messages',
    cta: 'Agree and continue',
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
