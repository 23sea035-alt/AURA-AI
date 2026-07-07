# RN Port Status — Aura "Warm Sanctuary"

Tracks the Expo React Native port of the web-prototyped Warm Sanctuary redesign. Source of
truth for what's done / pending across sessions. The design **decks are frozen** — this doc
tracks the **code** port, not design decisions.

> **Current reality (2026-07-02, after the `origin/redesign` → `backend` merge).**
> - **All screens are visually done and polished** in both themes — *except voice-call screens, which
>   do not exist yet* (deferred; to be built on the MacBook alongside the wired backend).
> - **None of the UI is wired to the real backend.** The redesign was built against a stale backend, so
>   the client API layer (`client/lib/api*` / `context/AppContext`) was intentionally left on mock/demo
>   data. Screen state (archive/pin/search, roster, chat) currently runs off `AppContext` mocks.
> - **Backend is now ready to wire against:** the merged trunk has the full server, incl. companion
>   pin (`PATCH /me` → `primaryCompanionId`), archive (`POST /companions/:id/archive`|`/restore`), and
>   permanent delete (`DELETE /companions/:id`). Companion search stays **client-side** (small roster).
> - **Outstanding (MacBook):** (1) voice-call screens; (2) wire `AppContext`/API to the live server;
>   (3) the Apple 5.1.2(i) third-party-AI consent screen (see `docs/compliance/apple-third-party-ai-consent.md`).

## Approach

- **Reference repo:** `../Amibroke` (a landed Expo RN redesign). Lift nav-agnostic primitives
  and adapt them to our theme; do **not** copy its navigation.
- **Theme:** keep our `useTheme()` dual light/dark (`client/constants/design.ts` `COLORS`) —
  NOT Amibroke's dark-only stateless constants. Every lifted component reads `useTheme()`.
- **Navigation:** keep `expo-router` (Amibroke uses React Navigation — components reuse only).
- **Tokens:** `design.ts` (color/space/type/shadow) + `motion.ts` (timing/easing/spring).
  No hardcoded hex / ms / bezier / px in components.
- **Conventions:** named exports (except `BottomSheet`/`ConfirmSheet`, default); motion prims
  under `components/motion/` (barrel `index.ts`); reduce-motion honored everywhere.

## Decisions (locked)

- Legacy-migration-first → rewrite screens → delete cosmic last.
- Broad primitive kit ported up front; screen-specific widgets on-demand (YAGNI).
- **Slim Phase 2:** migrate only persist-as-is screens now; rewrite-covered screens drop
  cosmic when rewritten in Phase 3; delete cosmic theme/components at the very end.

## Done

### Phase 0 — Foundation
- `client/constants/motion.ts` — DURATION / EASING / SPRING / DISTANCE / SCALE / STAGGER_MS.
- Fonts: added `@expo-google-fonts/newsreader` + `@expo-google-fonts/hanken-grotesk`, loaded
  in `app/_layout.tsx` (Sora/Manrope still loaded for cosmic screens; removed at Phase 3-end).

### Phase 1 — Primitive kit (all `useTheme()`, token-driven, reduce-motion)
- `utils/haptics.ts` — settings-gated `expo-haptics` wrapper (`selection`/`impact`/`notify`).
- `components/motion/` — `PressableScale`, `CountUp`, `entrances` (+ `index` barrel).
- `components/` — `BottomSheet`, `ConfirmSheet` (modal pair); `Button`, `Card`, `TextField`,
  `SectionLabel`, `Toggle`, `Toast`, `Skeleton`; `EmptyState`, `ErrorState`, `LoadingState`.
- `components/onboarding/StoryProgress.tsx` — carousel auto-advance mechanism (scenes built
  per-screen in Phase 3, not speculatively).

### Phase 2 (slim)
- Migrated `components/ErrorFallback.tsx` + `app/+not-found.tsx` → `useTheme()` (alias map).
- Deleted `constants/colors.ts` + `hooks/useColors.ts` (cosmic-color subsystem, orphaned).
- `pnpm typecheck` green throughout.

### Phase 3 — Onboarding flow (DONE, typecheck green)
All 8 screens ported to the kit + `constants/content/*`:
- Welcome; Auth (`(auth)/login` · `register` · `forgot-password` — restyled, UI shell, Clerk
  deferred); Intro carousel (`onboarding.tsx` — swipe-paged, segmented progress, NO auto-advance);
  Age gate (`age-verification.tsx` — fail-closed under-18); AI disclosure; Profile; Choose companion
  (`persona.tsx`); First conversation (`firstchat.tsx`).
- New kit primitives: `Checkbox`, `Field`. Reusable chat chrome `components/chat/`
  (`ChatHeader` / `MessageBubble` / `DisclosureBanner` / `ChatComposer`) — built here, reused by the
  Chat one-off.
- Flow wiring: welcome → register → onboarding(carousel) → age-verification → ai-disclosure →
  profile → persona → firstchat → (tabs); login → (tabs).
- Follow-ups: carousel slide illustrations are Ionicon placeholders (no warm illustration assets yet);
  auth has no SSO row yet (UI-shell minimal); chat typing-reveal is a simple appear (no per-word reveal).

