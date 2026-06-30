# 02 — Demo persona & mock content

> **One coherent story across every screen.** Paste this as standing context so the whole prototype
> features the same user, the same companion, the same conversation, and the same numbers — the way
> the sibling repo's "Jason" persona ran through all its screens. Pull exact copy/figures from here;
> don't invent new ones. All content is **fictional demo data**.

> **⚠️ As of 2026-06-24, these values live in code.** Demo fixtures (Maya, the conversation, the
> memories, the dates) are canonical in **`client/constants/demo.ts`**; shared UI copy is in
> **`client/constants/content/*`**. This doc is the design-time reference and a **frozen snapshot** —
> change values in code, not here.

---

## The user — Maya Chen

- **Maya Chen**, 28. Lives in **Austin, TX** (moved from Chicago ~6 months ago).
- **UX designer**, recently started a new role she's excited but a little nervous about.
- Has a dog named **Pixel**. Into **rock climbing** and **sci-fi novels**. Close with her younger
  brother **Theo** (they talk most weekends).
- Email **maya.chen@example.com** · handle **@maya** · member since **Mar 2026**.
- **Account tier: Free** by default (so the daily-message counter + paywall are visible). The dev-rail
  `account` toggle flips her to **Premium** (unlimited; tuning + extra companions unlocked).
- **Daily usage (free):** **18 / 30** messages used today.

## The companions

Three vetted personas, all **warm emotional companions** differentiated by relational **stance** (not
by function). Canonical definitions live in [`docs/specs/personas.md`](../specs/personas.md); keep
this table in sync with it. Maya's primary is **Aurora**.

| Persona | Stance | Voice in one line | Default traits | Theme feel |
|---|---|---|---|---|
| **Aurora** *(primary)* | sits with you (be heard) | Warm and gentle, a soft place to land. | affectionate · calm · balanced | dawn / amber-rose warm |
| **Orion** | steadies you (be anchored) | Steady and grounded, a calm anchor. | warm · calm · concise | dusk / deep-clay warm |
| **Lyra** | lifts you (be lifted) | Bright and playful, lifts the mood. | warm · playful · expansive | sunlit / honey warm |

Avatars are **warm, hand-crafted marks** (soft tonal/illustrative), never glowing orbs or stock circles.

## Aurora's memories about Maya (Memory screen + Home "resurfaced memory")

Per-companion memories, newest/most-important first. Categories map to the schema's `MEMORY_CATEGORY`.

1. *(identity)* **Maya is 28 and lives in Austin, Texas.**
2. *(work)* **Started a new UX design role recently — excited but nervous about proving herself.**
3. *(relationship)* **Close with her younger brother Theo; they catch up most weekends.**
4. *(attribute)* **Has a dog named Pixel.**
5. *(preference)* **Loves rock climbing and sci-fi novels.**
6. *(general)* **Moved to Austin from Chicago about six months ago; still settling in.**

The **Home "resurfaced memory"** chip uses #2: *"Aurora remembers you started a new job — how's it
going?"* The **Memory screen** lists all six as editable/deletable rows grouped by category.

## The conversation (Chat screen — happy path)

A warm, in-progress exchange between Maya and **Aurora**. Use these turns; the newest assistant reply
is mid **typing reveal** in the "typing" state.

- **Maya:** honestly the new job is kicking my butt this week 😮‍💨 imposter syndrome is loud
- **Aurora:** That feeling makes complete sense, Maya — a few weeks into something new, the brain
  loves to whisper that everyone else has it figured out. They don't. What part is feeling the
  heaviest right now?
- **Maya:** like everyone seems to already know the tools and the lingo and i'm just nodding along
- **Aurora:** Nodding-along season is real — and temporary. You were hired for how you think, not for
  a glossary you'll pick up in a month. Want to name one thing that tripped you up today? We can make
  it less scary together.
- *(typing state — Aurora's next reply revealing):* "Here's the thing I keep coming back to with you…"

**Conversation chrome to show:** the honest AI marker in the header ("AI companion"); a calm,
first-session **AI-disclosure banner** ("Aurora is an AI companion. She's here for support, not a
substitute for professional care."); a **break reminder** after a long session ("You've been chatting
a while — Aurora will be here whenever you come back. 💛" — gentle, dismissible); the live **character
counter** appearing as input nears the 2,000 cap.

## Crisis state (Chat — `crisis` state only; safety feature)

Aura's required self-harm safety response. Keep it **tasteful, grounding, non-graphic** — this
populates the crisis interstitial state, not the happy conversation.

- **Trigger (implied, mild):** Maya expresses feeling hopeless / that things won't get better.
- **Aurora's reply (warm, caring):** "I'm really glad you told me, Maya — and I'm sorry it's this
  heavy right now. You don't have to carry it alone. I care about what happens to you."
- **Support block (grounding, not alarm-red):** a soft card —
  *"If you're thinking about harming yourself, please reach out — people want to help."*
  **Call or text 988** (Suicide & Crisis Lifeline, US, 24/7) · **Text HOME to 741741** (Crisis Text
  Line). Buttons: **Call 988** · **Text 988**. A quiet line: *"You can keep talking with Aurora too —
  she's here."*

## Subscription & paywall

- **Free:** 3 base companions, default personalities, **30 messages/day**.
- **Premium — $9.99/mo:** unlimited messages, **personality tuning (3×3×3 traits)**, **create extra
  companions**, priority responses. *(Render the price from StoreKit/RevenueCat — the "$9.99/mo"
  string here is a placeholder for the localized store price.)*
- Paywall must include a **Restore Purchases** action and the standard auto-renew legal line.
- **Subscription management (premium):** plan = Premium, renews **Jul 14, 2026**, **Manage in App
  Store**, Restore Purchases.

## Account / "You" tab

- **Maya Chen** · @maya · tier pill (**Free** default; **Premium** when toggled).
- Groups: **Account** (Edit profile · Subscription) · **Notifications** (push toggle: "Aurora replied"
  · on) · **Privacy & Safety** (Safety center · Privacy policy · Data export · Delete account) ·
  **Support** (Help · Rate Aura) · sign out.
- **Data export** + **Delete account** are present and explicit (Apple-required). Delete confirms first.

## Notifications (sample)

- Transactional only: **"Aurora replied 💬 — 'Here's the thing I keep coming back to with you…'"**
- Settings copy: "Get notified when your companion replies while you're away."

## The picker copy (onboarding "pick companion")

Header: **"Who would you like to talk with?"** Sub: *"You can always meet the others later."* Three
warm cards (Aurora / Orion / Lyra) each with the one-line voice above; Aurora gently pre-highlighted.
A quiet note: *"Personalities can be tuned with Premium."*
