// Full-form legal documents (Terms of Service + Privacy Policy), each on its own
// screen (/terms-of-service and /privacy) and linked from the Paywall's legal
// footer, the AI-consent screen, and You → Privacy & Safety.
//
// CONDENSED from the canonical compliance drafts — keep in sync with them:
//   docs/compliance/terms-of-service-draft.md   (20 sections → condensed)
//   docs/compliance/privacy-policy-draft.md     (11 sections → condensed)
// DRAFT status carries over: not reviewed by counsel; contact addresses and the
// Delaware governing-law choice are working placeholders flagged [LEGAL-REVIEW]
// in the drafts and must be confirmed before shipping. Tokens: {AppName}.

export const TERMS_OF_SERVICE = {
  title: 'Terms of Service',
  lastUpdated: 'Last updated July 3, 2026',
  sections: [
    {
      title: 'Who this is for',
      body: '{AppName} is for adults 18 and older. By creating an account you accept these terms and confirm you meet that age requirement. If we learn an account belongs to someone under 18, we may suspend or remove it.',
    },
    {
      title: 'What {AppName} is (and isn’t)',
      body: '{AppName} provides AI companions for supportive conversation. Every companion is an AI, clearly disclosed as such throughout the app: never a real person, and never a licensed therapist, doctor, or crisis counselor. {AppName} is not a substitute for professional medical, mental health, legal, or financial advice.',
    },
    {
      title: 'Not an emergency service',
      body: 'If you’re thinking about harming yourself or someone else, please reach out to people who can help: call or text 988 (Suicide & Crisis Lifeline, US, 24/7) or text HOME to 741741 (Crisis Text Line). {AppName} surfaces these resources when it detects a crisis moment, but it cannot contact emergency services or provide emergency care itself.',
    },
    {
      title: 'Your account',
      body: 'You’re responsible for the activity on your account and for keeping your sign-in credentials secure. Accounts are personal: don’t share yours or use anyone else’s. You can export your data or delete your account at any time from Privacy & Safety; deletion is permanent after a 30-day grace period, during which signing back in cancels it.',
    },
    {
      title: 'Subscriptions & billing',
      body: 'The free tier includes up to 5 companions with their default personalities and looks, 30 messages a day shared across all companions, and 20 minutes of voice a month. Premium is a recurring subscription billed through the Apple App Store, unlocking unlimited messages, 10 hours of voice a month, up to 15 companions, personality tuning, and avatar looks. Subscriptions renew automatically until canceled; manage or cancel anytime in your App Store settings. Deleting your account does not cancel an Apple subscription. Refunds are handled by Apple under its own policies.',
    },
    {
      title: 'Acceptable use',
      body: 'Use {AppName} for your own supportive conversations, lawfully. Strictly and absolutely prohibited, and reported as required by law: any content that sexualizes or exploits minors. Also prohibited: attempting to bypass safety systems, moderation, or usage limits; harassing or harming others; accessing another person’s account; scraping, botting, or reverse-engineering the service; generating illegal content; impersonation; and reselling or commercially exploiting the service. We may investigate violations and remove content, suspend, or terminate accounts.',
    },
    {
      title: 'Your content & our license',
      body: 'You own the messages you write. You grant {AppName} a license to host, process, and display your content solely to operate, secure, and improve the service: generating replies, running safety moderation on messages and responses, and storing the memories that personalize your companion. We do not use your conversations to train AI models. The license ends when your content is deleted from our active systems, apart from the limited retained records described in the Privacy Policy.',
    },
    {
      title: 'AI output disclaimer',
      body: 'Companion responses are generated automatically by AI. They can be inaccurate, incomplete, or inappropriate, are not reviewed by a human before you see them, and do not represent {AppName}’s views, advice, or recommendations. Use your own judgment, especially for anything important; you bear the risk of relying on AI output.',
    },
    {
      title: 'Third-party services',
      body: 'To provide the service, your content is processed by providers acting on our behalf: Groq generates companion replies and converts voice to text, OpenAI moderates content for safety, Inworld synthesizes companion speech, Clerk handles sign-in, and Apple with RevenueCat handles subscriptions. You gave explicit consent for this processing during onboarding, and the Privacy Policy describes exactly what each provider receives.',
    },
    {
      title: 'Termination & ban evasion',
      body: 'You may stop using {AppName} and delete your account at any time. We may suspend or terminate accounts that violate these terms, create legal or safety risk, or engage in fraud or abuse; serious violations may result in an immediate permanent ban. Creating a new account to evade a ban is itself a violation; to enforce bans we retain a hashed identifier from banned accounts, as described in the Privacy Policy.',
    },
    {
      title: 'Intellectual property',
      body: 'The app, its software, the {AppName} name and logo, and the companion personas (including Aurora, Orion, and Lyra) belong to {AppName} or its licensors. You get a personal, non-transferable license to use the app on Apple devices you own or control, for your own non-commercial use. Your own messages remain yours.',
    },
    {
      title: 'Disclaimers & limitation of liability',
      body: 'To the maximum extent permitted by law, {AppName} is provided “as is,” without warranties of any kind, express or implied, and we are not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, goodwill, or emotional distress. Our total liability is capped at what you paid for the service in the 12 months before the claim. Some jurisdictions don’t allow certain exclusions, so parts of this may not apply to you.',
    },
    {
      title: 'Indemnification',
      body: 'To the maximum extent permitted by law, you agree to indemnify and hold {AppName} harmless from claims arising out of your use of the service, your content, or your violation of these terms or of any law or third-party right.',
    },
    {
      title: 'Dispute resolution',
      body: 'Before formal proceedings, contact us and we’ll try to resolve the dispute informally for at least 30 days. Except where law provides otherwise, disputes are resolved by final and binding individual arbitration, not in court, and you and {AppName} each waive class actions and jury trials. You may opt out of arbitration within 30 days of first accepting these terms by written notice, and either party may still use small-claims court for qualifying claims.',
    },
    {
      title: 'Governing law',
      body: 'These terms are governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles. Disputes not subject to arbitration are brought exclusively in Delaware courts.',
    },
    {
      title: 'Changes to these terms',
      body: 'We may update these terms as {AppName} evolves. If a change is material, we’ll let you know in the app before it takes effect and, where appropriate, ask you to re-accept. Continuing to use {AppName} after an update means you accept the revised terms.',
    },
    {
      title: 'Apple App Store terms',
      body: 'These terms are between you and {AppName}, not Apple, and {AppName} alone is responsible for the app and its content. Apple has no obligation to provide support for the app. Apple and its subsidiaries are third-party beneficiaries of these terms and may enforce them against you.',
    },
    {
      title: 'Contact',
      body: 'Questions about these terms? Reach us at legal@aura.app.',
    },
  ],
} as const;

