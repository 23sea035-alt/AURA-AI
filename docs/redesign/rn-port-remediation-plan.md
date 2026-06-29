# RN Port → Locked-Design Remediation Plan

**Purpose.** The actionable plan to bring the Expo RN port (`client/app/*`) back to fidelity with the
locked Warm Sanctuary prototypes. This is the **execution doc** — the *what's wrong* detail lives in
[`rn-port-fidelity-audit.md`](rn-port-fidelity-audit.md); the *source of truth* is the locked
prototypes in [`claude-design/`](claude-design/) (serve them with `node docs/redesign/harness/serve.mjs`
→ `http://127.0.0.1:4321/{Onboarding,HomeTabs,OneOff}.html`).

## Workflow (machine split)

- **MacBook → `redesign` branch → this plan.** All frontend remediation happens here (and it's where
  the iOS dev-client build runs: `cd client && pnpm exec expo run:ios`).
- **Windows desktop → `backend`/`main` → backend only.** Backend keeps evolving there. Don't do
  frontend work on backend; periodically `git merge backend` into `redesign` to stay current.
- Per change: edit → `pnpm --filter @aura/client typecheck` → commit. Periodically
  `pnpm exec expo export --platform ios` to confirm bundling. The real visual pass + the native bits
  (voice modules, DOB wheel feel, haptics) only come alive on the dev-client build.

## Approach — not a blind revert

For each deviation decide **Restore / Keep / Discuss**:
- **Restore** — clear regression or a reversed locked decision → make it match the prototype.
- **Keep** — the port's version is genuinely better, or an intentional addition → leave it.
- **Discuss** — a real judgment call (copy rewrite, layout) → flag with a recommendation before changing.

**Pre-tagged KEEP (do not revert):**
- `firstchat.tsx` tokenizes `{firstName}` instead of the prototype's hardcoded "Maya" — more correct.
- The **voice/dictation stack** (mic + live level meter + slide-to-cancel + voice-note bubble) — an
  intentional additive feature, not in the prototype.
- The **theme toggle** (System/Light/Dark in You) — additive.

**Discuss (confirm before acting):**
- `rate-app.tsx` has **no locked prototype** (Rate is only a You-tab row in the prototype). Its copy is
  port-authored. Keep as-is, or cut to just the You row?
- Several copy rewrites may read better than the lock (e.g. welcome support line) — restore vs keep.

---

## Batch 1 — Safety / compliance (do first)

- [ ] **Chat: crisis state** — render the shared `CrisisSupport` block inline in the thread on a crisis
  turn (988/741741). It exists and is wired into Safety center but **never appears in chat**. — `client/app/chat/[id].tsx` · **Restore (CRITICAL)**
