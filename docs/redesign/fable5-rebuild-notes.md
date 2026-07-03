# Fable 5 rebuild — notes

> Branch: `fable5-rebuild` (off `redesign`). Everything runs on mock data with wire-ready seams;
> no Clerk / RevenueCat / APNs / REST / WS integration. `pnpm typecheck` green; iOS JS bundle
> export green. This file records what changed per screen, the design calls, divergences from the
> existing design, and every seam left for wiring.

## The take, in one paragraph

Warm Sanctuary's tokens and voice were already right — so the soul stays. What the rebuild adds is
a **spine of presence and pacing**: one `CompanionPresence` primitive (the portrait breathing
almost imperceptibly on its persona's whisper-tint) anchors every hero surface, and one
`RevealingText` primitive makes the reply — chat, first chat, and voice-call captions — *write
itself in* like calm handwriting instead of popping. Everything else was rebuilt around a real
mock seam (`client/lib/mock.ts` + a mock-driven `AppContext`) so all nine backend-driven screens
exist and behave, and real wiring later is a body-swap, not a redesign.

## New foundation

### Tokens (`client/constants/design.ts`)
- **`PERSONA_TONES`** — per-persona whisper-tones for both themes (Aurora dawn/amber-rose, Orion
  dusk/deep-clay, Lyra sunlit/honey, per `personas.md` "theme feel"). `wash` = near-bg surface
  tint (atmosphere behind the presence, persona cards); `deep` = strong tone for large decorative
  marks (voice-call rings) — deliberately **not** AA-checked for small text and documented as such.
  Custom companions get no tone and fall back to neutral avatar tokens. `personaToneFor(mode, id)`.
- **`AVATAR_TONES` / `AVATAR_INITIAL_COLOR`** — the edit-profile monogram palette promoted out of
  a screen-local hex array into tokens (also consumed by `Avatar`).

### Motion (`client/constants/motion.ts`)
- **`TYPING`** — the reply cadence (`thinkMs` held beat / `wordMs` per word /
  `sentencePauseMs` breath after punctuation). No screen hardcodes reveal timing.
- **`SCALE.breath`** (1.02) — the presence's ambient inhale ceiling, paired with
  `DURATION.ambient`.

### Mock seam (`client/lib/mock.ts`) — NEW
One exported function per future endpoint, each documenting the route it stands in for:
memories (`GET /companions/:id/memories`, `PATCH /memories/:id`, `DELETE /memories/:id`),
account (`DELETE /api/account` soft-delete, `PATCH /api/account/reactivate`, export), payments
(store price → **returns null so the placeholder renders**, purchase, restore,
`GET /api/payments/entitlements`), report (`POST /messages/:id/report`), and `sendTurn` — a
persona-toned reply engine that reproduces the server's behaviors so every chat state is
reachable on demo data: **crisis detection** (implied-crisis regex → the canonical grounding
reply + `safetyFlagged`), **recurring AI disclosure** (`aiDisclosure` every 8th assistant turn;
the real server does ~50 — compressed so it's demoable), **break reminder** (every 12th session
turn), and the **free-tier cap**. Mock "server state" persists under `mock:*` AsyncStorage keys.

### `AppContext` — rewritten mock-driven
- No `lib/api` / `lib/websocket` imports anywhere in the app anymore (both files kept, unreferenced,
  as the reference shape for real wiring).
- `login`/`register` are Clerk-shaped local shells (drop-in points commented); `register` routes
  through the new **verify-email** step; `login` checks account status for the **reactivate** offer.
- New state + methods: `usage` (daily counter, seeded to Maya's 18/30 on first run, honest daily
  reset after), `sendTurn` (optimistic user bubble → mock pipeline → assistant message with
  `safetyFlagged`/`aiDisclosure` flags), `memories` + `loadMemories`/`editMemory`/`removeMemory`,
  `accountStatus` + `softDelete`/`reactivate`/`requestExport`,
  `purchasePremium`/`restorePurchases`/`refreshEntitlements`, `updateCompanion`.
- `DEFAULT_COMPANIONS` re-canonized to `personas.md` (warm temperaments + correct trait triples +
  warm duotone data; the old cosmic lavender/blue gradients and functional-archetype prose are gone).
- **Aurora's thread is seeded** with the canonical demo conversation on first run, timed "earlier
  today," so Home / Companions / Chat all tell Maya's one story out of the box.
- `Message` gained `aiDisclosure?: boolean`; `UserProfile` gained `thirdPartyAiConsentAt`
  (auditable Apple-consent capture) and ids are string-typed (UUID-ready).

### New shared primitives
- **`CompanionPresence`** (`components/companion/`) — portrait + whisper-tint disc + ambient
  breath (9s loop, ≤1.02 scale, reduce-motion holds still). Used by Home, paywall hero, voice call.
- **`RevealingText`** (`components/chat/`) — word-by-word reveal on the `TYPING` cadence with a
  small wine caret while writing; long replies compress so the payoff never exceeds ~6s;
  reduce-motion snaps to final text. Used by chat, firstchat, voice-call captions.
- **`ThinkingIndicator`** — the "considering" bubble; three dots breathing in slow sequence
  (replaces the static TypingDots); reduce-motion holds a readable mid-opacity.
- **`ThreadDivider` / `AiNotice`** (`ThreadMarkers`) — serif date "moments" that chapter the
  thread, and the quiet recurring "you're talking to an AI" line.

## Per-screen

### Chat (`chat/[id]`) — the focal rebuild
- **The reply is choreographed**: send → optimistic bubble → `ThinkingIndicator` (held beat) →
  the assistant bubble *writes itself in* (`RevealingText`), with a soft haptic tick as it lands.
  The old WS-token streaming + 2s REST fallback + local-fallback pipeline is gone (mock-only per
  the brief); the seam is `context.sendTurn`.
- **Serif date dividers** chapter the thread (Today / Yesterday / June 28) — Newsreader italic,
  the doctrine's "moments" budget.
- **Recurring AI disclosure**: an assistant turn carrying `aiDisclosure` renders the quiet
  centered `AiNotice` under the bubble (distinct from the first-session banner, which stays).
- **Crisis** keeps the canonical grounding `CrisisSupport` card after the flagged reply (shown
  after the reveal completes, so the care moment lands on finished words).
- **Free-limit state**: blocked sends return the message to the composer and show the calm limit
  card (no shame, CTA → paywall); usage now comes from context, not a hardcoded constant.
- **Report** long-press → sheet → `mock.reportMessage` fire-and-forget + toast (non-punitive).
- Composer counter now counts **code points** (emoji = 1); bubble radii/type tokenized
  (`RADIUS.card`/`RADIUS.tight` tail, `TYPE.body` at the approved chat measure).
- Header gains the **voice-call entry point** (labeled for VoiceOver); overflow's "View memory"
  and "Companion settings" now pass the companion id.
- Home's starter chips arrive as a **pre-filled composer draft** (`starter` param) — never auto-sent.

### Home (`(tabs)/index`)
- The presence is now the breathing `CompanionPresence` on its persona wash — the room feels
  inhabited but perfectly calm.
- The **"remembers" card became a serif moment** (eyebrow caption + Newsreader line) rather than
  an icon row — a memory resurfacing, not a notification. Read-only; documented against
  `companions.remember_question`.
- Starter chips pre-fill the chat composer. Usage reads live from context and warms to wine at
  the cap. Non-token font sizes replaced with type tokens. Empty state keeps the centered-room
  layout.

### Companions (`(tabs)/companions`) + creator (`companion/create`)
- Roster kept (it already carried pin/archive/undo/search/subtabs well); custom companions now
  show a **trait-derived voice line** ("warm · playful · expansive") so every card has a voice;
  swipe-action glyphs use `onAccent` (inline `#fff` removed); Edit passes the companion id.
- Creator: **edit mode actually loads the companion** (name + traits) and saves via the new
  `updateCompanion` seam; **persona-name auto-numbering** landed ("Aurora" → "Aurora 2" → 3…,
  case-insensitive, skipping taken numbers).

### Onboarding chain
- **NEW `ai-consent` screen** (Apple 5.1.2(i), from `apple-third-party-ai-consent.md`): plain-language
  disclosure + three quiet rows (Replies / Safety / Voice), the Privacy Policy one tap away, and a
  **separate, unbundled** affirmative consent that captures `thirdPartyAiConsentAt`. Flow is now
  age-verification → ai-disclosure → **ai-consent** → profile. The misleading "conversations are
  private" card copy on ai-disclosure was fixed ("never sold, never visible to other users" —
  no never-leaves-the-device implication). Copy is `[LEGAL-REVIEW]`-pending, marked in content.
