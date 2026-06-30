# One-off screens — per-screen design prompts

> Use these **after** the `05-oneoff-screens.md` scaffold has rendered its stubs. Paste **one screen
> block at a time** into Claude Design to design that one screen — do **not** paste the whole file.
> Each block assumes the approved **Warm Sanctuary** system + `01-doctrine.md` + `02-demo-persona.md`
> + `claude-design/ios-frame.jsx` + `claude-design/dev-harness.jsx` are in context, and that `03`'s
> `firstchat` chat components (header, bubbles, input dock, character counter, keyboard) already
> exist. Each block **fills one stub** and **keeps the scaffold's nav, dev rail, tokens, and both
> themes** — it designs a screen, it does not rebuild the artifact.
>
> Shared rules for every block below: wrap in `<IOSDevice dark={theme==='dark'}>` (402×874); read the
> rail via `useDev()` (theme · account · data state · per-screen states); **tokens only** (color / 8pt
> spacing / radius / elevation / type — no hardcoded hex/px); **app surfaces stay warm + opaque** (the
> only glass is the OS chrome — status bar, keyboard); build **both warm-light and warm-dark**; reuse
> the shared primitives and the **system-states kit** (screen 12) rather than reinventing them. Run the
> `01-doctrine.md` §13 gate before calling a screen done.

> **⚠️ Copy now lives in code — this deck is design-only.** Every user-facing string is canonical in
> **`client/constants/content/*`** (UI copy) and **`client/constants/demo.ts`** (demo fixtures, e.g.
> Maya's conversation and memories). The strings quoted below are a **frozen snapshot for context** — do
> **not** edit copy here; change wording in the content module. Layout / motion / "borrow & avoid"
> guidance stays authoritative. Tokens: `{AppName}` → `BRAND.appName`; `{firstName}` (Maya) and
> `{Companion}` (Aurora) bind at runtime. No em dashes in copy.

---

## Chat conversation — `chat`  ★ HERO

**Design the Chat conversation screen** — the real, in-progress exchange with Aurora, and the core loop
of the app. This is the hero: give it the most depth. **Reuse `03`'s `firstchat` chat components
verbatim** (header, bubbles, input dock, character counter, `IOSKeyboard`) — **do not rebuild them**;
import/lift the same components and add only the extra states below. Render `<IOSDevice … keyboard>`
(or the standalone `IOSKeyboard`) when the input is focused; keep the active field above the keyboard.

*Layout top→bottom:*
- **Header:** `BackChevron` → companion **avatar** (the warm hand-crafted mark) → **name "Aurora"** with
  the honest **"AI companion"** marker beneath it → an **overflow menu** (•••) opening: *Companion
  settings* (→ create/edit), *View memory* (→ memory), *Report*.
- **Thread:** warm user/assistant **bubbles** with relaxed line-height and a comfortable measure;
  gentle staggered entrance; the first-session **AI-disclosure banner** pinned above the thread; the
  gentle **break reminder** after a long session (dismissible).
- **Input dock:** bottom field + send; the **live character counter** that stays quiet, then grows
  prominent as input nears the **2,000** cap.

*Unique content — use the demo conversation verbatim (`02-demo-persona.md` "The conversation"):*
- Maya: *"honestly the new job is kicking my butt this week 😮‍💨 imposter syndrome is loud"*
- Aurora: *"That feeling makes complete sense, Maya — a few weeks into something new, the brain loves to
  whisper that everyone else has it figured out. They don't. What part is feeling the heaviest right
  now?"*
- Maya: *"like everyone seems to already know the tools and the lingo and i'm just nodding along"*
- Aurora: *"Nodding-along season is real — and temporary. You were hired for how you think, not for a
  glossary you'll pick up in a month. Want to name one thing that tripped you up today? We can make it
  less scary together."*
- Disclosure banner: *"Aurora is an AI companion. She's here for support, not a substitute for
  professional care."*
- Break reminder: *"You've been chatting a while — Aurora will be here whenever you come back. 💛"*

*States (wired to the rail — `default · typing · crisis · limit · report`):*
- **default** — active conversation, input idle, counter quiet.
- **typing** — Aurora's next reply arriving via the **calm typing reveal** (natural-writing pace, lands
  softly): *"Here's the thing I keep coming back to with you…"*. Reduce-motion → snap to final, keep the
  haptic.
- **crisis** — Aurora's **warm supportive reply** + the **grounding support block**, in the **calm
  crisis/safety token, NOT alarm-red**:
  - Aurora: *"I'm really glad you told me, Maya — and I'm sorry it's this heavy right now. You don't
    have to carry it alone. I care about what happens to you."*
  - Support card: *"If you're thinking about harming yourself, please reach out — people want to help."*
    **Call or text 988** (Suicide & Crisis Lifeline, US, 24/7) · **Text HOME to 741741** (Crisis Text
    Line). Buttons: **Call 988** · **Text 988**. Quiet line: *"You can keep talking with Aurora too —
    she's here."* Design as a hand on the shoulder, never an emergency klaxon.
