# RN Port — Fidelity Audit (locked prototype vs port)

**Date:** 2026-06-26. The locked web prototypes in `docs/redesign/claude-design/*` are the source of
truth (untouched since the design lock, commit `7d4eafb`; the RN port only ever touched `client/`).
This catalogs where the Expo RN port (`client/app/*`) deviated, so we can remediate to match.

**Severity:** CRITICAL = a whole feature missing or a locked decision reversed · HIGH = notable
content/layout gap · MED = minor copy/order.

**Root cause:** the port was built from the spec markdown + content constants + the broad layout, not
diffed against the locked prototype JSX — so locked micro-decisions and whole features were dropped,
and a few explicitly-rejected patterns were reintroduced.

---

## HomeTabs (`hometabs-app.jsx`) — audited by hand

### Home — `client/app/(tabs)/index.tsx`
- **[CRITICAL]** Resurfaced **"Aurora remembers"** memory card (happy state) MISSING. Locked: a
  tappable card — label `AURORA REMEMBERS` + a recalled line ("You started a new job. How's it
  going?"). Port left a TODO, no card.
- **[HIGH]** Gentle **starter chips** MISSING. Locked: "Talk through what's on my mind" + "Share
  something good that happened" (empty state: "Tell Aurora a little about your day"). Port has none.
- **[HIGH]** Free-tier **daily usage indicator** MISSING. Locked: a quiet "18 / 30 messages today"
  with a dot, hidden for premium and on the empty state. Port left a TODO, none.
- **[MED]** **Date line** under the greeting MISSING. Locked: full date ("Monday, June 26") under
  "{greeting}, {name}". Port shows only the greeting.
- **[MED]** Greeting buckets differ. Locked has 4 (evening <5, morning <12, afternoon <17, evening);
  port has 3 and drops the pre-5am "Good evening".

### Companions — `client/app/(tabs)/companions.tsx`
- **[CRITICAL]** **Home-companion pin** missing (the "home tab locking"). Locked: each card shows a
  `HOME` chip when pinned, else a pin button "Make {name} your Home companion" (`homeId` state). Port
  has no pin.
- **[CRITICAL]** **No-inline-CTA decision reversed.** Locked: create is an always-accessible header
  **"+"** (top-right; lock badge on free) that opens the creator — explicitly *"never scroll-buried by
  a long roster."* Port has an **inline create row at the bottom of the list**.
- **[CRITICAL]** **Gating model wrong.** Locked: all 3 base companions are free-accessible (the 30/day
  limit is shared, NOT a per-model gate). Port **dims + locks Orion & Lyra on free** with a lock icon.
- **[HIGH]** Free create routes to a **cold paywall**. Locked: free opens the creator **dimmed +
  scrollable** with an "Unlock with Premium" CTA. Port routes the free "+" → `/premium`.
- **[MED]** Card preview line: locked shows the last-message preview, or "Tap to start a conversation"
  when there's no history; port shows `c.lastMessage ?? ''` (blank when none).

### You — `client/app/(tabs)/you.tsx`
- **[HIGH]** Notifications should be a **row → its own screen** (locked: *"a row, not an inline
  toggle"*). Port has a separate Notifications **group with an inline toggle**.
- **[HIGH]** Privacy & Safety should be a single **"Manage your data"** row (export + delete together,
  delete buried a level deeper). Port has **two rows**: Data export + Delete account.
- **[MED]** Account-group order: locked = Edit profile · Sign-in & security · Subscription ·
  Notifications. Port = Edit profile · Subscription · Sign-in & security (+ a separate Notifications
  group).
- **[MED]** Header handle: locked `@maya` vs port derived-from-email; footer "Aura · version 1.0.0" vs
  port "Aura v1.0".

---

## Onboarding (`onboarding-app.jsx`)

### Carousel — `client/app/onboarding.tsx`
- **[CRITICAL]** The **three bespoke hero illustrations** are gone — locked: `ThreadArt` (warm ribbon
  with conversation bubbles, draw-on L→R), `ChatArt` (two warm bubbles with tails), `PresenceArt` (one
  steady bubble + small sun + crescent moon). Port substitutes generic Ionicons
  (`infinite/shield/moon-outline`) in an accent-tinted square. Biggest onboarding gap.
- **[HIGH]** Reintroduces a **rejected pattern**: illustrations sit in an **accent-tinted tile**;
  doctrine §13 bans accent-tinted icon tiles, and slide art is meant to float in open warm space
  "never caged in a container."
- **[MED]** Progress segments swap background color instead of the locked **wine fill growing inside
  each track** (the one sanctioned thin-accent motion). Slide-3 copy drops "Around".

### Welcome — `client/app/welcome.tsx`
- **[MED]** Support line reworded: locked "Someone to talk to who carries your story forward, quietly
  and at your pace." → port "Talk through whatever's on your mind, quietly and at your own pace."
- **[MED]** Missing the small **accent pulse dot** beside the "Aura" wordmark; CTA uses a literal "→"
  char instead of the inline arrow SVG.

### Profile — `client/app/profile.tsx`
- **[MED]** Last-name field loses its `"Optional"` placeholder (optionality no longer visible).
- **[MED]** Inline "First name can't be empty" should trigger on **blur**, not only on Continue tap.

### Persona — `client/app/persona.tsx`
- **[HIGH]** Missing the **wine selection check** on the chosen card (locked "tonal fill + check"); port
  shows selection only via border/shadow/opacity.
- **[MED]** Selected card should fill with **accentTint**; port keeps `raised` for all cards.

### Age gate — `client/app/age-verification.tsx`
- **[CRITICAL]** Locked control reversed — the **3-column DOB scroll wheel** (month/day/year, center
  band, "the sole focal control") is replaced by a single **birth-year text field**. Loses the wheel
  idiom + month/day precision.
- **[MED]** Under-18 dead-end flattens the locked two-tier copy ("You need to be 18…" + "Thanks for
  stopping by.") into one string and **omits the resting dot mark**.

### AI disclosure — `client/app/ai-disclosure.tsx`
- **[HIGH]** Reintroduces **accent-tinted icon tiles** on the AI/privacy cards (doctrine forbids; only
  the crisis card keeps a tile).
- **[HIGH]** Card copy diverges from locked wording — esp. the crisis card should name **988**
  prominently ("Aura shares real resources like **988**…"); port reworded it.
- **[MED]** Crisis card should use the calm crisis-text tokens across head/body (not just the glyph
  chip).

### First chat — `client/app/firstchat.tsx`
- Faithful (tokenizes `{firstName}`, lands in real chat with header + dismissible disclosure banner).

### Auth — `client/app/(auth)/login.tsx`, `register.tsx`, `forgot-password.tsx`
- **[CRITICAL]** **SSO-first ordering reversed** — locked: logo → title → **SSO row → "or" divider →
  fields → footer toggle**. Port puts email/password fields **first**, SSO below.
- **[HIGH]** The **"or" divider** between SSO and the form is missing (login + register).
- **[HIGH]** The **fixed logo slot** above the title (keeps the title from jumping across modes) is
  missing on both.
- **[HIGH]** Signup terms **hard-gate, not soft-gate** — port passes `disabled={!agreed}` to the
  Create-account CTA (greys it out); locked keeps it enabled and **nudges** (checkbox ring) when
  unchecked. Also missing the terms-nudge **ring on the checkbox**.
- **[MED]** Terms label loses the inline **tappable ToS / Privacy links**.
- **[MED]** Forgot-password is missing the **6-digit code-entry step + resend countdown** (jumps
  straight to confirmation); CTA wording "Send reset link" vs locked "Send reset code". `reset` (set
  new password) + `verify` (OTP) modes not implemented.
- BackChevron on all modes **is honored** (good).

---

## One-offs (`oneoff-app.jsx`)

### Account management — `client/app/account.tsx`
- **[CRITICAL]** Locked decision reversed — delete must be **buried a level deeper** in a danger card
  (line + explainer + chevron → confirm), with destructive red **only in the confirm**. Port renders
  Delete as a **top-level resting-red `ListRow`** right beside Request export — the mistap-prone
  pattern the lock rejects.
- **[HIGH]** Title should be **"Manage your data"**, not "Account".
- **[HIGH]** Export group framing missing — locked: `ListGroup "Your data"` + "Data export" title +
  sub-line + footnote ("no limit on how often"). Port shows one bare line + a row.
- **[HIGH]** Resting delete line should keep the **30-day grace** reassurance ("You'll have 30 days to
  change your mind."); port shortened it.
- **[MED]** Missing the inline **export-sent** + **deactivated** states (port uses a transient toast,
  then immediately logs out).

### Sign-in & security — `client/app/sign-in-security.tsx`
- **[CRITICAL]** The entire **SSO dimension is missing** — locked: a "How you sign in" method group;
  Google/Apple shown **read-only "Managed by {provider}"**; **Apple Hide-My-Email** relay address +
  forwarding note. Port hard-codes the email/password path only.
- **[HIGH]** Email group loses its **footnote** and the "Email address" labeled row (port shows a bare
  email label row).

### Notifications — `client/app/notifications.tsx`
- **[HIGH]** Missing the **"Push" group label + footnote** ("The only notification Aura sends. No
  promos, no nudges.") — this is what conveys the transactional-only promise.
- **[HIGH]** Toggle row loses its on-row **sub-line**; label uses "{Companion} replied 💬" (emoji) vs
  locked plain "Aurora replied".

### Safety center — `client/app/safety.tsx`
- **[HIGH]** Missing the display **headline "How Aura keeps conversations safe"** and the two titled
  explainer sections (**Gentle moderation** / **Honest about being AI**) with the fuller locked copy.
- Crisis support block reuse is **faithful** (shared component, calm green never red). 

### Privacy / legal — `client/app/privacy.tsx`
- **[HIGH]** Formal policy collapsed from the locked **4 sections** (What we collect / Why we keep it /
  Who can see it / Your controls) to **2** rewritten ones — "Who can see it" + "Your controls" (and
  the Safety-center / 30-day cross-refs) are gone.
- **[MED]** "Last updated …" line missing; **Full Terms** should be a neutral chevron **row**, not an
  accent-colored "Full Terms →" link (lock: ink-on-paper, no accent); title "Privacy policy" vs
  "Privacy".
- Plain-language summary card is **faithful**.

### Help — `client/app/help.tsx`
- **[CRITICAL]** **FAQ answers missing** — locked: expand-in-place rows revealing an answer paragraph
  per question. Port maps them to no-op `ListRow`s with **no answer text** (content only stores the
  question). The FAQ does nothing.
- **[HIGH]** Missing the **"Frequently asked"** group label; contact footer drops the "Still need a
  hand?" lead-in.

### Rate Aura — `client/app/rate-app.tsx`
- **[INFO]** No locked prototype section exists (`rate` isn't in the prototype registry — Rate is only
  a You-tab row). The port's rate screen is port-authored; copy is invented (not from content
  constants). Confirm it's intended.

### Chat (hero) — `client/app/chat/[id].tsx`
- **[CRITICAL]** **Crisis state missing.** The locked design renders the crisis support block inline in
  the thread on a crisis turn (988/741741, Call/Text). `CrisisSupport` exists and is wired into Safety
  center, but the **chat screen never renders it** — the product's signature care moment is absent
  from the hero.
- **[CRITICAL]** **Report flow is a dead stub.** Locked: a ReportSheet (reason chips + note + submit +
  "Thanks, we'll review this." toast) from the overflow **and** bubble long-press. Port: overflow
  "Report" is `() => {}`, no sheet, no long-press. Copy exists in `content/chat.ts`, nothing renders it.
- **[HIGH]** Break reminder is the wrong control — locked: a small dismissible **accent-tint pill**
  inline; port: a full-width **crisisBg banner** above the composer, no dismiss (10s auto only), which
  also muddies the crisis-green token.
- **[HIGH]** Limit card downgraded — drops the locked title "That's 30 for today" (body + button only).
- **[MED]** Disclosure banner on `accentTint` (no info icon) vs locked neutral `raised` card; **char
  counter** (appears ~80%, accent near 2000) missing; "Today" date separator missing.

### Create / customize — `client/app/companion/create.tsx`
- **[CRITICAL]** Free gating only half-honored — the locked **"Unlock with Premium" footer + explainer
  line** ("Tuning & looks are a Premium feature.") is gone; port flips the bare Save button label only.
- **[HIGH]** **Avatar + "Change look" gallery missing** (LookSheet: Default/Cozy/Evening/Bright/Quiet) —
  no top avatar, no look affordance, though `CREATE.changeLook` copy exists.
- **[HIGH]** Base-persona selection uses an **accent border** — breaks the one-accent rule (locked:
  neutral `sheet` fill + textSecondary border + check).
- **[HIGH]** Persona cards **stripped to name-only** — locked: avatar + name + voice line + check, in a
  vertical stack under a "Start from" label; port is a 3-across row, name only.
- **[MED]** Missing **section labels** ("Start from"/"Personality"/"Name"); name **auto-numbering** +
  hint missing; voice-preview tail is the base line, not derived from the selected trait chips.

### Memory — `client/app/long-term-memory.tsx`
- **[HIGH]** **Swipe-to-edit/delete + inline edit missing** — port has only ••• → sheet, and the
  "Edit" row is a **no-op** (edit is non-functional).
- **[HIGH]** Subline drops the locked swipe-hint ("Swipe or tap ••• on any memory to edit or remove
  it.").
- **[MED]** Delete confirm loses the grace copy ("Aurora will forget this…" / "Keep it"); empty-state
  copy/mark differ; loading + error states not implemented.

### Paywall — `client/app/(tabs)/premium.tsx`
- **[HIGH]** **Honest free-baseline line missing** ("Free always includes 3 base companions… 30
  messages a day.") — `PAYWALL.features.free` never rendered.
- **[MED]** De-jargon **reversed** — port shows "Personality tuning (3×3×3 traits)" vs locked
  "Personality tuning: warmth, energy, and style."; price-resolution affordance weakened.

### Subscription manager — `client/app/subscription.tsx`
- **[CRITICAL]** Locked "both-tier manager **with a free state**, NOT a forced paywall" reversed — port
  `useEffect` **bounces free users straight to `/premium`**. No free branch (plan=Free, footnote,
  gentle Upgrade) at all.

### Edit profile — `client/app/edit-profile.tsx`
- **[HIGH]** **"Change color" tone palette missing** — locked: monogram + "Change color" → 6-swatch
  palette (dirties the form); port's "Change" link is a **no-op**.
- **[MED]** Error copy lost its actionable phrasing (locked "Enter a first name. It's what your
  companion calls you." → port "First name can't be empty."); toast/focus-ring states simplified.

---

## Scope summary

~**14 CRITICAL** (whole feature missing or locked decision reversed) + ~**24 HIGH** + many MED across
every screen group. The port captured the skeleton and tokens but dropped locked features, content,
and decisions — and reintroduced several explicitly-rejected patterns (accent-tinted icon tiles,
per-model lock, inline create CTA, hard-disabled terms gate, forced paywall, resting destructive red).

## Prioritized remediation (CRITICAL-first, batched)

**Batch 1 — Safety / compliance (do first):**
1. Chat: render `CrisisSupport` inline on a crisis turn (signature safety moment, currently absent).
2. Chat: build the Report flow (ReportSheet — reason chips + note + submit + toast; overflow + bubble
   long-press). Copy already in `content/chat.ts`.
3. Age gate: restore the month/day/year **DOB scroll-wheel** (year-only text field is weaker for 18+).

**Batch 2 — Reverse the reintroduced rejected patterns:**
4. Companions: header **"+"** create (remove inline bottom row); **all 3 base companions free**; free
   "+" opens the **dimmed creator**, not `/premium`.
5. Subscription: render the **free state** (plan=Free + footnote + gentle Upgrade); remove the
   force-redirect.
6. Account: **buried-delete** danger card (line + explainer + chevron → confirm); red only in confirm;
   title "Manage your data".
7. Auth: **SSO-first** ordering + "or" divider + fixed logo slot; terms **soft-gate** (nudge, not
   `disabled`).
8. Create: neutral base-card selection (drop accent border); restore the **Unlock-with-Premium footer
   + explainer**.
9. Doctrine: remove **accent-tinted icon tiles** (ai-disclosure, create base cards, carousel
   placeholders).

**Batch 3 — Missing features:**
10. Companions: **Home-companion pin** (`users.primaryCompanionId`).
11. Home: **remembers** card + **starter chips** + **usage indicator** + date line.
12. Sign-in & security: SSO method group + "Managed by {provider}" + Apple relay note.
13. Help: **FAQ answers** (add answer strings to `support.ts` + expandable rows).
14. Memory: swipe / working inline edit; restore swipe-hint subline + grace-toned delete confirm.
15. Create: top **avatar + "Change look"** gallery; persona cards (voice line + check) + section labels.
16. Edit profile: **"Change color"** tone palette.
17. Onboarding carousel: the three **bespoke SVG illustrations** (ThreadArt / ChatArt / PresenceArt).

**Batch 4 — Copy + structure fidelity:**
18. You: Notifications → **row** (own screen); single **"Manage your data"** row; group order.
19. Safety: headline + the two titled explainer sections. Privacy: **4-section** policy + neutral
    Terms row (no accent) + Last-updated. Notifications: "Push" group label + footnote.
20. Paywall: free-baseline line + **de-jargon** ("warmth, energy, and style"). Persona: tonal-fill +
    check selection. Chat: break-reminder pill (dismissible) + limit-card title + char counter.
    Numerous copy restorations to locked wording (988 prominence, "Manage your data", etc.).

**Larger rebuilds to confirm scope on:** the DOB wheel (#3), the bespoke carousel SVG art (#17), and
the Change-look gallery (#15) are sizable faithful rebuilds rather than small edits.