- **NEW `(auth)/verify-email`** — the Clerk-shaped verification step: six digit cells driven by one
  hidden input (paste/autofill-friendly), 30s resend countdown, mock accepts any complete code.
  Email registrations route through it; SSO skips it (pre-verified).
- **firstchat** — the payoff now lands: a held beat, then the greeting *writes itself in*; real
  first replies cycle through the same mock engine with the thinking indicator. Messages stay
  local (the persisted relationship starts on Home/Chat; Aurora's canonical seed is not disturbed).
- welcome / carousel / age-verification / profile / persona were **deliberately kept** — they were
  recently hand-tuned, pass the §13 gate, and churning them would have been motion for its own sake.
  (Divergence from "rebuild every screen," noted honestly.)

### Voice (both rebuilt from cosmic-era code, on-doctrine)
- **`voice-call`** — the second hero. The presence sits large and breathing; **tonal rings, never
  glow**, carry the state: listening = one ring swelling with the (mock) voice; thinking = an
  opacity-only pulse; speaking = two soft concentric ripples. Rings use the persona `deep` tone.
  Captions (optional) reveal with the same `RevealingText` as chat. Controls: mute (holds the
  loop), a conventional end-call (error-red is semantic telephony, not an alarm), and a "Voice"
  door to preferences. Elapsed clock, "AI COMPANION · VOICE" honesty marker. The mocked loop
  mirrors the spec's state machine (IDLE / USER_SPEAKING / PROCESSING / AI_SPEAKING) so real WS
  wiring maps 1:1. Reduce-motion: every ring has a static single-ring fallback.
- **`voice-preferences`** — now a real, reachable, persisted screen (was inert + unreachable):
  voice picker (Ember / Dawn / River — maps to `companions.voice_id`), captions toggle (read by
  the call), speaking pace segmented. Persisted via the new `useVoicePrefs` hook. Reached from
  the call and from You → Voice.

### Memory (`long-term-memory`)
Wired to the memory API seam through context: **loading skeletons**, a real **zero state** (Orion
and Lyra genuinely start empty), edit-in-place → `PATCH`, delete confirm → `DELETE`, grouped by
category. Companion resolved by id from the route param (previously always Aurora's demo list).

### Account cluster
- **`account`** ("Manage your data") — delete now runs the real soft-delete seam (loading state on
  the confirm), then signs out; export fires the export seam then toasts.
- **`(auth)/login`** — after sign-in, a deactivated account gets the warm **Reactivate offer**
  (sheet: purge date + "Reactivate account" / "Not now" → declining signs out). Reactivation
  clears the tombstone via `PATCH /api/account/reactivate`.
- **You tab** — avatar renders the user's chosen `avatarColor`; added the **Voice** row.
- **`edit-profile`** — monogram palette now the `AVATAR_TONES` token.
- **`notifications`** — the toggle persists (APNs register/unregister seam documented).

### Paywall + subscription
- **Store price is a real seam**: skeleton while `fetchStorePrice()` resolves → mock returns null →
  the **placeholder slot renders** ("—/mo" + "the app injects the localized store price here")
  — never a hardcoded figure.
- **Restore Purchases works** on both screens (RevenueCat drop-in points commented): restores a
  previously "purchased" entitlement from mock store state, with found/none toasts.
- Subscribe runs the purchase seam with a loading button. Auto-renew legal line + Terms/Privacy
  links were already present and stay. Renewal date reads from `DEMO.renewDate`. Hero avatar is
  now the breathing `CompanionPresence`.

### Error surfaces
`+not-found` rewritten warm ("This page wandered off."); `ErrorFallback` brought onto the type
system + sentence case (its dev-only stack-trace modal kept as-is).

## Bold calls / divergences (flagged per the brief)
1. **Seeding Aurora's thread** with the canonical conversation on first run — the app opens
   mid-relationship, which is the product's whole promise. Fresh onboarding still reads correctly
   because firstchat is local and greeting-first.
2. **The typing reveal replaces token-streaming UI.** Word-by-word on a fixed cadence with
   sentence breaths *feels* more like a person than raw LLM token flow, and it's fully
   client-owned (works identically once the API streams — reveal pacing is presentation).
3. **Persona whisper-tints** are new color surface area (six values per theme). Kept two steps
   from the background so the one-accent rule is untouched — they are atmosphere, not accent.
4. **End call is red.** Telephony convention beats palette purity; it's a semantic action color,
   and the crisis surface remains green/grounding everywhere.
5. **Kept screens that already passed the gate** (carousel, welcome, age gate, persona picker,
   settings/legal one-offs) instead of re-skinning them to look different. Reinterpretation went
   where it changed the product: chat pacing, presence, voice, and the nine backend screens.
6. **AI-notice cadence compressed in mock** (every 8 turns vs the server's ~50) so reviewers can
   actually see it. One constant (`DISCLOSURE_EVERY`) to change.

## Seams index (grep for `WIRE SEAM` / `drop-in point`)
- `client/lib/mock.ts` — every endpoint stand-in (header comment maps them).
- `client/context/AppContext.tsx` — Clerk session shell (`login`/`register`/`logout`),
  entitlement refresh on foreground, `PUT /api/auth/me` fields (`avatarColor`,
  `primaryCompanionId`).
- `client/hooks/useVoicePrefs.ts` — `companions.voice_id` / voice-preferences endpoint.
- `client/app/voice-call.tsx` — voice WS state machine mapping.
- `client/app/(auth)/verify-email.tsx` — Clerk `prepare/attemptEmailAddressVerification`.
- `client/app/premium.tsx` / `subscription.tsx` — RevenueCat purchase/restore/price.
- `client/app/notifications.tsx` — APNs device registration.
- `client/app/ai-consent.tsx` — `users.thirdPartyAiConsentAt` capture.
- Constants mirroring `@aura/shared` (`FREE_DAILY_LIMIT`, `CHAT.characterLimit`) are marked to
  re-source from the contract package once monorepo wiring lands (`@aura/shared` isn't built on
  this branch, so it isn't imported).

## Known leftovers (deliberate)
- `components/Toggle.tsx` keeps its white thumb / black shadow literals (iOS-native switch
  convention, theme-independent); `ErrorFallback`'s dev modal keeps one `#000` shadow. Everything
  else in `app/` and `components/` (outside the documented bespoke onboarding art + GoogleG) is
  token-clean — verified by grep.
- `lib/api.ts` + `lib/websocket.ts` are unreferenced but kept as the reference contract for wiring.
- `react-query` provider still mounts (harmless, unused) — remove or use at wiring time.
- Typed-routes file (`.expo/types/router.d.ts`) was regenerated for the two new routes; any
  `expo start` keeps it fresh.

## Verification
- `pnpm typecheck` — green at every step and at the end.
- `npx expo export --platform ios` — JS bundles clean (catches import/runtime-module errors).
- Reduce-motion: every new animation (`CompanionPresence` breath, `RevealingText`,
  `ThinkingIndicator`, all three voice-call rings) has an explicit snap-to-final/static fallback.
- Both themes: all new color usage flows through `useTheme()` + `PERSONA_TONES[mode]`; zero
  hardcoded hex in screens (grep-verified).
- On-simulator pass (`/verify-ui`-style: relaunch, both themes, screenshot the hero flows) is the
  remaining manual step — not run in this session.