export const PRIVACY_POLICY_FULL = {
  title: 'Privacy Policy',
  lastUpdated: 'Last updated July 3, 2026',
  sections: [
    {
      title: 'What this covers',
      body: '{AppName} is an iOS app for one-to-one conversations with AI companions, for adults 18 and older. Conversations here can be personal and sometimes intimate, so we treat them as sensitive and protect them accordingly. This policy explains what we collect, how it’s used and shared, how long we keep it, and the choices you have. {AppName} launches in the United States first, and this policy is written primarily around U.S. law, including the CCPA/CPRA.',
    },
    {
      title: 'What we collect',
      body: 'Your email and profile details (sign-in is handled by Clerk, including Sign in with Apple and Google; we never store your password). Your messages and the memories your companion saves so it can remember you. Your companion configurations. Basic usage and device data (like push tokens and app version) to run and secure the service. Subscription status from Apple and RevenueCat; we never receive your card details. If you use voice, your audio is processed to text and replies are spoken back, but we store only usage metering (duration and direction), never the audio or a transcript.',
    },
    {
      title: 'How we use it',
      body: 'To provide the service, personalize your companion through memories, keep conversations safe through automated moderation and crisis detection, manage your subscription, send service messages, improve and secure the app, and meet legal obligations. We do not use your conversations to train AI models, and our providers are contractually prohibited from training on them.',
    },
    {
      title: 'Who processes your information',
      body: 'We never sell your personal information and never share it for advertising. To operate the service, content is processed by providers bound by contract: Groq generates companion replies and converts your voice to text; OpenAI moderates messages and replies for safety; Inworld turns companion replies into speech; Clerk provides sign-in; Apple and RevenueCat process subscriptions (we receive status, not card data); and our hosting providers run the infrastructure. We may also disclose information when required by law or to protect the safety of you or others.',
    },
    {
      title: 'How long we keep it',
      body: 'Only as long as needed. Deleting your account starts a 30-day recoverable grace period; after it expires, your conversations, memories, and companions are purged from live systems within 30 days, and residual backup copies are overwritten within 90 days (unused in the meantime). Safety records for flagged content are kept only as long as needed, tiered by severity; de-identified safety signals (categories and scores, never your conversation content) are kept longer. Hashed identifiers from banned accounts are kept up to 24 months to prevent ban evasion. Subscription records are kept up to 7 years for tax and audit purposes.',
    },
    {
      title: 'Deleting your data',
      body: 'You’re in control: delete individual memories, or your whole account, anytime from Privacy & Safety, and export a copy of everything first. Signing back in during the 30-day grace period cancels the deletion. After deletion, we keep only what the law requires: financial records, limited fraud-and-safety records, and a minimal deletion audit record with no conversation content.',
    },
    {
      title: 'Trust & safety',
      body: 'Automated classifiers screen messages and replies for content that may violate our policies or indicate harm, and can surface crisis resources. Content flagged by these systems may be reviewed by trained personnel, with access limited to them. Everyday conversations are not read by humans.',
    },
    {
      title: 'AI, honestly',
      body: 'Your companion is an AI. To reply, your conversation content is transmitted to the AI providers listed above; you consented to this explicitly during onboarding. Companions can be inaccurate or inappropriate and are not a substitute for professional care. Memories exist to make your companion consistent; you can view and delete them at any time.',
    },
    {
      title: 'Your rights',
      body: 'Depending on where you live, you may have the right to know and access the information we hold, correct it, delete it, and not be discriminated against for exercising those rights. We honor deletion requests subject to the legal exceptions above and respond within 45 days. Exercise your rights in the app or by emailing privacy@aura.app.',
    },
    {
      title: "Children's privacy",
      body: '{AppName} is restricted to adults 18 and older and is not directed at children. We don’t knowingly collect data from anyone under 18; if we learn we have, we delete it.',
    },
    {
      title: 'Changes & contact',
      body: 'If we make a material change to how we handle your data, we’ll update the date above and let you know in the app before it takes effect. Questions about your data? Reach us at privacy@aura.app.',
    },
  ],
} as const;
