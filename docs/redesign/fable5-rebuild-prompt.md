# Fable 5 — frontend rebuild brief

> Paste the block below as the opening prompt to a **Claude Fable 5** coding-agent session running
> inside this repo (`Aura/`, the Expo RN client under `client/`). It is intentionally loose on
> polish: the goal is to see Fable 5's *own* best take on the whole frontend, not a pixel-port of the
> current one. Everything runs on **mock data** (no live backend), but structured **wire-ready**.

---

## THE PROMPT

You are rebuilding the entire frontend of **Aura**, an iOS app of warm AI companions — people talk to
a companion (Aurora, Orion, or Lyra) for emotional support and to be *heard*. The app already exists
and is visually complete, but I want to see your **independent, from-scratch reinterpretation** of
every screen: refine, re-choreograph, and elevate the whole thing, and build the new screens the
backend now requires. Treat this as a creative rebuild, not a port — I want to see your ceiling.

### 0. Working method (read this first)

- **Work on a brand-new branch off `redesign`** — e.g. `git switch -c fable5-rebuild`. Do **not** commit
  to `redesign` or `main`. Everything you do lives on your branch so I can diff it later.
- **Stack is fixed:** Expo React Native + `expo-router` (file-based routes under `client/app/`),
  TypeScript. Keep the router structure and every route reachable — I need the app to still run.
- **This is a UI/UX rebuild on mock data.** Do **not** wire Clerk, RevenueCat, APNs, or the live REST/WS
  API. Read demo state from the existing `client/context/AppContext.tsx` + `client/constants/demo.ts`
  mocks. Where a screen *would* call the backend, build it against the mock but leave a **clean,
  obvious seam** (a typed function / context method) so real wiring is a drop-in later. Comment the seam.
- **Verify as you go.** After each screen: `pnpm typecheck` stays green, and it renders in **both**
  warm-light and warm-dark (the app has a `useTheme()` dual-theme hook — every color must come from it).
  If you have the iOS simulator, drive the flow and eyeball it; never trust fast-refresh — relaunch.
- When done, write `docs/redesign/fable5-rebuild-notes.md`: what you changed per screen, the design
  decisions you made, where you diverged from the old design and why, and any seams left for wiring.

### 1. What Aura is (so the design carries the product)

- **North star:** *alive but calm* — warm, human, trustworthy, premium through restraint. Never
  "vibe-coded" AI-slop (no glassmorphism, no glowing orbs, no cosmic purple gradient, no emoji-as-UI,
  no three-accents-no-conviction). The companion is a **soft place to land**, not a magazine spread.
- **The one user (keep one coherent story across every screen):** **Maya Chen**, 28, UX designer in
  Austin, dog named Pixel, close with her brother Theo, new job she's nervous about. Free tier,
  **18/30** messages used today. Her primary companion is **Aurora**. All demo fixtures (the
  conversation, her six memories, dates, numbers) are canonical in `client/constants/demo.ts` — use
  those exact values, don't invent new ones.
- **The three companions** are differentiated by relational *stance*, not function: **Aurora** sits
  with you (warm, gentle), **Orion** steadies you (grounded anchor), **Lyra** lifts you (bright,
  playful). Their avatars are **warm, hand-crafted marks** — never glowing orbs or stock circles.
- **Signature care moment:** the crisis / self-harm response is **grounding and supportive** (a hand on
  the shoulder, 988 + 741741, the companion still there) — **never** an alarm-red emergency screen.

### 2. Design direction — reinterpret freely, keep the soul

I am giving you **creative latitude**. The existing design system is called **"Warm Sanctuary"** and its
doctrine lives at `docs/redesign/01-doctrine.md` with tokens at `docs/redesign/approved-tokens.md` and
`client/constants/design.ts`. **Read the doctrine as inspiration and a mood, not as law** — you may
rethink layout, hierarchy, motion, and composition from scratch. But keep the *soul* intact:

- **Warm, opaque surfaces; depth from tone + soft warm shadow.** Warm dark (charcoal/brown-black, never
  pure `#000`); warm light (cream/sand, never clinical white).
- **One committed warm accent**, used for genuine emphasis only — never decoration, never three at once.
  Semantics (success/warning/error) stay semantic. Crisis = supportive, not red.
- **A warm characterful display type + a legible reading body** (chat readability is the whole game).
- **Flair is earned:** hero moments (meeting a companion, a reply arriving, the typing reveal) get
  gentle choreographed motion; utility screens (settings, legal, account) stay still. Reduce-motion is
  a hard requirement — every animation has a snap-to-final fallback.
- **One of each primitive, reused** (companion avatar, chat bubble, input dock, warm card, buttons,
  list-group, segmented, chip, toggle, empty/loading/error states) — not eight look-alikes.
- **Microcopy is warm and sentence-case throughout, including buttons** ("Say hello", not "Say Hello").
- **Design the degenerate states** (zero / single / very-long / loading-skeleton / error), not just the
  happy path. Accessibility: ≥44pt targets, VoiceOver labels on icon-only controls, Dynamic Type sane,
  safe-area + tab-bar clearance, contrast ≥4.5:1.

You are free to reinvent within that — surprise me. If you make a bold call, note it in the writeup.

**Tokens:** everything (color/space/radius/type/motion) reads from `client/constants/design.ts` +
`client/constants/motion.ts`. You may **add or revise tokens** if your redesign needs them (both themes
must stay in sync), but no hardcoded hex/px/ms/bezier in screens.

