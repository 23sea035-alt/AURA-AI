# 06 — Layout & motion research (reference log)

> **Purpose:** preserve the *why* behind the per-screen design prompts. The actionable conclusions are
> already baked into the `▸ Recommended layout + motion` blocks in [`screens/*.md`](screens/); **this doc
> is the rationale layer** — the archetypes considered, the alternatives we *didn't* pick, the reference
> apps, and the sources — so a later session can revisit or justify a decision without re-running research.
>
> **Status (2026-06-23):** research complete; conclusions folded into all 23 screen prompts + the tokens
> ([`approved-tokens.md`](approved-tokens.md)) + the doctrine ([`01-doctrine.md`](01-doctrine.md)).
> **Method:** hero-weighted; 5 parallel research streams (Chat · Home+onboarding payoff · Companions+
> Paywall+Create · shared primitives+utility · motion system). **Reference families (user-approved):**
> (1) warm/editorial & wellness — Day One, Stoic, Finch, Headspace, Calm, How We Feel, Apple Journal;
> (2) AI-companion competitors — Pi, Replika, Character.ai, Nomi (table-stakes only; *reject* their
> aesthetic); (3) iOS-native craft — Apple HIG/Messages/Settings, Things 3, Bear, Overcast, Cash App.

---

## Cross-cutting decisions (apply to every screen)