- [ ] **Chat: report flow** — build the ReportSheet (reason chips + optional note + submit + "Thanks,
  we'll review this." toast), opened from the overflow **and** bubble long-press. Overflow "Report" is
  a no-op today; copy already in `content/chat.ts`. — `client/app/chat/[id].tsx`, `MessageBubble.tsx` · **Restore (CRITICAL)**
- [ ] **Age gate: DOB scroll-wheel** — replace the single birth-year text field with the locked
  month/day/year wheel (center selection band). *(big rebuild — see below)* — `client/app/age-verification.tsx` · **Restore (CRITICAL)**

## Batch 2 — Reverse the reintroduced rejected patterns

- [ ] **Companions: create entry** — make it the always-accessible **header "+"** (top-right; lock
  badge on free); **remove the inline bottom create row**. — `client/app/(tabs)/companions.tsx` · **Restore (CRITICAL)**
- [ ] **Companions: gating** — all **3 base companions free-accessible** (30/day is shared, not
  per-model); drop the `i > 0` dim+lock on Orion/Lyra. — `client/app/(tabs)/companions.tsx` · **Restore (CRITICAL)**
- [ ] **Companions: free create** opens the **dimmed, scrollable creator**, not `/premium`. — `companions.tsx` · **Restore (HIGH)**
- [ ] **Subscription: free state** — render plan=Free + footnote + gentle "Upgrade to Premium"; remove
  the `useEffect` that bounces free users to `/premium`. — `client/app/subscription.tsx` · **Restore (CRITICAL)**
- [ ] **Account: buried delete** — delete inside a danger card (line + explainer + chevron → confirm),
  destructive red **only in the confirm**; title "Manage your data". — `client/app/account.tsx` · **Restore (CRITICAL)**
- [ ] **Auth: SSO-first** — order = logo slot → title → **SSO row → "or" divider → fields** → footer
  toggle (login + register). — `client/app/(auth)/login.tsx`, `register.tsx` · **Restore (CRITICAL)**
- [ ] **Auth: soft-gate terms** — stop passing `disabled={!agreed}` to the Create-account CTA; keep it
  enabled and **nudge** (checkbox ring) when unchecked. — `client/app/(auth)/register.tsx` · **Restore (HIGH)**
- [ ] **Create: neutral selection** — base-persona selected card uses neutral `sheet` fill + check, not
  an **accent border** (one-accent rule); restore the **Unlock-with-Premium footer + explainer line**. — `client/app/companion/create.tsx` · **Restore (CRITICAL/HIGH)**
- [ ] **Doctrine: no accent-tinted icon tiles** — remove them from ai-disclosure cards, create base
  cards, and the carousel placeholders (only the crisis card keeps a tile). — multiple · **Restore (HIGH)**

## Batch 3 — Missing features

- [ ] **Companions: Home-companion pin** — `HOME` chip (pinned) / "Make {name} your Home companion"
  pin button. Needs `users.primaryCompanionId` (see Backend deps). — `companions.tsx` · **Restore (CRITICAL)**
- [ ] **Home: content** — resurfaced "Aurora remembers" card + starter chips + free "18/30 messages"
  indicator + date line under the greeting. — `client/app/(tabs)/index.tsx` · **Restore (CRITICAL/HIGH)**
- [ ] **Sign-in & security: SSO dimension** — "How you sign in" method group; Google/Apple read-only
  "Managed by {provider}"; Apple Hide-My-Email relay address + note. — `client/app/sign-in-security.tsx` · **Restore (CRITICAL)**
- [ ] **Help: FAQ answers** — add answer strings to `content/support.ts` and make rows **expand-in-place**
  (today they're no-op rows with no answers). — `client/app/help.tsx`, `content/support.ts` · **Restore (CRITICAL)**
- [ ] **Memory: edit** — swipe (or working inline) edit + delete; the ••• "Edit" is a no-op today. — `client/app/long-term-memory.tsx` · **Restore (HIGH)**
- [ ] **Create: avatar + "Change look" gallery** + persona cards (avatar + name + **voice line** + check)
  + section labels ("Start from"/"Personality"/"Name"). *(look gallery = big rebuild)* — `create.tsx` · **Restore (HIGH)**
- [ ] **Edit profile: "Change color" tone palette** — 6-swatch monogram color picker (dirties the
  form); the "Change" link is a no-op today. — `client/app/edit-profile.tsx` · **Restore (HIGH)**
- [ ] **Onboarding carousel: bespoke SVG art** — ThreadArt / ChatArt / PresenceArt instead of generic
  Ionicons. *(big rebuild)* — `client/app/onboarding.tsx` · **Restore (CRITICAL)**

## Batch 4 — Copy + structure fidelity

- [ ] **You** — Notifications becomes a **row → its own screen** (not the inline toggle group); single
  **"Manage your data"** row (not Data export + Delete account); account-group order = Edit profile ·
  Sign-in & security · Subscription · Notifications. — `client/app/(tabs)/you.tsx` · **Restore (HIGH)**
- [ ] **Safety** — add the "How Aura keeps conversations safe" headline + the two titled sections
  (Gentle moderation / Honest about being AI) with the fuller locked copy. — `safety.tsx` · **Restore (HIGH)**
- [ ] **Privacy** — restore the **4-section** policy (What we collect / Why we keep it / Who can see it /
  Your controls) + "Last updated" + **neutral** "Read the full Terms of Service" row (no accent). — `privacy.tsx` · **Restore (HIGH)**
- [ ] **Notifications** — "Push" group label + footnote ("No promos, no nudges"); on-row sub-line; drop
  the 💬 emoji from the label. — `notifications.tsx` · **Restore (HIGH)**
- [ ] **Paywall** — add the honest free-baseline line; **de-jargon** ("Personality tuning: warmth,
  energy, and style", not "3×3×3 traits"). — `premium.tsx`, `content/paywall.ts` · **Restore (MED)**
- [ ] **Persona** — selected card uses **tonal fill + wine check** (not just border/opacity). — `persona.tsx` · **Restore (HIGH)**
- [ ] **Chat polish** — break-reminder = dismissible accent pill (not a crisis-green banner); limit-card
  title "That's 30 for today"; live character counter (~80%→2000). — `chat/[id].tsx` · **Restore (HIGH/MED)**
- [ ] **Copy restorations** — 988 prominence in disclosure; welcome/onboarding/profile/memory/edit-profile
  wording back to the locked strings where they carry intent. — `content/*` · **Restore/Discuss (MED)**

---

## Big rebuilds (faithful — confirmed scope)

1. **DOB scroll-wheel** (`age-verification.tsx`) — port the month/day/year wheel with a center selection
   band. Either a maintained wheel-picker lib or a custom `ScrollView`-snap implementation; keep the
   fail-closed under-18 dead-end (with the resting dot mark + two-tier copy).
2. **Carousel SVG art** (`onboarding.tsx`) — rebuild ThreadArt / ChatArt / PresenceArt with
   `react-native-svg` (already a dep), porting the prototype's paths/gradients; entrance draw-on can be
   reanimated. Float them in open warm space — **no accent-tinted tile**.
3. **Change-look gallery** (`create.tsx`) — the avatar + "Change look" sheet (Default/Cozy/Evening/
   Bright/Quiet). Curated-only (no upload), per the no-UGC stance.

## Backend dependencies (coordinate — backend evolves on Windows)

Some frontend changes need backend support; the MacBook can build the UI against mock/local state first
and wire the real data when the backend lands (see [`redesign-backend-work`] notes / `rn-port-status.md`):
- **Home pin** → `users.primaryCompanionId`.
- **Home "remembers" card** → the consolidation "remembers" cache (Groq question-gen).
- **Free usage indicator (18/30)** → message-count/limit from the chat API.
- **Edit-profile color** → `users.avatarColor`.
- **Sign-in & security SSO state** → Clerk method info (currently UI-shell; Clerk deferred).
- **Chat report** → already supported server-side (`POST /messages/:id/report` → `safety_events`).
- **Help FAQ answers** → content-only (no backend).

## Done = 

Every Restore item matches the prototype on both themes; typecheck green; iOS dev-client build renders
the screens faithfully; Keeps preserved; Discuss items resolved with you.
