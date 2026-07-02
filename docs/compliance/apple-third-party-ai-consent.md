# Apple 5.1.2(i) — Third-Party AI Consent (gap + remediation spec)

> Internal remediation spec (closes gap **G4** in [legal-research.md](legal-research.md)). Describes a
> required consent/disclosure change before App Store submission. `[LEGAL-REVIEW]` = confirm with
> counsel; `[PRODUCT]` = product/design decision.

## The requirement

Apple **App Review Guideline 5.1.2(i)** (added Nov 2025) requires apps to **clearly disclose** when
personal data is shared with **third parties, including third-party AI**, and to obtain **explicit
permission first**. Critically, **consent must not be bundled** with other permissions or a blanket
terms-acceptance.

Aura transmits user message content (and voice audio) to third-party AI providers:
- **Groq** — generation (`llama-3.3-70b-versatile`) + speech-to-text (Whisper).
- **OpenAI** — content moderation.
- **Inworld** — text-to-speech.

So this guideline directly applies, and a compliant **consent moment** is an App Review gate, not just
a privacy-policy line.

## Current state (the gap)

The onboarding disclosure exists but does **not** satisfy 5.1.2(i):

- **`client/app/ai-disclosure.tsx`** — the consent checkbox text
  (`client/constants/content/onboarding.ts` → `ONBOARDING.disclosure.consent`) is:
  *"I understand my companion is an AI, not a real person or a substitute for professional care."*
  → It covers the AI-nature disclosure but says **nothing about sending data to third-party AI
  providers**, and it is the only gate.
- The disclosure cards include one headed **"Your conversations are private"** with body *"They're
  yours to export or delete anytime."* → This is **potentially misleading** under 5.1.2(i)/FTC: the
  messages *are* sent to third-party AI providers (Groq/OpenAI/Inworld) to function. "Private" here
  means *not sold and not shared with other users*, not *never leaves the app*.
- Terms/Privacy acceptance at signup (`onboarding.ts` → `terms`) is a **bundled** blanket accept, which
  does not count as the required unbundled consent.

## Remediation

**1. Add an explicit, accurate third-party-AI disclosure + unbundled consent** before the first chat.

Proposed copy `[PRODUCT / LEGAL-REVIEW]`:
- Disclosure line (replace or augment the "conversations are private" card):
  > *"To reply and to keep you safe, your messages are processed by trusted AI providers (for
  > generation, moderation, and, if you use voice, speech). We never sell your conversations, and other
  > users can't see them. You can export or delete them anytime."*
- A **separate, unbundled** affirmative consent, distinct from the AI-nature acknowledgment and from
  the Terms/Privacy accept:
  > *"I agree that my messages can be processed by third-party AI providers to operate Aura, as
  > described in the Privacy Policy."*

**2. Fix the "Your conversations are private" card** so it is not misleading (per copy above): frame
"private" as *not sold / not visible to other users*, while being explicit that AI providers process
the content to make the app work.

**3. Capture the consent** (auditable). `[PRODUCT]` — add a timestamp/flag, e.g.
`users.thirdPartyAiConsentAt` (or extend the existing disclosure-acceptance capture), set when the user
affirmatively consents; gate first chat on it the same way `aiDisclosureAccepted` is gated today.

**4. Link to the Privacy Policy §4** ("Third Parties We Share Information With") from the consent screen
so the disclosure and the full processor list are one tap apart.

**5. Voice-specific note.** The same consent should cover the voice path (audio → Groq STT; reply →
Inworld TTS), since voice sends audio off-device. If voice is enabled after onboarding, ensure the
consent already covers it or prompt at first voice use. `[PRODUCT]`

## Acceptance criteria

- [ ] A dedicated, **unbundled** consent naming third-party AI processing exists and gates first chat.
- [ ] No onboarding copy implies conversations never leave the device / are never processed by third
      parties.
- [ ] Consent is captured with a timestamp and is auditable.
- [ ] Privacy Policy §4 is reachable from the consent screen.
- [ ] `[LEGAL-REVIEW]` counsel confirms the copy meets 5.1.2(i) and applicable consumer-protection law.

## Affected files (client)

- `client/app/ai-disclosure.tsx` — add the consent control + disclosure.
- `client/constants/content/onboarding.ts` — `ONBOARDING.disclosure` cards + consent copy.
- (backend) schema — optional `users.thirdPartyAiConsentAt` capture + gate.

> Note: the client on this branch is stale relative to the redesign/RN port; apply this to whichever
> client is canonical at implementation time. This doc is the spec; the copy is `[PRODUCT]`-pending.