1. **Presence, not an orb.** The companion avatar is a *portrait lit by the room* (flat-warm mark, soft warm shadow), **never** a glowing/gradient orb (the #1 "AI chatbot" cliché). Must survive both crops: ~28pt header / ~120–160pt Home focal.
2. **"A person texted me," not "a terminal answered."** Two-sided bubbles, **softened asymmetric radius** (not literal iMessage tails), avatar **header-only**, sans (Hanken) in bubbles, Newsreader serif reserved for "moments" (greetings, date/session dividers).
3. **A room, not a dashboard.** Lead with relationship — greeting + companion + one remembered thing + one action. No stat grids/charts/streaks.
4. **Calm, not fireworks.** Money/limit/safety moments earn trust through restraint: paywall = warm list not cold matrix; limit = *care* not scarcity; crisis = calm green "hand on the shoulder," never alarm-red.
5. **Locked = value, not punishment.** Gated companions/controls stay fully legible, just dimmed + lock chip + one upgrade line. Never hidden/deleted, never so faint it reads broken.
6. **iOS-native grammar, warmed.** Utility screens borrow Apple Settings/Things/Overcast structure (inset-grouped list-cards, hairlines, 44pt+ rows) but warm: cream surface (never `#FFF`), warm ink (never `#000`), sentence-case headers, serif on the header-card name.
7. **Alive but gentle; flair is earned.** Hero/emotional surfaces get gentle motion; every utility screen stays still. Reduce-motion keeps the haptic, drops the travel, and replaces meaningful motion with a dissolve — never the only channel.

---

## Per-screen findings (chosen · alternatives · why · borrow · avoid)

### Chat — `chat` (HERO)
- **Chosen:** two-sided thread (companion-left paper `sheet` + soft shadow, user-right muted wine tint), softened asymmetric radius, serif "Today"/session dividers, long-press message actions, header-only avatar with persistent "AI companion" caption.
- **Alternatives considered:** (B) asymmetric-weight bubbles (companion wider); (C) journal-thread hybrid (whitespace-separated, serif dividers, lightest bubbles). Chose two-sided skeleton *dressed* with C's serif moments.
- **Why:** keeps the familiar "a person texted me" read while the editorial serif + warmth dodge the ChatGPT/Character.ai clone look.
- **States:** typing = three-dot "thinking" → calm word/clause reveal (no cursor); crisis = in-thread calm-green grounding card w/ real `tel:988`/`sms:741741`, input stays available; limit = inline *care* card; report = native action sheet → quiet toast; counter invisible until ~80% of 2,000 then wine (not red).
- **Borrow:** Pi (clean avatar-free column, restraint), Apple Messages (send/typing feel), Day One/Stoic (serif dividers). **Avoid:** blinking token cursor, per-bubble avatar, ✨/🤖, full-width ChatGPT prose, glass dock, neon send, red crisis alarm, persistent "0/2000", fake "online" dot.

### Home — `home`
- **Chosen (LOCKED):** presence-led, **chip-under-avatar** — greeting + date → Aurora large & centered (focal) → resurfaced-memory chip *under her name* → one loud CTA → optional ≤2 starter chips → quiet 18/30 (hidden premium).
- **Alternatives considered:** "letter from Aurora" memory-as-hero card; "adaptive" (presence for new, letter for returning). Rejected — the presence metaphor must hold across all four states.
- **Why:** Aurora as the constant focal element = "companion's room," not a dashboard; the memory under her name is the first proof of being remembered.
- **Borrow:** Headspace "Today" (greeting + one action), Stoic (relationship-led, no stats), Day One "On This Day" (resurfaced moment), Finch (attachment, *not* its clutter). **Avoid:** stat grids/charts/streaks, glowing-orb/stock-circle avatar, idle breathing/floating loop (anti-Replika), depleting progress bar, "letter" hero card.

### Onboarding payoff — `welcome` · `carousel` · `persona` · `firstchat`
- **welcome:** word-led — one serif promise + one warm anchor + two buttons + quiet 18+. *Alt:* portrait-led / ambient-room. Borrow: Pi welcome (invitation not instruction). Avoid: hero gradient, feature list.
- **carousel:** 3 stories-style slides + slim segment bar; benefits/feelings not features; ≤3; Skip always; never auto-advance. Borrow: stories idiom, ≤3-benefit carousel best practice.
- **persona:** **stacked** horizontal cards (clarity beats a grid); personality carried by **voice line + illustration register, NOT per-persona color**; Aurora soft-pre-highlighted; *choose, not build*. Reject Replika avatar customization.
- **firstchat:** land in *real* chat; builds the reusable chat components; Aurora's warm named opener + first-session disclosure banner; the typing-reveal payoff gets extra room + completion haptic.
- **(auth/agegate/disclosure/profile** — lighter, doctrine-driven: one-surface mode-switch auth (crisp form), single-question warm age gate w/ non-shaming under-18 dead-end, plain-language disclosure cards + honest checkbox, minimal first/last-name profile.)

### Companions — `companions`
- **Chosen:** soft-shadow **warm cards** (not dense inbox rows) — avatar + serif name + one-line voice + muted preview + time-ago → Chat; gated "New companion" row (free → locked upsell → Paywall).
- **Alternatives considered:** (A1) editorial inbox rows (Mail/Messages); (A3) featured-Aurora + compact rows. Chose cards — with only 3–4 companions a dense list looks anemic, and cards carry the companion-as-person register.
- **Why + locked-not-deleted:** non-default companions on free = dimmed + neutral lock chip + "Included with Premium," legible, never removed.
- **Borrow:** Apple Messages/Mail row anatomy (as cards), Things 3 restraint, Day One voice tone. **Avoid:** dense badge/neon grids, broken-looking faint locked card, a second accent on lock chips, fake "online" dots.

### Paywall — `paywall` (+ Create — `create`)
- **Paywall chosen:** warm serif headline + supportive subline → compact **"what changes with Premium" list of 4** (not a cold checkmark matrix) → store-price slot + skeleton → single-accent Subscribe → quiet Restore → auto-renew legal. Owned → "Current plan" disabled + Manage + renewal date.
- **Alternatives considered:** (B1) feature list; (B2) Free-vs-Premium comparison table; (B3) hybrid. Chose the list (B1/B3) — a matrix reads cold/salesy.
- **Why:** respectful > aggressive for an emotionally-toned app (Rootd's dismissible paywall out-converted aggression).
- **Create:** single grouped form, **three left-labeled 3-segment controls** (Apple HIG sweet spot), prose voice-preview, auto-numbered name; free = whole creator dimmed behind one Unlock CTA; **selected chips neutral, not accent** (else accent count > 1).
- **Borrow:** Calm/Headspace (paywall as continuation of calm), Rootd, RevenueCat plan discipline; Apple HIG segmented controls. **Avoid:** confetti/countdown/"BEST VALUE"/pulsing CTA/cold matrix/hardcoded $9.99; per-chip locks, dense Character.ai creator.

### Memory + utility + system-states
- **Memory:** grouped-by-category list-groups, swipe Edit/Delete, **delete confirms first**; states from the kit. Borrow: Apple `swipeActions`, Things/Reminders. Avoid: full-swipe instant delete, "memory graph" viz.
- **You:** header-card + grouped list-cards (Apple Settings warmed — Overcast/Headspace recipe); tier pill = accent fill (Premium) / neutral outline (Free); destructive isolated, red only in the confirm dialog. STILL.
- **Account:** export → emailed-link confirmation; delete → soft-delete 30-day grace explainer + destructive confirm dialog (the one place loud red is correct). Borrow: Apple in-app deletion mandate, Facebook 30-day grace.
- **editprofile/submgmt/notifs/legal/help:** utility, STILL. Save disabled-until-dirty + inline-on-blur validation (Save spinner is a legit blocking action, ≠ the "skeleton not spinner" content rule); layered privacy notice (plain-language summary above formal text); single transactional toggle; short FAQ list-group.
- **safety:** calm explainer + crisis card **reusing Chat's 988/741741 block** in calm green, never red.
- **states (the kit):** EmptyState (warm mark + line + optional CTA), **LoadingState = skeleton matching final layout, slow breathing not shimmer-sweep, never a spinner**, ErrorState (calm + single Retry), Offline (non-blocking), Blocked-message (softly held, calm-neutral/green, never red). Borrow: Headspace empty states, NN/g skeleton-over-spinner, Spotify offline.

---

## The motion system (design intent — library-agnostic)

**Principles:** ease-*out* settle (never ease-in lurch); honor the origin (things appear *from where they came*); high-frequency actions (send, keyboard) = instant; always interruptible; reduce-motion *replaces* meaningful motion with a dissolve, never leaves it as the only signal (Kowalski; Freiberg; Apple HIG).

- **Vocabulary:** soft press + haptic · gentle entrance (settle, **no bounce**) · staggered reveal (reading order, capped) · native sheet/push (origin-honoring) · skeleton **breathing** (not shimmer-sweep) · navpill indicator **slides** between tabs · toast fade · layout settle (neighbors ease, don't jump).
- **Signature — the typing reveal:** two beats — (1) soft slow three-dot "thinking" bubble anchored where the reply lands → (2) bubble lands, text fades in **word/clause-grouped at reading cadence, decelerating so it *lands***. No cursor, no per-char typewriter, no fake stream. First-message-from-a-new-companion gets extra room + a soft completion haptic. Reduce-motion: bubble appears whole via a single dissolve + the same haptic.
- **Per-moment (hero):** Chat send = instant from the field; receive = the reveal; history = gentle group/stagger from the bottom. Home = presence *placed once*, **no idle loop** (anti-Replika); memory chip enters a beat later. Onboarding = carousel tracks the swipe (no auto-advance), **persona selection = weighted confirmation haptic + chosen card rises / others recede**, first-message payoff breathes. Companions = short stagger; card → Chat honors origin. Paywall = sheet rises, options fade.
- **Stays STILL (motion budget ≈ 0):** You/settings, legal, help, submgmt, edit profile — stillness here makes the hero moments feel earned.
- **Crisis = the calmest motion in the app:** static or a single very-soft slow fade; never slide-fast/bounce/flash/pulse; ≤1 soft haptic. Attention-grabbing motion reads as alarm and can escalate distress.

---

## Accent + token-softening decision

- **Accent = Library Wine** (`#8F4150` light / `#CC7A84` dark), a dusky mulberry/garnet. **Why:** the warm wheel is mostly spoken for — green = success/crisis, ochre/amber = warning, brick-orange-red = error + the rejected vermilion, clay/terracotta = overused + Claude-coded. The **rose→wine arc is the one warm, premium, unclaimed region**, and reads like a clothbound classic under a Didone serif. It's the only candidate with **no semantic collision** and passes AA both as a fill *and* as text on cream (~5.9:1).
- **Alternatives:** Clay Rose `#A85A5A` (hue-adjacent to terracotta), Sunlit Gold `#C68A2A` (collides with warning-ochre; needs dark text on fill), Copper `#A4673E` (terracotta-adjacent). All rejected for the reasons noted.
- **"A softened" depth model:** Claude Design's first "Reading Nook" pass drifted editorial-hard (hard near-black 1px borders everywhere, sharp 2–6 radius, no shadow, near-black `#0C0907` dark, bright vermilion). Corrected via [`00b-tokens-revision.md`](00b-tokens-revision.md): **soft warm shadow restored** (e1/e2/e3) for lift surfaces; **warm hairline reserved for structural surfaces only**; **dual radius** (structural 4/8, intimate 12/16/20); **warm-charcoal dark** `#1B1712`. Governing principle: **each surface's emotional job decides — structural crisp, intimate soft.**

---

## Key sources (grouped)

**Chat / companion UX:** Lazarev (chatbot UI examples), Sendbird, Medium/Liu (what makes Pi a great companion), screensdesign (Replika), iMessage bubble craft (robkerr · Samuel Kraft), Setproduct (AI-chat + avatar anatomy), Stream/CometChat (iOS chat rows).
**Warm/editorial & wellness:** Headspace (blakecrosley "Designing for Calm" · Raw.Studio), Calm vs Headspace (pzizz · Globaldev), Stoic (home screen), Day One (features · typography), Finch (Pratt critique · Deconstructor of Fun · UX teardown), How We Feel (Behance), Things 3 (Cultured Code · MacStories · TypeUI).
**iOS craft / primitives:** Apple HIG (Motion · Reduced-Motion criteria · Lists & tables · Tab bars · Segmented controls · Action sheets), awesome-ios-design-md (Overcast + Headspace DESIGN.md), react-native-ios-list, Bear typography, iOS 26 tab-bar bottom-accessory.
**Motion craft:** Emil Kowalski (Great animations · Good vs Great), Rauno Freiberg (interaction design), CSS-Tricks (typewriter — what to avoid · staggered animation), Apple Messages typing/bubble behavior.
**Paywall / gating:** RevenueCat (mobile paywalls guide · hard vs soft paywall), Qonversion (paywall examples), Apple (auto-renewable subscriptions · subscription info · EULA placement), ui-patterns (Unlock features), UX Knowledge Base (disabled state).
**Safety / crisis:** 988lifeline.org, SAMHSA 988, FCC 988, Crisis Text Line, PubMed/Psychiatric Services (apps & 988), Gapsy (mental-health UI), Frontiers (crisis-support framework).
**Onboarding / disclosure / privacy / legal:** Pi onboarding (AKQA), Userpilot (mobile carousels), Material onboarding, VWO onboarding, AI-disclosure law (Skadden CA SB 243 · MoFo NY/CA · Baker McKenzie), layered privacy notice (IAPP · Privacy Patterns), Apple in-app account-deletion requirement, SwiftUI confirmation dialogs.
**States / forms:** NN/g (skeleton vs spinner), Onething/LogRocket (skeletons), Mobbin/Eleken/Toptal (empty states), Smashing/Figr (error states), Apple `swipeActions`, Hacking with Swift (forms), UXmatters (inline validation).
**Anti-patterns / what to avoid:** Figma "gradient orb" (the AI-chatbot cliché), Replika review (pippinclub — ~10fps always-on avatar, battery drain, paywall-before-first-message), chatsmith (avatar crop guidance).
