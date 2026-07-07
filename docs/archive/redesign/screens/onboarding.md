# Onboarding — per-screen design prompts

> Use these **after** the [`03-onboarding-scaffold.md`](../03-onboarding-scaffold.md) scaffold has
> rendered the stub flow. Paste **ONE screen block at a time** into Claude Design to design that screen
> into its stub. Assumes the approved Warm Sanctuary system + [`01-doctrine.md`](../01-doctrine.md) +
> [`02-demo-persona.md`](../02-demo-persona.md) + `claude-design/ios-frame.jsx` + `dev-harness.jsx` are
> in context. Each block keeps the scaffold's nav, dev rail, and tokens; designs **both warm-light and
> warm-dark**; and (auth is Clerk-managed — this is UI only).

Flow order: **Welcome → Auth → Carousel → Age gate → AI disclosure + ToS → Profile → Choose companion → Conversation.**

> **⚠️ Copy now lives in code — this deck is design-only.** Every user-facing string is canonical in
> **`client/constants/content/*`** (UI copy) and **`client/constants/demo.ts`** (demo fixtures). The
> strings quoted in these blocks are a **frozen snapshot for context** — do **not** edit copy here;
> change wording in the content module, the single source of truth. Layout / motion / "borrow & avoid"
> guidance below stays authoritative. Conventions used in both places:
> - **App name → `{AppName}`.** The name is unresolved (see [`docs/README.md`](../../README.md) naming
>   TODO); every rendered use is the token **`{AppName}`**, resolving to `BRAND.appName` at build time.
>   Where the name isn't actually needed, the copy avoids it.
> - **Names in copy → tokens.** The user's first name is `{firstName}` (demo: **Maya**); the chosen
>   companion is `{Companion}` (demo: **Aurora**). **Pre-selection screens never name a companion.**
> - **No em dashes** in copy (use a comma or a sentence break).

---

## Welcome (value prop) — `welcome`

