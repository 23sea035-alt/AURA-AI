// Full-form legal documents (Terms of Service + Privacy Policy), reachable from the "Read the full
// Terms of Service" row on the Privacy screen and the Paywall's legal footer. Distinct from
// `LEGAL` in support.ts, which is the plain-language privacy *summary* shown inline on the Privacy
// screen itself — these are the complete documents.
//
// DRAFT — written to reflect Aura's actual practices as implemented (AI-disclosure, crisis
// resources, data retention, subscription commerce), but NOT reviewed by counsel. Placeholder
// contact addresses and the Delaware/USA governing-law choice should be confirmed (or replaced)
// before this ships to real users. Tokens: {AppName}.

export const TERMS_OF_SERVICE = {
  title: 'Terms of Service',
  lastUpdated: 'Last updated June 24, 2026',
  sections: [
    {
      title: 'Who this is for',
      body: '{AppName} is for adults 18 and older. By creating an account, you confirm you meet that age requirement. If we learn an account belongs to someone under 18, we may suspend or remove it.',
    },
    {
      title: 'What {AppName} is (and isn’t)',
      body: '{AppName} provides AI companions for supportive conversation. Every companion is an AI, clearly disclosed as such throughout the app: never a real person, and never a licensed therapist, doctor, or crisis counselor. {AppName} is not a substitute for professional medical, mental health, or emergency care. If you’re in crisis, see “Crisis situations” below.',
    },
    {
      title: 'Your account',
      body: 'You’re responsible for the activity on your account and for keeping your sign-in credentials secure. You can export your data or delete your account at any time from Privacy & Safety. Deletion is permanent after a 30-day grace period, during which signing back in cancels it.',
    },
    {
      title: 'Subscriptions & billing',
      body: 'The free tier includes 3 base companions, their default personalities, and 30 messages a day. Premium is a recurring subscription billed through the Apple App Store, unlocking unlimited messages, custom companion creation, and personality tuning. Subscriptions renew automatically until canceled; manage or cancel anytime in your App Store settings. Refunds are handled by Apple under its own policies, not by us directly.',
    },
    {
      title: 'Acceptable use',
      body: 'Use {AppName} the way it’s meant to be used: for your own supportive conversations. Don’t use it to harass or harm others, to generate content exploiting minors, to attempt to extract other users’ data, to automate or scrape the service, or to circumvent usage limits or safety systems. We may suspend accounts that violate this.',
    },
    {
      title: 'Content & moderation',
      body: 'Conversations may be automatically reviewed by safety systems to detect harmful content, never to judge, only to keep things safe. You can report a message you feel is inappropriate directly from the chat; reports are reviewed and never interrupt your conversation while you wait.',
    },
    {
      title: 'Crisis situations',
      body: 'If you’re thinking about harming yourself, please reach out to people who can help: call or text 988 (Suicide & Crisis Lifeline, US, 24/7) or text HOME to 741741 (Crisis Text Line). {AppName} surfaces these resources when it detects a crisis moment, but it cannot provide emergency care itself.',
    },
    {
      title: 'Termination',
      body: 'You may stop using {AppName} and delete your account at any time. We may suspend or terminate accounts that violate these terms, misuse the service, or pose a safety risk to others.',
    },
    {
      title: 'Disclaimers & limitation of liability',
      body: '{AppName} is provided “as is,” without warranties of any kind. AI-generated responses may sometimes be inaccurate, unhelpful, or unexpected; use your own judgment, especially for anything important. To the fullest extent permitted by law, {AppName} is not liable for indirect, incidental, or consequential damages arising from your use of the service.',
    },
    {
      title: 'Changes to these terms',
      body: 'We may update these terms as {AppName} evolves. If a change is material, we’ll let you know in the app before it takes effect. Continuing to use {AppName} after an update means you accept the revised terms.',
    },
    {
      title: 'Governing law',
      body: 'These terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles, regardless of where you access {AppName} from.',
    },
    {
      title: 'Contact',
      body: 'Questions about these terms? Reach us at legal@aura.app.',
    },
  ],
} as const;

export const PRIVACY_POLICY_FULL = {
  title: 'Privacy Policy',
  lastUpdated: 'Last updated June 24, 2026',
  sections: [
    {
      title: 'What we collect',
      body: 'Account details (name, email), your messages, and the memories your companion saves so it can remember you. Basic device/usage data (crash logs, feature usage) to keep the app working well. We don’t collect more than we need, and we never sell it.',
    },
    {
      title: 'How AI responses are generated',
      body: 'Your messages are sent to third-party AI service providers to generate your companion’s replies. Those providers process messages to return a response and don’t use your conversations to train their own models under our agreements with them.',
    },
    {
      title: 'Why we keep it',
      body: 'Conversations and memories are stored so your companion can remember you between visits. That continuity is the whole point. Account details keep your subscription and sign-in working.',
    },
    {
      title: 'Automated safety review',
      body: 'A small amount of content is automatically screened for harmful material (self-harm, exploitation, abuse) so we can surface crisis resources or take action when needed. This is automated moderation, not human review of your everyday conversations.',
    },
    {
      title: 'Who can see it',
      body: 'Your conversations are private to you. We don’t share your chats with advertisers or other third parties for marketing purposes. Data may be disclosed if legally required, or to protect the safety of you or others.',
    },
    {
      title: 'Your controls',
      body: 'You can export a copy of everything, or delete your account, at any time from Privacy & Safety. Deletion is permanent after a 30-day grace period; signing back in during that window cancels it.',
    },
    {
      title: 'Data retention',
      body: 'We keep your data while your account is active. After deletion and the grace period, your conversations and memories are permanently removed from our systems, aside from what we’re legally required to retain (e.g. billing records).',
    },
    {
      title: "Children's privacy",
      body: '{AppName} is restricted to adults 18 and older and is not directed at children. We don’t knowingly collect data from anyone under 18.',
    },
    {
      title: 'Changes to this policy',
      body: 'If we make a material change to how we handle your data, we’ll let you know in the app before it takes effect.',
    },
    {
      title: 'Contact',
      body: 'Questions about your data? Reach us at privacy@aura.app.',
    },
  ],
} as const;