### Phase 3 — HomeTabs (DONE, typecheck green)
- Tab bar restructured: 5 cosmic tabs -> a 3-tab Warm Sanctuary navpill (Home / Companions / You).
  `chat`/`memory`/`premium`/`profile` kept routable but off the bar (`href:null`) until ported/removed.
- Home (`(tabs)/index.tsx`) — the companion's room (greeting + large avatar + AI marker + one CTA);
  resurfaced-memory chip + free 18/30 usage deferred. The "remembers" cache is now available
  server-side (companions.remember_* + Groq remember service) — needs client wiring; the 18/30 usage
  indicator still needs the chat-API count wiring.
- Companions (`(tabs)/companions.tsx`) — roster / chat-list cards -> push Chat; premium-gated create.
- You (`(tabs)/you.tsx`) — header card + tier pill + grouped rows + confirm-first Sign out.
- New kit primitives: `Avatar` (curated portrait + initials fallback), `ListGroup` / `ListRow`.
- Placeholders: You's Data export / Delete account point to `/settings` until the `account` one-off
  exists; companions/you still link to cosmic one-offs (premium / safety / help / privacy / rate-app).

### Phase 3 — Chat one-off (DONE, typecheck green)
- `chat/[id].tsx` restyled onto the reusable chat chrome; preserves the send pipeline (WebSocket
  streaming -> REST -> local fallback), break-reminder, and the limit/upgrade banner. Overflow sheet
  (companion settings / view memory / report). `ChatHeader` refactored to use the `Avatar` component.
- Follow-ups: typing indicator is static dots (no animated reveal); report row is inert; the crisis
  state is not yet specially styled.
- Core navigation loop now complete: onboarding -> tabs -> Chat.

### Known issues
- **Bundling FIXED.** `client/metro.config.js` had `disableHierarchicalLookup=true` (a flat/hoisted
  node_modules assumption) which broke Metro resolution under pnpm -- the real cause of BOTH web and
  native failing on `expo-modules-core`. Switched to `unstable_enableSymlinks=true` + hierarchical
  lookup; native and web both bundle now.
- **Keyboard-controller / Expo Go.** `react-native-keyboard-controller` is not bundled in Expo Go, so
  a temporary passthrough stub in `app/_layout.tsx` is needed for the Expo Go preview ONLY -- revert
  for dev/native builds. A real `expo run:android` dev build needs the NDK (Gradle auto-downloads) +
  JDK 17 (installed at C:\Program Files\Java\jdk-17).
- **Android verified (2026-06-25):** ran on a headless android-34 emulator (hand-authored AVD, WHPX
  accel) via Expo Go -- the redesigned Welcome + Auth screens render correctly in warm-dark (Newsreader
  serif, Hanken body, theme-aware brand mark + Library Wine accent, Field/Checkbox/Button kit with the
  disabled-until-agreed gating). Light theme: toggle the device theme (Expo Go caches the scheme live).

## Pending

### Stale — delete at Phase 3-end (once nothing imports them)
- `constants/theme.ts` (cosmic) — still imported by: `(tabs)/_layout`, `(tabs)/index`,
  `(tabs)/chat`, `chat/[id]`, `notifications`, `safety`, `rate-app`. (invite.tsx was cut from v1 — see below.)
- Cosmic component family: `AuraButton`, `GlassCard`, `AuraOrb`, `Background`,
  `ParticleField`, `StarField`, `GradientBorder`.
- Deps: `@expo-google-fonts/sora`, `@expo-google-fonts/manrope`.

### Phase 3 — rewrite redesign screens from prototypes
Source JSX: `docs/redesign/claude-design/{onboarding,hometabs,oneoff}-app.jsx`.
Authoritative screen list: `docs/redesign/harness/matrix.mjs`.
- **onboarding:** welcome, auth, carousel, agegate, disclosure, profile, persona, conversation
- **hometabs:** home, companions, you
- **oneoff:** chat, create, memory, paywall, submgmt, editprofile, signin, account, notifs,
  safety, legal, help, states
Each rewrite drops its `theme.ts` import. Copy comes from `client/constants/content/*`.

### Resolved scope calls
- `invite.tsx` (referral / invite-friends) — CUT from v1 (not in the redesign matrix, out of
  scope). File + orphan route deleted; no app code referenced it.

### Phase 4 — assets + polish
- App icon / splash from `client/assets/logo/`.
- Theme-aware `StatusBar` (currently hardcoded `style="light"` in `_layout.tsx`).
- Reduce-motion QA pass; deferred consistency nits.

### Follow-ups (verification owed)
- **voice-call device test** — `app/voice-call.tsx` was migrated off the deprecated `expo-av`
  to `expo-audio` (record loop via `useAudioRecorder`, TTS via `createAudioPlayer`). Typecheck-
  verified only; the record → STT → reply → TTS → auto-re-record loop needs a real-device mic
  + the backend on `:8080` to confirm end-to-end (sim has no usable mic).

## Key references
- Tokens: `client/constants/design.ts`, `client/constants/motion.ts`
- Theme hook: `client/hooks/useTheme.ts`
- Content copy: `client/constants/content/*`
- Amibroke reference: `../Amibroke/src/{components,theme}`, `../Amibroke/docs/design-doctrine.md`