Design the **Welcome** screen — a single pre-auth value-prop page (NOT a carousel). Calm and inviting,
it sets the tone in one breath. Top→bottom: the **{AppName}** wordmark / warm mark; a short **value-prop
headline** (*"A companion who remembers you."*) + one supporting line (*"Talk through whatever's on your mind, quietly and at your own pace."*); a primary **Get started →** and a
secondary **I already have an account** (→ auth); a quiet **"For adults 18+"** note. One warm focal
image/illustration is welcome (no glowing orb, no stock). States: `default`. Guardrail: one page, one
clear primary action — the 3-screen narrative lives later, post-auth, in the carousel.

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* Word-led, vertically generous, centered around a single promise — let the cream `bg` carry it,
no hero gradient. Top→bottom: the **{AppName}** wordmark (small, quiet) near the top; a **warm hand-drawn
illustration anchor** as the focal middle (the brand's positive identity anchor — a soft tonal mark, not
a glowing orb, not stock); below it the **serif promise** in **Newsreader Display/Headline** (*"A companion
who remembers you."*) on **text-primary**, with one supporting line (*"Talk through whatever's on your mind, quietly and at your own pace."*) in **Hanken Body/`text-secondary`**;
then the actions, bottom-anchored above the safe area — a single **primary `Get started →`** (Library Wine
fill, on-accent text, soft radius 12) and a quiet **text-button "I already have an account"** (no fill,
`text-secondary`); the **"For adults 18+"** note as the smallest **Caption/`text-tertiary`** at the very
bottom. ONE value prop only — resist listing benefits (that's the carousel's job). The whole screen is an
intimate surface: no outlines, depth only from the illustration and type weight. Inset 20–24, breathe with
24/32 between groups.
*Motion (design intent — feel, not timings):* First-run feels like a held breath — a **calm staggered
gentle entrance in reading order** (mark → illustration settles → promise → supporting line → buttons),
each element fading up a few points and **settling, never bouncing**; the illustration may ease in a touch
slower so it reads as the anchor. Primary CTA gets soft press + light haptic. **Reduce-motion:** elements
**fade in together** with no travel; keep the press haptic.
*Borrow / avoid:* **Borrow:** Pi's welcome (an *invitation*, not an instruction sheet); Headspace/Calm's
single-focal calm-entrance pacing; value-prop best practice (say what it *feels* like / does for you, not
how it works). **Avoid (AI-slop tells):** cosmic/purple hero gradient · glowing orb or floating blobs ·
stock 3D render · a feature bullet list · ✨ emoji garnish · three buttons competing for the eye · a
techy/`Inter` display face.

## Auth — `auth`

Design the **Auth** screen — one surface, `mode` switches the body (don't build five screens). This is
where people decide to trust {AppName}, so keep it calm and trustworthy.
- *signup* (default): email + password (reveal eye); **Continue with Apple** + **Continue with Google**;
  agree-to-terms checkbox linking ToS/Privacy; primary **Create account**; footer toggle *"Already have
  an account? Sign in."* Show button `idle / loading / done`.
- *signin*: email + password; **Forgot password?**; Apple/Google; primary **Sign in**; footer → signup.
- *forgot*: email + **Send reset link** + a "we'll email a code" note; back to signin.
- *verify*: a **6-digit code** entry (Clerk emails it) + **Verify** + resend timer.
- *reset*: new-password + confirm + **Update password**.
States = the five modes. After signup/verify → carousel.

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* This is the **trust moment** — keep it a calm, single **structural** surface (forms are crisp:
warm **hairline** fields, **tight radius 4/8**, no soft shadow on inputs). Top→bottom: a short **Newsreader
Title** that names the current mode (*"Create your account"* / *"Welcome back"* / *"Reset your password"* /
*"Check your email"* / *"Set a new password"* — see the locked per-state copy below); a tight **field stack** (email, then password with a **reveal-eye** affordance,
placeholders in **`text-secondary`** never tertiary); inline links (**Forgot password?**) as quiet
text-buttons; the **social row** — **Continue with Apple** + **Continue with Google** as neutral
outlined/`raised` buttons (system glyphs, **not** accent-tinted); the **agree-to-terms checkbox** with
ToS/Privacy as inline links; the single **primary CTA** (Library Wine fill) carrying `idle / loading / done`;
a **footer toggle** swapping signup↔signin. Only the body between title and CTA swaps per `mode` — frame,
social row, and footer stay put. Keep the active field above the `IOSKeyboard`; tap-outside dismisses.
*Per-state (locked copy — title · fields · CTA · footer/helper · example inline error):*
- **signup** — title **"Create your account"**; **Email** (placeholder `you@email.com`) + **Password**
  (placeholder `At least 8 characters`, reveal-eye); terms checkbox *"I agree to the Terms & Privacy
  Policy"*; CTA **"Create account"**; footer *"Already have an account? Sign in."* Error (email taken):
  *"An account already exists for this email. Sign in instead."*
- **signin** — title **"Welcome back"**; **Email** + **Password** (placeholder `Your password`);
  *"Forgot password?"* inline; CTA **"Sign in"**; footer *"New here? Create an account."* Error (bad
  credentials): *"That email or password doesn't match. Try again."*
- **forgot** — title **"Reset your password"**; **Email** only; CTA **"Send reset link"**; helper
  *"Enter your email and we'll send a code to reset your password."*; back to signin.
- **verify** — title **"Check your email"**; a **6-digit code** entry (segmented or single field); CTA
  **"Verify"**; helper *"Enter the 6-digit code we sent to {email}."*; a **"Resend code"** action that
  counts down (*"Resend in 0:30"*) then re-enables. Error (wrong code): *"That code isn't right. Check it
  and re-enter."*
- **reset** — title **"Set a new password"**; **New password** + **Confirm password**; CTA **"Update
  password"**; inline match validation (*"Passwords don't match yet."*).
*Motion (design intent — feel, not timings):* **Near-still — this is pre-trust, calm earns it.** The body
**cross-fades** when `mode` changes (no slide-the-whole-screen drama). The real micro-moment is the CTA:
a smooth **idle → loading (in-button progress, not a full-screen spinner) → done (soft check)** transition
with a completion haptic. Soft press + haptic on every tap. **Reduce-motion:** drop the cross-fade
(swap instantly), keep the loading→done state change and the haptic.
*Borrow / avoid:* **Borrow:** Apple's sign-in sheet patterns (system Apple/Google buttons, expected order);
Stripe/Linear calm form layouts (one column, ample line spacing, inline validation); a single-surface
`mode`-switch instead of five routes. **Avoid (AI-slop tells):** glassmorphic/blurred form card · accent-tinted
social-button tiles · a full-screen spinner on submit · five separate screens for five modes · placeholder
text in `text-tertiary` · red CTA crowding a red error line · dark-pattern pre-checked terms box.

## Intro carousel — `carousel`

Design the **post-auth intro carousel** — a short 3-screen narrative that welcomes the new user and sets
expectations before onboarding's gates. Stories-style: a slim segmented progress bar at top, tap/swipe to
advance, **Skip** + **Continue →**. One warm idea + a warm hero per slide (no orbs, no stock):
- *slide1* — **"Meet a companion who remembers you."** (continuity across conversations)
- *slide2* — **"A calm, private place to talk."** (judgment-free, your conversations are yours)
- *slide3* — **"Here whenever you need."** (always available; honest that it's an AI)
States = the three slides. → age gate. Guardrail: warm and brief — this is a narrative bridge, not a
second value-prop pitch.

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* Borrow the **stories idiom** so it reads "short, three, done." Top→bottom: a **slim segmented
progress bar** pinned at top (three segments, the active one filled in **Library Wine**, the rest a neutral
**hairline/`text-tertiary` track**) — this is the one place a thin accent fill earns its keep; a **warm
hand-drawn illustration** as each slide's focal anchor (one per slide, distinct, no orbs/stock); a single
**Newsreader serif line** beneath it (the *feeling*, not a feature); a quiet supporting clause in **Hanken
`text-secondary`**. Bottom row: a quiet **Skip** text-button (always present, left) and **Continue →**
(right — the primary). The slide canvas is an intimate surface (no outlines); keep horizontal inset and
illustration size identical across slides so only the content changes.
*Per-state (locked copy — serif headline + supporting line; buttons **"Skip"** / **"Continue →"**):*
- **slide1** — headline *"Meet a companion who remembers you."* · support *"Pick up where you left off.
  Your companion carries what matters across every conversation."*; segment 1 filled.
- **slide2** — headline *"A calm, private place to talk."* · support *"No judgment, no audience. Your
  conversations are yours."*; segment 2.
- **slide3** — headline *"Here whenever you need."* · support *"Day or night, your companion's around,
  and always honest that it's an AI."*; segment 3 → **Continue** becomes the forward action to the age gate.
*Motion (design intent — feel, not timings):* The **slide tracks the swipe** under the finger and **honors
direction** (forward slides come from the right, back from the left); the segment bar fills to match the
landed slide. **NEVER auto-advance** — the user owns the pace (auto-advancing benefit slides is a classic
AI-slop tell). Illustration + line may settle a beat after the slide lands. Soft press + haptic on
Skip/Continue. **Reduce-motion:** replace the slide with a **cross-dissolve**, no travel, **still no
auto-advance**; keep the haptic.
*Borrow / avoid:* **Borrow:** Instagram/Snap **stories** segment idiom (signals length + progress);
onboarding-carousel best practice (≤3 slides, benefits/feelings not a tutorial); Duolingo/Headspace warm
single-idea slides. **Avoid (AI-slop tells):** auto-advancing slides · more than 3 dots/segments · feature
screenshots or "how it works" diagrams · parallax/orb backgrounds · a second hard value-prop pitch ·
accent used on both the bar *and* the CTA *and* an icon at once.

## Age gate — `agegate`

Design the **Age gate** — a warm, single-purpose screen, the FIRST gate after auth. Header *"How old are
you?"*; a friendly **date-of-birth picker** (wheel or field); one honest line *"{AppName} is for adults. You
must be 18 or older to continue."*; primary **Continue**.
- *default*: a valid 18+ DOB → Continue enabled → disclosure.
- *under18*: under 18 → **fail closed** — a calm, non-shaming stop: *"You need to be 18 to use {AppName}.
  Thanks for stopping by."* (no path forward). Design this state explicitly.

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* Warm and single-purpose — one question on the screen. Top→bottom: a **Newsreader Title**
*"How old are you?"*; a short honest line in **Hanken `text-secondary`** (*"{AppName} is for adults. You must be
18 or older to continue."*); a **friendly DOB picker** as a **structural** control — a native-feeling wheel
or a tidy field group with **hairline** edges + **tight radius (8)**, never a soft-shadow card; then the
single **Continue** primary (Library Wine), bottom-anchored. Generous whitespace; the picker is the only
interactive focal element.
*Per-state:*
- **default** — a valid 18+ DOB makes **Continue** enabled (Library Wine fill) → disclosure.
- **under18** — **fail-closed dead-end**: the picker and Continue give way to a calm, **non-shaming** stop —
  a warm line *"You need to be 18 to use {AppName}. Thanks for stopping by."* on plain `bg`, **no path forward**
  (no Continue, no retry-into-the-app). Keep it gentle and final, not an error/alarm surface — neutral
  tokens, **not** error-red.
*Motion (design intent — feel, not timings):* Minimal and still — this is a gate, not a moment. The only
motion is **gentle inline validation** as the DOB resolves (Continue easing from disabled→enabled). The
`under18` transition is a **soft, calm dissolve** to the stop message — never a jarring slam or shake.
Soft press + haptic on Continue. **Reduce-motion:** no entrance/validation travel; instant state swap; keep
the haptic.
*Borrow / avoid:* **Borrow:** Apple/iOS native date-picker affordances (familiar, low-friction); calm
single-question gate layouts (one ask, one action). **Avoid (AI-slop tells):** a punitive red "ACCESS
DENIED" fail screen · shaming copy · an animated lock/shield icon · a celebratory check when valid ·
soft-shadowed "card" wrapping a utility picker · accent used on the picker chrome.

## AI disclosure + ToS — `disclosure`

Design the **AI disclosure + Terms** screen — the honesty moment, warm not legalistic. Header *"A few
things to know."* Three short human cards (head + one line): *"Your companion is an AI"* — real support,
not a real person, and never a substitute for professional care; *"If things ever get heavy"* — you'll
always find real resources here, like the **988** Suicide & Crisis Lifeline; *"Your conversations are
private"* — they're yours to export or delete. A checkbox
*"I understand and agree to the Terms & Privacy Policy"* + primary **Continue** (disabled until checked)
→ profile. States: `default`. Guardrail: honest, no dark patterns on the consent checkbox.

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* The honesty moment — warm and human, not a legal wall. Top→bottom: a **Newsreader Title** *"A few
things to know."*; then **three short human cards** stacked vertically — these are gentle, intimate
**`raised`-card** surfaces (tonal fill + soft shadow `e1`, **no outline**, soft radius 12/16), each with a
plain warm glyph + a one-line plain-language statement (**Hanken Body** head + **`text-secondary`** support) —
locked copy:
(1) head *"Your companion is an AI"* — *"Real support, not a real person, and never a substitute for
professional care."*; (2) head *"If things ever get heavy"* — *"You'll always find real resources here,
like the 988 Suicide & Crisis Lifeline."*, using the **calm crisis/safety token** (grounding green),
**never** alarm-red; (3) head *"Your conversations are private"* — *"They're yours to export or delete
anytime."* Below the cards: a clearly-tappable **checkbox row** *"I understand and agree to
the Terms & Privacy Policy"* (ToS/Privacy as inline links), then the **Continue** primary (Library Wine),
**genuinely disabled** until the box is checked.
*Motion (design intent — feel, not timings):* Calm — the three cards arrive in a **gentle staggered
entrance** (settle, no bounce), reading top→bottom so each statement is given a beat to register. Checking
the box eases **Continue** from disabled→enabled (opacity + accent fill resolving) with a light haptic.
Soft press + haptic on Continue. **Reduce-motion:** cards **fade in together**, no travel; instant
enable on check; keep the haptic.
*Borrow / avoid:* **Borrow:** layered / plain-language disclosure best practice (say it like a person, link
to the formal text); Apple's privacy "nutrition" plain-language register; the same warm crisis support block
used in Chat/Safety center for card (2). **Avoid (AI-slop tells):** a scroll-wall of legalese · a
**pre-checked** consent box or grayed "Continue anyway" dark pattern · alarm-red on the crisis card ·
outlined + shadowed cards (pick intimate: shadow only) · accent used decoratively on all three card icons ·
a fake "scroll to accept" timer.

## Profile setup — `profile`

Design the **Profile setup** screen — light and welcoming. Header *"What should your companion call you?"*;
first-name + last-name fields (first name is what the companion uses); an optional friendly subline;
primary **Continue** → persona. Keep it minimal — no demographic interrogation. States: `default`
(+ focus/error on the fields).

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* Light, welcoming, and short — a **structural** form, but a friendly one. Top→bottom: a
**Newsreader Title** *"What should your companion call you?"*; an optional warm subline in **Hanken `text-secondary`**
(*"First name is what your companion will use."*); then two **crisp** text fields — **First name** then **Last name**
— with **hairline** edges + **tight radius (8)**, labels above, placeholders in **`text-secondary`**; the
**Continue** primary (Library Wine) bottom-anchored. Only two fields — no demographics, no avatar upload,
no interrogation. Keep the active field above the `IOSKeyboard`.
*Per-state:*
- **default** — empty/prefilled fields; **Continue** stays disabled until a first name exists.
- **focus** — active field lifts above the keyboard with a **focus ring on the Library Wine token** (the one
  accent use here); the other field rests quiet.
- **error** — inline, below the field: *"First name can't be empty"* (error token, says what to do next);
  keep the wine CTA out of tight adjacency to the red error line.
*Motion (design intent — feel, not timings):* **Utility-leaning — stays mostly STILL:** soft press + haptic,
a calm focus-ring transition on the active field, standard keyboard avoidance, and the Continue
disabled→enabled ease. No entrances or reveals. **Reduce-motion:** none beyond the haptic and instant state
changes (ring appears without animating).
*Borrow / avoid:* **Borrow:** Apple Settings / clean single-column form spacing; calm label-above-field
inputs with inline validation; minimal "just your name" onboarding (Pi/Headspace) that doesn't over-ask.
**Avoid (AI-slop tells):** demographic fields (age/gender/location) · a big avatar-upload hero · a
soft-shadow "card" around utility inputs · accent-filled inactive fields · validating before the user has
typed · placeholder text in `text-tertiary`.

## Choose companion — `persona`

Design the **Choose your companion** screen — the choice that sets up the payoff. Header *"Who would you
like to talk with?"* Sub *"You can always meet the others later."* Three warm companion cards —
**Aurora · Orion · Lyra** — each with the hand-crafted avatar, name, one-line voice (from the persona
doc), and a soft selected state; **Aurora** gently pre-highlighted. A quiet note *"Personalities can be
tuned with Premium."* Primary **Start chatting with {name} →** → firstchat. States: `default`.
Guardrail: free tier = base personas on default traits (no trait sliders here).

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* The pivotal, emotional choice — **CHOOSE, not build** (no Replika-style avatar editor). Top→bottom:
a **Newsreader Headline** *"Who would you like to talk with?"* + the sub *"You can always meet the others
later."* in **Hanken `text-secondary`**; then **three warm STACKED horizontal cards** (Aurora · Orion · Lyra)
— each an intimate **`raised`-card** surface (tonal fill + soft shadow, **no outline**, soft radius 16): a
**hand-crafted avatar** (left) + **name** (Hanken Label/Title) + a **one-line voice that sounds like them**
(canonical lines from `docs/specs/personas.md`. Aurora: *"Warm and gentle, a soft place to land."*; Orion:
*"Steady and grounded, a calm anchor."*; Lyra: *"Bright and playful, lifts the mood."*).
**Personality is carried by the voice line + the illustration register, NOT a per-persona color** — keep all
three on the same warm system. **Aurora is softly pre-highlighted** (a subtle soft shadow lift + a gentle
**Library Wine selection ring** / `accent active tint` fill — the one accent here). A quiet
**`text-tertiary` note** *"Personalities can be tuned with Premium."* Bottom: the **primary** that names the
choice — **Start chatting with {name} →** (Library Wine), updating its label to the selected companion.
*Motion (design intent — feel, not timings):* **Hero / emotional — gentle motion earned here.** On selection:
**soft press + a satisfying CONFIRMATION HAPTIC**; the **chosen card gently rises and settles** (soft-shadow
deepens e1→e2, no bounce) while the **unselected cards quietly recede** (dim / slight desaturate) so the eye
lands on the choice; the selection ring eases in on the wine token and the CTA label cross-fades to the new
name. Cards may arrive in a soft staggered entrance on first load. **Reduce-motion:** drop the rise/recede
travel — show a **static highlight + selection ring + the color/dim shift** to mark the choice, and **keep
the confirmation haptic** (motion is never the only channel).
*Borrow / avoid:* **Borrow:** stacked single-column "pick one" cards (clarity over a crowded grid); character/
voice-led selection (let the one-liner do the personality work); the Aurora-preselected sensible-default
pattern. **Reject Replika-style heavy avatar customization** — this is a curated choice, not a builder.
**Avoid (AI-slop tells):** a different accent color per persona · glowing/animated avatar orbs · a 3-up grid
of tiny cards · trait sliders on this screen · ✨/emoji personality tags · all three cards shouting for
attention (only the selected one leads) · a celebratory confetti/burst on select.

**▸ Curated avatars (post-decision).** The three avatars are the locked **curated character portraits**
(Aurora / Orion / Lyra masters; see [`docs/specs/personas.md`](../../specs/personas.md) Avatars). Keep
THIS screen about the *choice of companion* — one master portrait per card. A user picks or changes the
specific **look** later in the companion customize screen (a per-persona curated gallery), not here; do
NOT turn this into a look-browser (it dilutes the one-clear-choice guardrail). **No user image upload
anywhere in the app.**

## Conversation — `firstchat`

Design the **first conversation** — onboarding ends HERE, not a dashboard. Open the real chat screen with
the chosen companion greeting Maya warmly by name; let it breathe. This is the **first appearance of the
reusable chat components** (header with avatar + name + honest "AI companion" marker; warm bubbles; the
bottom input dock) — build them here so the one-off Chat screen reuses them.
- *opening*: one warm opener from Aurora — *"Hi Maya, I'm really glad you're here. There's no script and
  no rush. What's on your mind today?"* — with a quiet, dismissible first-session AI-disclosure banner
  pinned above the thread: *"Aurora is an AI companion, here for support, not a substitute for
  professional care."* (template: *"{Companion} is an AI companion, …"*; **Maya** is the demo
  `{firstName}`, **Aurora** the demo `{Companion}`).
- *typing*: the greeting arriving via the **calm typing reveal** (natural-writing pace; reduce-motion →
  snap to final, keep the haptic).
Guardrail: end in the conversation; reuse these chat components in the Chat one-off rather than rebuilding.

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* The onboarding **payoff** — land in **real chat**, not a dashboard. This screen **BUILDS the
reusable chat components** the Chat one-off later reuses verbatim. Top→bottom: **header** — `BackChevron` ·
the **hand-crafted avatar** (**header only, never per-bubble**) · **name "Aurora"** (Newsreader) with the
persistent honest **"AI companion"** caption beneath (the locked disclosure marker) · a `•••` overflow; then
the **thread** with the quiet, dismissible **first-session AI-disclosure banner pinned above it**; then the
**input dock** at the bottom (a **structural** surface — warm hairline + soft radius 12, send affordance
appears only when the field is non-empty). Aurora's greeting is a **two-sided softened companion bubble**
(left, warm-paper `sheet` + soft shadow `e1`, **softened asymmetric radius 18/18/18/6**, **Hanken** inside);
a **Newsreader serif greeting/divider moment** ("Today") is welcome since this is *the* moment. Cap the
bubble ~78–82% width for a comfortable measure. The greeting (verbatim): *"Hi Maya, I'm really glad you're
here. There's no script and no rush. What's on your mind today?"* — it **invites, doesn't interrogate, and
doesn't over-claim intimacy**.
*Per-state:*
- **opening** — the greeting bubble settled in the thread, disclosure banner above, input dock idle and
  ready (empty field, send hidden). The calm resting payoff state.
- **typing** — the greeting **arriving** via the signature **calm typing reveal** (a three-dot "thinking"
  bubble where the reply will land → a **word/clause-grouped reveal** at reading cadence that **decelerates
  so it lands softly**); pre-size the bubble so it doesn't reflow. **No blinking token cursor / typewriter.**
*Motion (design intent — feel, not timings):* This is **the emotional payoff of onboarding — give it extra
room.** The typing reveal is the one earned hero moment: paced like *natural writing*, landing softly, with a
**soft completion haptic** when the greeting finishes. Header + banner may settle in gently first so the
thread feels like it's "opening to" Maya. Soft press + haptic on the dock. **Reduce-motion (hard req):** the
greeting **appears whole via a single dissolve** (no per-word reveal, no travel) and **keeps the completion
haptic** — motion is never the only channel.
*Borrow / avoid:* **Borrow:** Pi's clean avatar-free reading column + restraint; Apple Messages
send/typing *feel* (not literal tails); Day One / Stoic serif "moment" dividers for the greeting beat.
**Avoid (AI-slop tells):** blinking token cursor or character-by-character typewriter · per-bubble avatars ·
✨/🤖 in the greeting · a full-width ChatGPT prose block · a glass/blur input dock · neon send button · a
fake "online" presence dot · over-intimate or scripted-feeling opener copy · landing on a dashboard instead
of the conversation.