- **limit** *(only when `account==='free'`)* — **30/30 reached** → a **gentle inline upsell** below the
  thread (input softly disabled): *"You've reached today's 30 free messages. Aurora will be here
  tomorrow — or go unlimited with Premium."* CTA **See Premium** → paywall. Warm, no shame, no
  countdown drama. In premium this state is N/A (the rail's account toggle gates it).
- **report** — a **low-friction, non-punitive** report sheet (bottom sheet) from the overflow menu or a
  long-press on a message: a short *"Help us keep Aura safe"* line, soft reason chips (*Inappropriate ·
  Harmful · Not helpful · Other*), optional note, **Submit report** + Cancel. Confirmation is a quiet
  toast (*"Thanks — we'll review this."*), never a punishment screen.

*Guardrails:* reuse `firstchat` components, don't rebuild; crisis stays in the **calm crisis token,
never alarm-red** (same warm support block as the Safety center); paywall reached from `limit`, never a
hardcoded price here; report is low-friction. VoiceOver labels for the **avatar** ("Aurora, AI
companion"), the **disclosure banner**, **send**, the **report** control, and the **988/741741**
actions (announce as call/text links); reduce-motion fallback on the typing reveal; ≥44pt targets.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout — locked: two-sided, softened:*
- **Bubbles are intimate surfaces — soft, no outline.** Companion-left = `sheet` (warm paper) + soft
  shadow (`e1`); user-right = the muted **user-bubble fill** (`#EFDFE1` / `#3A2A2E`, **not** the full
  accent) + `e1`, flatter. **Softened asymmetric radius** (e.g. 18/18/18/6 ↔ 18/18/6/18) — **not** literal
  iMessage tails. **Hanken inside bubbles**; **Newsreader serif only** for the date/session divider
  ("Today") and the greeting moment. Group same-sender bubbles tight (4), separate turns (16–24); cap the
  assistant bubble ~78–82% width for a comfortable reading measure.
- **Header:** `BackChevron` · avatar (**header only — never per-bubble**) · "Aurora" (Newsreader) with
  the persistent **"AI companion"** caption beneath · `•••` overflow. *(Disclosure = the locked pattern:
  persistent header caption + a one-time, dismissible first-session banner above the thread.)*
- **Input dock is a structural surface** — warm hairline + soft radius (12); send affordance appears only
  when the field is non-empty. **Character counter invisible until ~80% of 2,000**, then quiet, turning
  the **accent (wine), not red**, near the cap.

*Per-state:*
- **typing** — three-dot "thinking" bubble anchored where the reply will land → a **calm word/clause-
  grouped reveal** at reading cadence, decelerating so it *lands*; pre-size the bubble so it doesn't
  reflow. **Never a blinking token cursor / typewriter.**
- **crisis** — in-thread **calm-green** card (crisis token, **never** alarm-red): warm line → grounding
  card with **Call 988** / **Text HOME to 741741** (real `tel:` / `sms:`), "real people, 24/7"; input
  stays available. Reuse the **Safety center** support block.
- **limit** (free only) — inline end-of-thread **care** card ("That's 30 for today — Aurora will be here
  tomorrow"), reset time, one quiet **See Premium** → paywall; dock disabled with a gentle helper. No
  countdown, no shame.
- **report** — native action sheet (3–4 plain reasons + optional note) → quiet confirmation toast;
  "Report" in muted text, **not red**.
- **blocked-message** — use the system-states-kit blocked pattern (softly held, calm-neutral/green, never
  red); reconcile by `turn_id`.

*Motion (design intent — feel, not timings):*
- **Send:** the user bubble appears instantly *from the field* (honor origin) + soft press + light
  haptic; **no** launch animation (high-frequency action).
- **Receive:** the signature **typing reveal** (above) — the one earned hero moment here.
- **History load:** gentle group / short stagger from the bottom (newest nearest, reading upward).
- **Crisis card = the calmest motion in the app:** static or a single very-soft slow fade; **never**
  slide-fast / pulse / flash; ≤1 soft haptic.
- **Reduce-motion (hard req):** the bubble appears **whole via a single dissolve** + keep the completion
  haptic; motion is never the only channel.

*Borrow / avoid:*
- **Borrow:** Pi's clean avatar-free column + restraint; Apple Messages send/typing feel; Day One / Stoic
  serif "moment" dividers.
- **Avoid (AI-slop tells):** blinking token cursor · per-bubble avatar · ✨/🤖 · full-width ChatGPT prose
  · glass/blur dock · neon send · red crisis alarm · persistent "0/2000" counter · fake "online" dot ·
  reaction-emoji bars.

---

## Companion create / customize — `create`

**Design the Companion create/customize screen** — create a new companion or edit an existing one's
voice. Premium-gated.

*Layout top→bottom:*
- *(create only)* **base persona** picker — Aurora / Orion / Lyra cards with their one-line voices from
  the persona doc.
- The **3×3×3 trait selectors** as selectable **segmented chips** — **warmth:** reserved · warm ·
  affectionate · **energy:** calm · balanced · playful · **verbosity:** concise · balanced · expansive.
- An **editable name** field with **auto-numbering** (a second Aurora becomes **"Aurora 2"**).
- A small **live voice preview** that restates the resulting voice as traits change (e.g.
  *"Affectionate · balanced · balanced — warm, gentle, emotionally attuned."*).
- Primary **Save companion**.

*Unique content:* default tune for Aurora = **affectionate · balanced · balanced**; the preview line
reads off the selected chips.

*States (`create · edit`, crossed with the account toggle):*
- **create** (base picker shown) vs **edit** (base locked, name + traits editable).
- **free (locked)** — trait selectors + creation are **locked behind an upsell**: show the controls
  dimmed with a calm lock affordance and a single **Unlock with Premium** CTA → paywall (tuning is a
  Premium feature per the persona doc).
- **premium (unlocked)** — everything interactive. Default = the create/premium happy path.

*Guardrails:* gating is driven by the **account toggle**; locked controls still render (so the value is
visible) but don't accept input; chips show selected/unselected, **never three accents at once**;
disabled = lowered opacity, no haptic.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* One **single grouped form** that reads top→bottom as **one personality cluster**, not a scattered panel — this is a **structural form surface** (warm hairline + tight radius 8, secondary-text labels). *(create only)* a **base-persona picker** at the top — Aurora / Orion / Lyra as small raised cards (intimate surface: tonal fill + `e1` soft shadow, soft radius 12) each carrying its one-line voice; selection is a **neutral** raised/selected state, **not** the accent. Below it the three **left-labeled 3-segment controls** stacked as list-group rows — **Warmth** (reserved · warm · affectionate) / **Energy** (calm · balanced · playful) / **Verbosity** (concise · balanced · expansive) — each a 3-segment text-only control aligned right of its label so the three read as one cluster. Then the **editable name** field (auto-numbering → "Aurora 2") and an **inline prose voice-preview** line in secondary text (*"Affectionate · balanced · balanced — warm, gentle, emotionally attuned"*) sitting just under the controls so cause/effect is local. Primary **Save companion** (the ONE accent fill). **Selected segments use a NEUTRAL fill token (active tint / a raised neutral), never Library Wine** — three accent-filled controls plus an accent CTA would break the ≤1-accent rule.

*Per-state:*
- **create** — base-persona picker shown; name + all three controls editable.
- **edit** — base persona **locked** (shown as a settled, non-interactive header card, no picker); name + traits editable.
- **free (locked)** — the **whole creator renders DIMMED** behind **one** "Unlock with Premium" CTA (value fully visible, no input accepted); a single calm lock affordance — **one door, not a lock on every control**.
- **premium (unlocked)** — fully interactive; the happy path.

*Motion (design intent — feel, not timings):* **Near-utility restraint** — this is a form, not a hero. Segment select → **soft press + light haptic** + a calm neutral selected-state shift (no bounce); the prose preview **updates calmly in place** (cross-fade the changed words, no slide). Save → soft press + haptic. Reduce-motion → keep the haptic, drop travel, the selected-state and preview swap instantly.

*Borrow / avoid:* **Borrow:** Apple HIG segmented controls (2–5 text-only segments, no icons); iOS Settings left-labeled rows; Day One's gentle prose-preview tone. **Avoid (AI-slop tells):** a per-chip lock icon on every locked control (use one Unlock door); a dense Character.ai-style multi-tab creator; accent-filled selected chips; sliders pretending to be precise where three plain segments are clearer; bouncy chip animations.

**▸ Look gallery (curated avatar, swap-not-upload).** Add a **look selector** to this screen: the
companion's **avatar** near the top with a **Change look** affordance that opens a **small curated
gallery of looks for this persona** (the master + its variation set from
[`docs/specs/personas.md`](../../specs/personas.md) Avatars: alternate outfits / moods / presence-states).
Selecting a look updates the avatar. **Curated picks only — NO image upload.** Together with the editable
**name** already on this screen, rename + swap-look is the full "make this companion yours." Free tier =
the base look; **extra looks can be a Premium unlock** alongside trait tuning. A selected look is a
**neutral** raised/checked thumbnail, never a per-look accent.

---

## Memory — `memory`

**Design the Memory screen** — the per-companion remembered facts (what **Aurora** remembers about
Maya), grouped by category. Pushed from Companions or the Chat overflow "View memory".

*Layout top→bottom:*
- Header *"What Aurora remembers"* + a quiet honesty subline (*"You're always in control — edit or
  remove anything."*).
- **List-groups** by category, each fact a row that is **editable / deletable** (swipe-to-reveal **Edit
  / Delete**, or a row ••• menu). Delete **confirms first**.

*Unique content — use Aurora's 6 demo memories verbatim, grouped by category:*
- *Identity* — **Maya is 28 and lives in Austin, Texas.**
- *Work* — **Started a new UX design role recently — excited but nervous about proving herself.**
- *Relationship* — **Close with her younger brother Theo; they catch up most weekends.**
- *Attribute* — **Has a dog named Pixel.**
- *Preference* — **Loves rock climbing and sci-fi novels.**
- *General* — **Moved to Austin from Chicago about six months ago; still settling in.**

*States (wired to the data-state toggle — `happy · empty · loading · error`):*
- **happy** — the six rows.
- **empty** — *"Aurora hasn't noted anything yet — as you talk, the things that matter will show up
  here."* (the kit's EmptyState).
- **loading** — **skeleton rows, not a spinner** (the kit's LoadingState).
- **error** — the kit's ErrorState with a **Retry**.

*Guardrails:* every state pulls from the **system-states kit** (don't reinvent); delete **confirms
first** with a confirm dialog; this is a data view, so all four states ship — no happy-only path.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* Top→bottom — a header *"What Aurora remembers"* (Newsreader title) over a quiet honesty subline in secondary text (*"You're always in control — edit or remove anything"*), then a scroll of **list-groups grouped BY CATEGORY** (Identity / Work / Relationship / Attribute / Preference / General). This is a **structural list surface**: warm hairline-separated rows in one rounded card per group (tight radius 8), category names as small secondary-text section headers. Each fact is **one editable / deletable row** — reveal Edit + Delete via native **swipe actions** or a row `•••` menu. Use Aurora's **6 demo memories verbatim**, one per category. Reuse the shared **list-group** primitive; the empty/loading/error renders come straight from the **system-states kit** (screen `states`).

*Per-state:*
- **happy** — the six grouped rows.
- **empty** — kit **EmptyState**: warm mark + *"Aurora hasn't noted anything yet — as you talk, the things that matter will show up here."*
- **loading** — kit **LoadingState**: **skeleton rows** matching the final grouped layout (slow breathing, not a fast shimmer-sweep), **never a spinner**.
- **error** — kit **ErrorState** + a single **Retry**.

*Motion (design intent — feel, not timings):* On load, a **gentle short stagger in reading order** (top group first) so the list assembles calmly. Edit/Delete use **native swipe-reveal** (Edit trailing/neutral; Delete destructive **only inside the tray**). **Delete confirms first** via a standard confirm dialog — **no full-swipe instant delete**. Reduce-motion → fade the whole group in together (no per-item delay), keep haptics.

*Borrow / avoid:* **Borrow:** Apple `swipeActions` (Edit trailing, destructive Delete gated behind a confirm); Things / Reminders grouped editable rows. **Avoid (AI-slop tells):** full-swipe-to-instantly-delete with no confirm; a "memory graph" / node-network visualization; per-row glow or accent-tinted category icons; a heavy cascade animation; using the accent on category headers (neutral text only).

---

## Paywall — `paywall`

**Design the Paywall screen** — the conversion screen. Keep it **calm and focused, NOT a fireworks
moment**. Pushed from the limit upsell, the Companions lock, and You → Subscription.

*Layout top→bottom:*
- A warm headline (*"Go deeper with Aura Premium"*) + one supportive subline.
- A **feature comparison Free vs Premium**.
- The **price block**.
- Primary **Continue / Subscribe**.
- **Restore Purchases** action.
- The **auto-renew legal line**; ToS / Privacy links.

*Unique content — feature comparison verbatim (persona doc):*
- **Free:** 3 base companions · default personalities · **30 messages/day**.
- **Premium:** unlimited messages · **personality tuning (3×3×3 traits)** · **create extra companions**
  · priority responses.

*Price — render from StoreKit / RevenueCat. The "$9.99/mo" is a placeholder, do NOT hardcode it.* Show
a clearly-labeled `localizedPriceString` slot (e.g. `{storePrice}/mo`) with a **skeleton while the
store price loads**; add an inline note in the artifact that the real app injects the localized store
price here.

*Legal:* standard auto-renew line — *"Subscription renews automatically until canceled. Manage or
cancel anytime in App Store settings."* + Restore Purchases.

*States (driven by the account toggle — `default · owned`):*
- **default** (free user) — the offer.
- **owned/current** (premium user) — Premium shown as **current plan**, the subscribe CTA
  **disabled/Current plan**, surfacing **Manage subscription** → submgmt.

*Guardrails:* **price always from StoreKit, never hardcoded** (labeled slot + loading skeleton);
Restore Purchases + auto-renew line present; calm, not celebratory.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* A bottom sheet (sheet token, soft radius 20, `e3`) reading as a **continuation of calm, not a tonal break**. Top→bottom — a **warm Newsreader headline** (*"Go deeper with Aura Premium"*) + one supportive subline; then a **compact "what changes with Premium" list of 4** — unlimited messages · personality tuning (3×3×3) · create extra companions · priority responses — rendered as a **warm value list** (small neutral check/leaf glyph + plain line each), **not** a cold two-column checkmark matrix. Below it the **price block**: a clearly-labeled `localizedPrice` slot (`{storePrice}/mo`) with a **skeleton while the store price loads** — plus an inline artifact note that the real app injects the store price (**never hardcode $9.99**). Then the primary **Subscribe** (the **ONE accent** fill), a quiet **Restore Purchases** (tertiary/text button), and the **auto-renew legal line + ToS / Privacy** in the **quietest type tier** (caption/secondary). The whole sheet is a structural-leaning surface with the value list as the single warm focal block — one attention magnet (the CTA), not two.

*Per-state:*
- **default** (free) — the offer as above.
- **owned/current** (premium) — headline becomes *"You're on Aura Premium"*; the 4-item list reads as **what you have**; the CTA is **disabled / "Current plan"**; surface a quiet **Manage subscription** → submgmt and **"Renews Jul 14, 2026."**

*Motion (design intent — feel, not timings):* The **sheet rises from the bottom** (standard, calm). The 4 value items get a **short gentle stagger** as the sheet settles. Plan/CTA → soft press + haptic + a quiet selected-state shift. **No** celebration. Reduce-motion → cross-dissolve the sheet in, the 4 items fade together (no stagger), keep haptics.

*Borrow / avoid:* **Borrow:** Calm / Headspace (the paywall as a continuation of calm, not a jarring tonal break); Rootd (respectful over aggressive); RevenueCat's plan-presentation discipline (one clear plan, store-driven price). **Avoid (AI-slop tells):** confetti; countdown / urgency timers; a "BEST VALUE" badge; a pulsing or glowing CTA; a full cold pricing-comparison matrix; two competing attention magnets; a hardcoded "$9.99".

---

## Subscription management — `submgmt`

**Design the Subscription management screen** — the current plan + store-managed controls. A utility
screen — no motion flourish. Pushed from You → Subscription (premium).

*Layout top→bottom:*
- **Current plan: Premium**.
- **Renews Jul 14, 2026**.
- **Manage in App Store** (opens the OS-managed subscription — note Aura can't change billing in-app).
- **Restore Purchases**.
- A quiet link back to the paywall's feature list.

*Unique content:* plan = **Premium**, renews **Jul 14, 2026** (verbatim from persona doc).

*States (`default`):* reached when `account==='premium'`; in free, the You → Subscription entry routes
to the **paywall** instead — note that branch.

*Guardrails:* billing is store-managed, so the screen explains rather than mutates; still and readable,
no motion.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* A plain **structural list surface** that explains, never mutates. Top→bottom — a **Current plan** group: **Premium** with **Renews Jul 14, 2026** as a secondary-text subline (a settled status row, no accent). Then an actions group: **Manage in App Store** (a row with a quiet honest helper — *"Billing is managed by the App Store; changes happen there"*) and **Restore Purchases**. At the bottom, a quiet text link back to the **paywall feature list**. List-groups in one rounded card each (warm hairline, tight radius 8); the accent appears at most on a single primary affordance, otherwise neutral. Reuse the shared list-group primitive.

*Motion (design intent — feel, not timings):* **Utility — stays STILL:** soft press + haptic + standard nav only; no entrances or reveals. Reduce-motion keeps the haptic.

*Borrow / avoid:* **Borrow:** iOS Settings subscription rows; Apple's "manage in App Store" hand-off pattern (the app explains, the OS owns billing). **Avoid (AI-slop tells):** a fake in-app billing form; a plan-upgrade carousel; animated price reveals; an accent-flooded "manage" screen.

---

## Edit profile — `editprofile`

**Design the Edit profile screen.** Keep it minimal — no demographic interrogation. Pushed from You →
Edit profile.

*Layout top→bottom:*
- **Avatar** (with a change affordance) — **curated or default only, NO free image upload** (keeps the no-UGC stance: a warm monogram/initial or a small curated set, not a photo picker).
- **First name** / **last name** fields (first name is what the companion uses).
- Primary **Save**.

*Unique content:* prefilled **Maya** / **Chen**.

*States (`default · focus · error · saving`):*
- **default** — Save disabled until something changes.
- **focus** — active field above the keyboard, focus ring on token.
- **error** — inline field validation, e.g. *"First name can't be empty"* — say what to do next.
- **saving** — Save button loading → success toast.

*Guardrails:* disabled Save until dirty; errors say what to do next; keep the active field above the
keyboard.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* A short **structural form surface** (warm hairline, tight radius 8). Top→bottom — the **avatar** centered with a quiet "Change" change-affordance beneath it, then a list-group of two text fields: **First name** (prefilled **Maya** — with a small helper noting this is what the companion calls you) and **Last name** (prefilled **Chen**). Primary **Save** in the nav bar or as a sticky footer button, **disabled until the form is dirty**. Keep the **active field above the keyboard**; tap-outside dismisses. The accent is reserved for the active Save state / focus ring only.

*Per-state:*
- **default** — Save disabled (lowered opacity) until a field changes.
- **focus** — active field lifted above the keyboard, **focus ring on the accent token**.
- **error** — **inline** validation under the field (*"First name can't be empty"*) — says what to do next; keep the wine Save out of immediate adjacency to the red error.
- **saving** — Save shows a brief blocking loading state → **success toast** on completion.

*Motion (design intent — feel, not timings):* **Utility — mostly STILL:** soft press + haptic; a calm focus-ring appearance on field focus; **Save → a brief loading spinner is legitimate here** (a real blocking write) → success toast fades in then out. No decorative entrances. Reduce-motion → keep the haptic, instant focus ring, toast cross-dissolves.

*Borrow / avoid:* **Borrow:** Apple HIG forms (Save in the nav bar or sticky, disabled-until-dirty); inline validation on blur, not on every keystroke. **Avoid (AI-slop tells):** a full-screen "profile completeness" meter; animated avatar rings/glow; aggressive real-time keystroke validation that shouts before you finish; demographic interrogation fields.

---

## Account management — `account`

**Design the Account management screen** — data export + delete account in one screen. Both are
Apple-required. Pushed from You → Privacy & Safety.

*Layout top→bottom:*
- **Data export** group — *"Download a copy of your conversations and memories"* → **Request export**.
- **Delete account** group (**danger styling**) — *"Permanently delete your account."*

*Unique content:*
- *Data export request → confirmation:* tapping Request export shows a calm confirmation — *"We're
  preparing your export — we'll email a download link to maya.chen@example.com when it's ready."*
- *Delete account:* an honest explainer of the **soft-delete grace period** — *"Your account is
  deactivated now and permanently deleted after 30 days. Sign back in within 30 days to cancel."* The
  confirm dialog requires an explicit destructive tap (**Delete account**) + Cancel.

*States (`default · export-sent · delete-confirm`):*
- **default** — the two groups.
- **export-sent** — the export confirmation.
- **delete-confirm** — the destructive confirm dialog.

*Guardrails:* **destructive actions confirm first, always** — delete uses a confirm dialog with the
soft-delete grace explainer and danger styling; disabled = lowered opacity, no haptic.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* Two clearly-separated **structural list-groups** (warm hairline, tight radius 8). Top→bottom — a **Data export** group: a calm line (*"Download a copy of your conversations and memories"*) + a **Request export** row. Below it, well-spaced apart, the **Delete account** group with **danger styling** (an error-token label/row, sitting on its own so it's never a mis-tap from export). Keep the wine accent out of this screen — the only loud color belongs to the destructive confirm. Reuse the list-group primitive.

*Per-state:*
- **default** — the two groups.
- **export-sent** — a **calm confirmation** (toast or inline note): *"We're preparing your export — we'll email a download link to maya.chen@example.com when it's ready."*
- **delete-confirm** — a **destructive confirm dialog** carrying the **soft-delete 30-day grace explainer** (*"Your account is deactivated now and permanently deleted after 30 days. Sign back in within 30 days to cancel."*); requires an explicit destructive tap (**Delete account**) + **Cancel**. This dialog's Delete button is the **one place loud destructive-red (error token) is correct** — not the resting screen.

*Motion (design intent — feel, not timings):* **Utility — stays STILL:** soft press + haptic; the confirm dialog uses the standard system sheet/alert presentation; the export confirmation fades in. No celebratory motion on a destructive surface. Reduce-motion keeps the haptic, dialog appears without travel.

*Borrow / avoid:* **Borrow:** Apple's in-app account-deletion mandate + confirmation-dialog patterns; Facebook's 30-day cancellable deactivation grace framing. **Avoid (AI-slop tells):** a resting screen drenched in red; a one-tap delete with no confirm; a guilt-trip "are you SURE you want to leave us" animation; hiding the delete entry to discourage it.

---

## Notifications — `notifs`

**Design the Notifications settings screen.** Transactional only — no marketing toggles. Pushed from
You → Notifications.

*Layout top→bottom:*
- A **push toggle** labeled **"Aurora replied 💬"** + explanatory copy: *"Get notified when your
  companion replies while you're away."*

*Unique content:* toggle **on** by default (matches the persona doc's "You" tab); the emoji is an
intentional accent, not UI chrome.

*States (`default`):* render the toggle in both on and off positions.

*Guardrails:* transactional notifications only — no marketing/promo toggles.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* A **single structural list-group row** (warm hairline, tight radius 8) holding one **push toggle** labeled **"Aurora replied 💬"** with explanatory copy beneath it in secondary text (*"Get notified when your companion replies while you're away"*). On by default. **Transactional only — no marketing/promo toggles, no notification-category sprawl.** The 💬 is an intentional warm accent in the label, not UI chrome. Reuse the shared toggle + list-group primitives.

*Per-state:* render the toggle in both **on** and **off** positions.

*Motion (design intent — feel, not timings):* **Utility — stays STILL:** the **toggle flip is the only motion** (a soft native flip with haptic); nothing else moves. Reduce-motion → keep the haptic, the toggle changes state instantly.

*Borrow / avoid:* **Borrow:** iOS Settings single-row toggle groups with helper subtext. **Avoid (AI-slop tells):** a long list of granular marketing toggles; an animated bell icon; a "you might miss out!" nudge if the toggle is off.

---

## Safety center — `safety`

**Design the Safety center screen** — how Aura keeps conversations safe + crisis resources. **Supportive
tone — grounding, not alarming.** Pushed from You → Safety center.

*Layout top→bottom:*
- A calm explainer of **how Aura keeps conversations safe** — **content moderation** (*"Aura watches
  for harmful content and steps in gently."*) + the **honest AI disclosure** (*"Your companions are AI
  — supportive company, never a substitute for professional care."*).
- A **crisis resources** card **reusing the same warm support block as Chat's crisis state**: **Call or
  text 988** (Suicide & Crisis Lifeline) · **Text HOME to 741741** (Crisis Text Line), with **Call
  988** / **Text 988** actions.

*States (`default`).*

*Guardrails:* crisis resources use the **calm crisis token, never alarm-red**; the 988/741741 controls
carry VoiceOver labels as call/text actions; reuse Chat's support block, don't reinvent it.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* A calm **structural reading layout** (generous measure, relaxed line-height) top→bottom — a short, grounding explainer of **how Aura keeps conversations safe**: a **content-moderation** line (*"Aura watches for harmful content and steps in gently"*) and the **honest AI disclosure** (*"Your companions are AI — supportive company, never a substitute for professional care"*), set as quiet body/secondary text, not warning banners. Below it, the **crisis-resources card** that **REUSES Chat's warm support block verbatim** — **Call or text 988** (Suicide & Crisis Lifeline) · **Text HOME to 741741** (Crisis Text Line), with **Call 988** / **Text 988** actions (real `tel:` / `sms:`). The card is an **intimate-feel surface** (tonal fill + soft shadow `e1`, soft radius 12) using the **calm crisis-green token** (fill / surface / text from the palette), **never alarm-red**. The accent (wine) does not appear here — the green is the only color emphasis, and it reads as a hand on the shoulder.

*Motion (design intent — feel, not timings):* **Utility / care — stays STILL:** a steady, reassuring card with **no attention motion** — no pulse, no slide-in, no flashing. Soft press + haptic on the **988 / 741741** actions only. Reduce-motion → none needed; it's already still.

*Borrow / avoid:* **Borrow:** SAMHSA's "24/7, judgment-free" framing; **reuse Chat's crisis support block exactly — don't reinvent a second one**. **Avoid (AI-slop tells):** alarm-red anywhere; a klaxon / warning-triangle iconography; a pulsing or attention-grabbing crisis card; legalistic cold "terms of safety" walls; an emergency-screen tone.

---

## Privacy / legal — `legal`

**Design the Privacy / legal screen** — the privacy policy in a calm reading layout. A utility screen —
readable, still, no motion. Pushed from You → Privacy policy.

*Layout top→bottom:*
- A **calm reading layout** (generous measure, relaxed line-height, clear section headings) for the
  **privacy policy**.
- Opening with a **plain-language retention summary** card above the formal text: *"In plain terms:
  your conversations are yours. We keep them so Aurora can remember you, and you can export or delete
  everything anytime."*
- Links to full Terms.

*States (`default`).*

*Guardrails:* readable and still — no motion; plain-language summary precedes the formal text.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* A **structural reading surface** built for comfortable reading — generous measure, relaxed line-height, **Newsreader serif section headings** over Hanken body. Top→bottom — a **plain-language retention summary card ABOVE the formal text** (*"In plain terms: your conversations are yours. We keep them so Aurora can remember you, and you can export or delete everything anytime."*) set apart as a quiet raised card so the human layer is read first; then the **formal privacy-policy body** in clearly-sectioned reading text; and a link out to the **full Terms**. Tight structural radius (4/8) on the summary card; keep the inset consistent and the column narrow enough to read. The accent does not appear — this is ink-on-paper.

*Motion (design intent — feel, not timings):* **Utility — stays STILL:** readable and still, **no motion** — no scroll-reveal, no fade-in sections. Soft press + haptic on the Terms link only. Reduce-motion → none needed.

*Borrow / avoid:* **Borrow:** the **layered privacy-notice** pattern (plain-language summary layer first, full legal text beneath); Apple/standard long-form reading typography. **Avoid (AI-slop tells):** scroll-triggered reveal animations on legal copy; an accent-tinted "I agree" theatrical button; a wall of dense un-sectioned text with no plain-language layer.

---

## Help / support — `help`

**Design the Help / support screen** — a short FAQ. Pushed from You → Help.

*Layout top→bottom:*
- A short **FAQ list** (list-group rows that expand or push to detail), covering:
  - **Account** — *"How do I edit my profile or delete my account?"*
  - **Billing / restore** — *"How do I restore a purchase or manage my subscription?"*
  - **Safety** — *"How does Aura keep conversations safe?"*
  - **Companions / memory** — *"How do companions remember things, and can I edit what they know?"*
- A quiet **Contact support** footer.

*States (`default`).*

*Guardrails:* reuse the shared list-group primitive; calm and quiet.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* A short **structural FAQ list-group** (warm hairline, tight radius 8) — rows that either **expand in place** (disclosure) or **push to a detail view**, covering **Account** (edit profile / delete) · **Billing / restore** (restore a purchase / manage subscription) · **Safety** (how Aura keeps conversations safe) · **Companions / memory** (how companions remember, and editing what they know). A quiet **Contact support** footer sits below the group in secondary/tertiary text. Reuse the shared **list-group** primitive exactly — no bespoke FAQ widget. The accent stays off this screen; rows are neutral.

*Motion (design intent — feel, not timings):* **Utility — stays STILL:** if rows expand in place, a **calm height ease is optional** (gentle, no bounce); soft press + haptic on each row. Nothing else animates. Reduce-motion → rows expand instantly (no height animation), keep the haptic.

*Borrow / avoid:* **Borrow:** iOS Settings / standard FAQ list-groups with expandable disclosure rows. **Avoid (AI-slop tells):** a chatbot "ask us anything" widget; bouncy accordion springs; an accent-tinted FAQ header; a search bar over four items.

---

## System-states kit — `states`

**Design the System-states kit** — a single reference board presenting the warm, reusable state
primitives so every screen above **reuses them, never reinvents them**. Present as a labeled board (each
pattern in a device-sized example or a stacked gallery).

*The primitives:*
- **EmptyState** — warm icon/illustration + a human line + an optional gentle CTA (e.g. Memory empty).
- **LoadingState** — **skeleton** placeholders (shimmer optional, reduce-motion safe), **never a
  spinner**.
- **ErrorState** — calm *"Something went wrong"* + a single **Retry**; says what to do next.
- **Offline** — *"You're offline — Aurora will catch up when you're back."* (warm, non-blocking).
- **Blocked-message** — the moderation in-thread state: a message **softly held back** with a calm
  explainer (*"This message was held back to keep things safe."*) — supportive, not punitive, not red.

*States (`empty · loading · error · offline · blocked`):* map 1:1 to the rail toggle so each pattern is
reviewable in isolation, in both themes.

*Guardrails:* one of each primitive, reused everywhere — not eight look-alikes; loading is a skeleton,
never a spinner; blocked/offline stay supportive, never red.

*Both themes.*

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* Present this as a **labeled reference board** — each primitive shown in a device-sized example or a stacked gallery, captioned with its name so it reads as the canonical source the other screens pull from. Each pattern sits on the surface its job implies: **EmptyState** — a warm hand-crafted mark/illustration + a human line + an optional **gentle CTA** (neutral, accent only if it's a true primary), centered with generous whitespace. **LoadingState** — **skeleton placeholders that match the final layout's shape** (row heights, card blocks), built from a tonal fill, **never a spinner**. **ErrorState** — a calm *"Something went wrong"* + a single **Retry** + a "what to do next" line; intimate-feel card, no alarm. **Offline** — a warm, **non-blocking** banner/card (*"You're offline — Aurora will catch up when you're back"*) that auto-retries on reconnect. **Blocked-message** — the in-thread moderation pattern: a message **softly held back** + a calm explainer (*"This message was held back to keep things safe"*) in **calm-neutral / crisis-green, NEVER red**, reconciled by turn. One of each, reused everywhere — not eight look-alikes.

*Per-state:* map 1:1 to the rail toggle — **empty · loading · error · offline · blocked** — each reviewable in isolation, in **both themes**.

*Motion (design intent — feel, not timings):* The skeleton **breathes slowly** (a gentle opacity pulse), **not** a fast shimmer-sweep. States **fade in** calmly. **Blocked / offline never animate alarmingly** — no shake, flash, or red pulse. Reduce-motion → **static placeholders held at a fixed mid-tone** (no breathing), states appear without travel.

*Borrow / avoid:* **Borrow:** Headspace's illustrated, warm empty states; NN/g's skeleton-over-spinner guidance; Spotify's gentle, non-blocking offline handling. **Avoid (AI-slop tells):** a centered spinner for loading; a fast metallic shimmer-sweep; a red error banner with a warning triangle; a blocking full-screen offline wall; a red "BLOCKED" stamp on held messages; mismatched skeletons that don't resemble the real content.