### 3. Files to read before you start

- `docs/redesign/01-doctrine.md` — the design doctrine (the §13 gate is a good self-check, loosened).
- `docs/redesign/02-demo-persona.md` — Maya, the companions, the canonical conversation & copy.
- `docs/redesign/approved-tokens.md` + `client/constants/design.ts` + `client/constants/motion.ts` — tokens.
- `client/constants/content/*` and `client/constants/demo.ts` — all UI copy + mock fixtures.
- `client/context/AppContext.tsx` — the mock app state you build against.
- `client/app/**` (existing routes) and `client/components/**` (existing kit) — what exists today.
- `docs/planning/frontend-todo.md` — the **backend-driven items** that define the new screens (§4 below).
- `docs/compliance/apple-third-party-ai-consent.md` — spec for the Apple AI-consent screen.
- `docs/specs/companion-customization.md`, `docs/specs/personas.md`, `docs/specs/chat-system-design.md` —
  behavior specs for companions, personas, and chat.

### 4. Scope — rebuild every screen, then add the new ones

**A. Rebuild these existing screens** (reinterpret each; keep the route + mock behavior working):

- **Onboarding flow:** `welcome` → `(auth)/login` · `register` → `onboarding` (intro carousel) →
  `age-verification` (18+ gate, fail-closed) → `ai-disclosure` → `profile` → `persona` (choose
  companion) → `firstchat` (first conversation — the onboarding payoff; let the first reply land).
- **Home tabs:** `(tabs)/index` (Home — the companion's room: presence + greeting + AI marker + CTA),
  `(tabs)/companions` (roster w/ Active/Archived + search), `(tabs)/you` (account hub).
- **Chat:** `chat/[id]` — the focal screen. Calm **typing reveal**, message bubbles, input dock with a
  live character counter approaching the 2,000 cap, the AI-disclosure banner, break-reminder, and the
  **crisis state** (grounding support card — see §1).
- **Companion create/customize:** `companion/create` — trait selectors (warmth / energy / verbosity,
  3×3×3), avatar/look picker, premium-gated tuning + creation, persona-name auto-numbering ("Aurora 2").
- **One-offs & settings:** `account`, `edit-profile`, `sign-in-security`, `subscription`, `premium`
  (paywall modal), `notifications`, `long-term-memory`, `safety`, `help`, `privacy`,
  `terms-of-service`, `rate-app`.

**B. Build/finish these new backend-driven screens** (they exist as stubs or not at all; the backend
now requires them — build the UI on mock data with wire-ready seams):

1. **Apple third-party-AI consent screen** — Apple 5.1.2(i). New screen in the onboarding flow; explicit
   consent that messages are processed by a third-party AI. Follow `apple-third-party-ai-consent.md`.
2. **Voice call** — `voice-call` + `voice-preferences`. A calm real-time voice-call UI with the
   companion (listening / speaking / thinking states, mute, end-call), plus voice preference settings.
   This is a hero moment — make the presence feel alive but gentle. (No real audio wiring; mock the loop.)
3. **Memory management** — turn `long-term-memory` into a real list of Aurora's six memories about Maya,
   grouped by category, each row **editable and deletable** (seams for `GET/PATCH/DELETE` memory API).
4. **Account soft-delete + Reactivate** — deleting the account confirms with "deactivated for 30 days
   before permanent deletion; reactivate by signing in," and a **Reactivate Account** path for a
   soft-deleted account. Data export stays present (Apple-required).
5. **Home "remembers" resurface card** — a read-only Home card that surfaces a memory as a gentle
   re-engagement ("Aurora remembers you started a new job — how's it going?").
6. **Avatar color + pin-to-Home** — an avatar-color picker and a "pin this companion to Home"
   affordance (which companion greets you on Home).
7. **Paywall / subscription store fields** — render the price as a **store-price placeholder** (not a
   hardcoded "$9.99"), add a **Restore Purchases** action and the auto-renew legal line. Subscription
   screen shows plan, renewal date, Manage in App Store, Restore Purchases.
8. **Report / flag a message** — low-friction, non-punitive report sheet from a chat message
   (Apple 1.2 UGC). Make it a working UI (currently inert).
9. **Recurring AI-disclosure notice** — in chat, when the (mocked) turn carries an `aiDisclosure` flag,
   surface the quiet "you're talking to an AI" line (distinct from the first-session banner).

**Auth note:** the real app is moving to **Clerk** (in-house auth is gone, IDs are UUIDs, password reset
is Clerk-hosted so `forgot-password` will be removed). For this rebuild, build the auth screens as a
**UI shell matching a Clerk flow** — sign-in / sign-up, **Sign in with Apple + Google** buttons, an
email-verification step — but do **not** integrate the Clerk SDK. Leave the session/auth seam clean.

### 5. How I'll judge it

A really solid frontend: every screen carries the brand and *feels* like Aura; the chat and first-reply
moments are emotionally landed; motion is gentle and reduce-motion-safe; both themes are beautiful; the
degenerate states are designed; nothing is vibe-coded; and the new backend screens exist and make sense.
Show me your best independent take — I'd rather see something opinionated and cohesive than a timid port.

Start by reading the files in §3, then propose your rebuild approach and the order you'll work in before
you write code.
