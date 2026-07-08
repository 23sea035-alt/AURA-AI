# Fable 5 rebuild — notes

> Change log for the client rebuild + wiring arcs. Started on `fable5-rebuild` (mock-only, wire-ready
> seams); merged into `redesign` 2026-07-07. Clerk / RevenueCat / REST went live in the 2026-07-06
> wiring arc and were **live-verified end-to-end 2026-07-07**; APNs and WS remain unwired. Entries
> are dated and append-only — trust the newest entry over older prose (e.g. the original `firstchat`
> screen described below was superseded by the roster model's onboarding, which lands straight in
> the real chat).

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

## Post-audit implementation round (2026-07-03, second pass)

Implemented after the full-app audit (rubric: `audit-rubric-supplement.md`), all re-verified on-sim:

- **Navigation grammar made deliberate**: root stack default is now `slide_from_right` with
  `fullScreenGestureEnabled` (back-swipe works from anywhere on a pushed screen — verified); `fade`
  only at boot/identity boundaries (index, welcome, entering tabs); heroes rise from the bottom;
  the paywall remains the one modal. The old all-`fade` stack silently disabled the iOS pop gesture
  on every You-cluster screen.
- **Floating tab bar**: narrower (`SPACE.xxxl` side insets) and lowered onto the safe area.
- **Home starter chips**: tonal `raised` + `e1` (were a 1.17:1 hairline that read as stray text).
- **Legal split**: `/terms-of-service` = Terms only; `/privacy` = the Privacy Policy — both
  condensed from `docs/compliance/*-draft.md` (incl. the "Who processes your information" section
  the AI-consent screen links to). The old combined screen and the contradictory "no third
  parties" plain-summary copy are gone.
- **Voice minutes now honor the paywall promise** (20 min/mo free · 10 h/mo premium): monthly
  meter in AppContext (`voiceUsage`, `addVoiceSeconds` — GET /api/voice/usage seam), calm cutoff
  mid-call + out-of-time state on the call screen (verified live: call capped at the staged
  boundary), and a "This month" usage row in voice preferences.
- **New `outline` token** (≥3:1 on bg + raised, both themes — SC 1.4.11) for idle interactive
  controls: toggle-off track, unchecked checkbox, unselected radio rings, idle code cells.
- Meaning-bearing captions (AI-companion markers, usage counter) moved tertiary → secondary;
  greetings humanized via `friendlyFirstName` ("maya.chen" → "Maya") pending Clerk names;
  entitlements refresh on app-foreground (AppState listener); premium-state Restore Purchases is a
  link action, not a chevron row; carousel redesigned (Skip beside the progress rail, single
  full-width Continue).
- **Capture-tooling guardrail** documented in the audit skill: deep-link batches stack on top of
  modals and fake a "everything is a modal" look with garbage back-paths — reset between batches,
  modals last, never grade presentation from a deep-linked stack. (Only `premium` is actually
  modal; verified by config grep.)

## Conversation + roster round (2026-07-03, fourth pass)

- **Chat niceties**: jump-to-latest pill (shows when scrolled into history; labels "New reply"
  when one lands while away), message grouping (consecutive same-sender bubbles tighten to a 4pt
  gap and only the last keeps the tail), tap-a-bubble timestamps, long-press action sheet with
  **Copy message** (expo-clipboard — native dep added, dev client rebuilt) + Report, and per-
  companion draft persistence.
- **Typing visible from outside**: reply-in-flight state (`typing`) lives in AppContext now; the
  roster preview swaps to an italic accent "{Companion} is typing…" while a reply is being
  generated, then settles to the reply preview.
- **Roster swipe actions, Gmail-style**: the action color now bleeds under the card inside a
  rounded clipping wrapper, so mid-swipe the card visibly slides OVER a continuous accent/error
  field (never a floating chip); one row open at a time — opening another row, tapping any card,
  or scrolling closes it.
- **Live relative times**: companions store ISO `lastActiveAt` (display strings are gone;
  migration stamps old rows from their newest message). `utils/time.ts` derives
  "Just now → 3m → 2h → 4d → Jun 26" and `useNow(30s)` re-renders so labels never stale. Purely
  frontend: timestamps come from the server/store; elapsed display is derived at render.
- **Pin policy decided**: unpinning is allowed as a deliberate "no favorite" state — Home then
  hosts the **most recently active** companion (was: first in the roster).

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
- `lib/websocket.ts` is unreferenced but kept as the reference contract for the WS arc.
  (`lib/api.ts` graduated: rewritten in the 2026-07-06 wiring arc, now core live-mode code.)
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
- **On-simulator `/verify-ui` pass (iPhone 16e, both themes) — DONE 2026-07-03.** Every flow was
  driven with Maestro + frame recordings (never fast-refresh; full relaunch before trusting
  anything): full onboarding chain incl. verify-email + ai-consent, firstchat greeting reveal,
  chat typing reveal (frame-by-frame: thinking dots → wine caret → calm word cadence → clean
  completion), serif date dividers (incl. a cross-midnight Yesterday/Today case), crisis card,
  report sheet + toast, memory list/edit/delete, voice-call loop (connecting → speaking ripples +
  revealing captions → listening ring → thinking pulse) + voice preferences, free-tier usage row,
  paywall store-price placeholder + restore toasts, subscription free state, and the
  export → soft-delete → sign-in → reactivate cycle. Warm-dark re-verified on Home, chat, voice
  call, paywall, memory.

  Bugs found by the pass and fixed in the follow-up commit:
  1. **Sheet-to-sheet modal race** — opening a ConfirmSheet/ReportSheet while the previous
     BottomSheet's Modal was still dismissing silently dropped the second sheet (memory delete,
     chat overflow → report). Fixed by waiting out the exit animation (`DURATION.normal + 30`).
  2. **Action sheets opened near-full-height** (memory •••, chat overflow) — now `scrollable={false}`
     so they hug their content.
  3. **Reactivate offer never appeared**: `login()` set the user and Welcome's returning-user
     redirect raced the sheet. Login now checks account status *before* signing in (as the real
     server would) and holds the credentials until the user decides.
  4. **Subscription free state**: long `detail` text crushed the "Free" label out of the row — moved
     to `sub`.
  5. Memory ••• target was ~22pt — now ≥44pt effective.
  6. Firstchat rendered an inert overflow button (ChatHeader now hides it without a handler);
     composer send button was missing a VoiceOver label.
  7. `DEV_FORCE_PREMIUM` default flipped to `false` so the canonical free-tier demo (18/30 counter,
     paywall) shows by default.
  8. Em dashes removed from mock reply/greeting copy (house style); register gained a light email
     shape check (Clerk owns real validation later).
  9. Tooling: `record.sh` now forwards extra args (e.g. `-e EMAIL=…`) to Maestro.

## Backend wiring arc — 2026-07-06

The mock seam grew its live twin. Architecture:

- **`lib/backend.ts` is the switch**: re-exports one implementation of the whole seam surface,
  chosen at bundle time by `DEV_USE_MOCKS` (constants/devFlags.ts — dev default ON; flip with
  `EXPO_PUBLIC_USE_MOCKS=false` in `client/.env` + Metro restart; release builds are always live).
  An `Omit<typeof mock, …>` annotation keeps mock/live signatures from drifting.
- **`lib/live.ts`** implements every seam against the real server (survey: Express on :8080, routes
  enveloped `{success,data}` EXCEPT raw `/auth/*`; chat send = POST /companions/:id/chat with
  400 BLOCKED / 429 LIMIT_REACHED mapped onto the existing degenerate states; history has NO
  pagination server-side — client windows locally). Server rows are mapped to client shapes here;
  client-only presentation (persona text, duotone, lookId) rides in `companions.traits._client`.
- **`lib/api.ts`** (rewritten): fetch helper with injected Clerk token provider, envelope/raw
  handling, `ApiError(status, code)`, and `EXPO_PUBLIC_LOG_API=true` request logging.
- **`lib/clerk.ts`**: imperative Clerk singleton (getClerkInstance) so AppContext keeps plain
  async login/register/verify functions; ClerkProvider mounts only in live mode (`AuthGate` in
  _layout). Post-signup USER_NOT_FOUND (webhook lag) is retried with backoff.
- **`lib/purchases.ts`**: RevenueCat wrapper — `appUserID` = local user UUID (server webhook
  validates against the users table), products `aura_premium_monthly`/`aura_premium_yearly`,
  Test Store key via `EXPO_PUBLIC_REVENUECAT_IOS_KEY`; entitlement = any active (server grants by
  webhook event type, not name).
- **AppContext**: one-shot `hydrate()` on boot/login in live mode (me + companions + threads +
  usage + voice meter, merged over local client-only fields); optimistic local writes now have
  fire-and-forget remote mirrors (companion CRUD, primary pin, profile PUT); completing onboarding
  seeds the default trio server-side then re-hydrates to adopt server UUIDs. Contract types moved
  to `lib/models.ts`; the canonical trio to `constants/companions.ts` (shared with live mapping).
- **firstchat deliberately stays on the mock reply engine in both modes** — the onboarding
  doorway's exchange is never persisted, and server-side seeding is still landing while the user
  types there.
- New deps (expo install + pods + rebuild): `@clerk/clerk-expo` (+ `expo-secure-store`,
  `expo-auth-session`, `expo-web-browser` — clerk-expo's index imports the SSO hook
  unconditionally), `react-native-purchases`.
- Dev tooling: `scripts/dev/webhook-tunnel.sh` (ngrok → prints the exact Clerk/RevenueCat
  dashboard endpoint URLs; needs a one-time authtoken) and `scripts/dev/voice-probe.sh`
  (BlackHole-loopback harness: `speak` a synthesized line into the sim's microphone, `record` the
  companion's TTS reply to a wav for review — for the live-voice arc).
- **Full mock-mode regression on the 16e (relaunched, Maestro-driven) — PASSED**: Home chips →
  prefilled chat, send/reply, ##fail → tap-to-retry, ##block → held-back notice, long-press
  Copy/Report sheet, roster Gmail-bleed swipes + live times + tap-away close, memory list/delete,
  paywall placeholder price → Subscribe → Premium badge + "Manage in App Store", voice-call loop,
  Terms/Privacy/Manage-data, export toast, delete → Welcome, reactivate-on-login sheet (correct
  purge date), sign-out, fresh register → verify-email (async seam + spinner) → carousel → age
  gate → disclosure → consent → name → firstchat greeting reveal. Demo state re-staged after.
- **Live mode is wired but UNTESTED** (blocked on root `.env` + Clerk/RC dashboard config +
  tunnel). Known live-mode gaps to verify then: reactivate endpoint may be unreachable for
  deleted users if `requireAuth` 403s them first (server-side check); `thirdPartyAiConsentAt`
  has no server field (client-only for now); login.tsx's pre-login reactivate sheet can't know
  status before a session exists (degrades to post-login handling).
- run-sim.sh fix: `lsof` exits 1 when :8081 is free → `|| true` (set -e silently killed the
  script on the first run of the day).

## LLM-output hardening + live-mode fixes — 2026-07-06 (afternoon)

- **Every LLM JSON response is now schema-validated** via `server/src/services/llm/llm-json.ts`
  (fence/prose-tolerant extraction + zod). Before: safeguard verdicts were `JSON.parse(x) as T`
  casts — valid-but-wrong-shape JSON ({}, nulled fields) read as flagged=false and **fail-OPENed**
  the output moderator. Now `flagged` is required (absence = parse failure = fail closed);
  descriptive fields degrade gracefully. Applied to both safeguard verdicts, prompt-guard's JSON
  branch, and consolidation decisions (per-element validation — one malformed element no longer
  crashes the loop and burns a retry; valid-empty arrays stay empty).
- Safeguard calls now request **Groq JSON mode** (`responseFormat: "json"` on GenerateReplyParams;
  transport retries without response_format if a model rejects it).
- **False-crisis root cause fixed**: adjudicate's recall regex matched the mere MENTION of
  "crisis route" — rationales like "no crisis routing needed" routed benign messages to the 988
  template (observed live). Negated mentions are now suppressed; affirmative distress signals and
  the crisis_route flag still route.
- Live verification (OpenAI moderation degraded → the exact Groq safeguard path): benign message
  → real Aurora reply, zero safety events. OpenAI moderation itself still 429s — the org needs
  prepaid credits, not just a card on file.
- Chat thread: send failures snap to bottom + extra visual-bottom padding so "tap to retry" never
  sits under the composer.

## Companion roster, gating & first-conversation v1 — 2026-07-07 (evening)

Implemented `docs/specs/companion-roster.md` IN FULL (§15 sequence), mock-mode sim-verified on
the 16e in both themes. Shared → server → client, committed per layer.

- **Shared**: the four roster caps + `activeCompanionCap`/`totalCompanionCap`; `PersonaVoicePack`
  gains `openers[]`/`starters[]` (Appendix A copy, all 12); `pickOpener()` ({firstName} slot,
  no-slot pool when nameless); `CompanionTraitsSchema` admits the `_client` stash at the API
  boundary (the old schema silently 400'd the live client's create).
- **Server**: create guarded by TOTAL_LIMIT_REACHED (checked first — archiving can't fix it) then
  ACTIVE_LIMIT_REACHED; free-tier coercion (grid → preset defaults, `lookId` stripped) on create +
  patch; the user's FIRST companion gets a server-written opener message (cap- and LLM-exempt) +
  auto-pin; restore gains the missing active-cap guard; delete gains min-1-active + pin-read-
  BEFORE-delete re-pin (the FK nulls the pin mid-delete — mocked tests can't see that; caught in
  review); archive re-pins the earliest active survivor; NEW clear (`DELETE /:id/messages`) +
  forget (`POST /:id/forget`) routes; `/auth/seed-companions` removed (onboarding seeds nothing).
- **Client**: `lib/roster.ts` policy lib (unit-tested) is the single home for cap/guard/plan
  logic; `Companion.personaKey` is first-class (identity fixed at creation; avatars/voice resolve
  off it everywhere — header, Home presence, rows); onboarding = 1-of-12 `PersonaCarousel`
  (bounded, peeking, counter+dots, tap-to-select, opens undecided) → creates the REAL companion →
  straight into its chat where the seeded opener waits with reply chips; create screen = same
  carousel + partial gate (Premium chip on the trait grid, sparkle on the look badge, Save always
  live); the two §4 at-limit sheets (never a paywall redirect) with CTAs that drop into Select
  mode via `?select=` params; roster Select mode (word "Select", accent check circles, contextual
  action bar that hides/restores the tab-bar pill via shared `tabBarPillStyle`, base-delete +
  min-1-active proactive disables with reason lines, batch unarchive fills remaining slots +
  partial toast); archived chats open read-only with the "This chat is archived · Unarchive" bar;
  persona empty state + starter chips (tonal fill, SC 1.4.11); Clear conversation / Forget
  everything in the chat overflow with destructive confirms → back to empty-state recs; register()
  starts with an EMPTY roster and 0/30 usage (demo story is sign-in-only); lock badges gone.
- **Copy**: paywall + terms reconciled (free = up to 5 from the full gallery; 30/day is per-user
  shared; premium adds looks + 15 cap).
- **Sim findings fixed during verify**: replace-then-push race dropped the onboarding→chat push
  (deferred a tick); per-screen `tabBarStyle` fully replaces the navigator style (extracted the
  pill style for exact restore); avatars keyed by generated row ids lost portraits/duotones
  (personaKey everywhere); demo 18/30 usage leaked into fresh registers.
- **Verification**: 633 root tests green (35 companions contract tests incl. caps/coercion/opener/
  clear/forget), 24 roster-policy client tests, tsc + lint clean; on-sim end-to-end: full fresh
  onboarding → Sage AND Aurora picks → seeded openers with "Riley" filled; both at-limit sheets;
  Select-mode batch archive / partial unarchive toast ("Restored 2…"); min-1-active pixel-verified
  inert; archived-bar unarchive-at-cap; Clear end-to-end (Forget verified to confirm-sheet +
  contract tests). Screenshots (both themes): `/tmp/roster-verify-screens/`.
- **Known non-blockers**: Home's "AURORA REMEMBERS" card still shows the demo line for brand-new
  users (pre-existing fixture, untouched by the roster spec); `sim-storage.py reset-demo`'s
  companions fixture predates `personaKey`/`isDefault` and the roster model — needs a fixture
  refresh (staged manually this session); live-mode wiring landed but is UNTESTED (mock-only
  session per the handoff constraints).

## Live-mode test pass + fix batch — 2026-07-07 (night)

Full end-to-end live pass on the 16e (Clerk dev + Neon + local server + ngrok tunnel + RevenueCat
Test Store): fresh register → email code → carousel → age gate → AI disclosure → third-party-AI
consent → name → 1-of-12 pick (Orion) → real `POST /companions` + seeded opener → live Groq chat
turn (OpenAI moderation 429s → Groq safeguard carried it, verified) → memory consolidation ran →
roster ops (create Sage w/ duotone fallback avatar, clear conversation, archive, restore — each
verified in Neon) → Test Store purchase → webhook → entitlements → premium gates. Bugs found by
the pass, all fixed + re-verified same session:

- **Name save 400'd silently** (`lastName: ''` vs schema `min(1)`; fire-and-forget mirror swallowed
  it; hydrate stomped local "Jason" → "Good evening, there"). Schema now normalizes '' → null;
  the mirror failure `console.warn`s in dev.
- **First-create pin fired a guaranteed-invalid PUT** (local `local-…` id sent to the uuid-typed
  `primaryCompanionId`); local ids no longer hit the wire (server auto-pins #1; the create mirror
  re-pins with the adopted UUID).
- **Paywall + voice-call heroes lost portraits in live mode** — both passed the server-UUID row id
  to `CompanionPresence`; now `personaKey ?? id` (same rule Home already had).
- **RevenueCat webhook could never verify real events** (invented HMAC header + flat body shape) —
  server-side fix; see `CHANGELOG.md` 2026-07-07.
- **REST chat turns are idempotent now**: stable `turnId` minted per logical turn, kept on the
  bubble so tap-to-retry re-sends under the same key; live-verified (same turnId → same
  `aiMessage.id`, one row, one free-tier charge). `DAILY_CAP` now maps to the cap sheet
  (RATE_LIMITED stays tap-to-retry).
- **Home "remembers" card no longer shows the demo line as a false memory** — wired to
  `companions.remember_question` via hydrate (`Companion.rememberQuestion`), hidden until one
  exists; the demo roster's Aurora carries the canonical line (`DEMO.rememberLine`).
- **Owned-state renew date is store truth** — new `fetchRenewalDate` seam (RC
  `CustomerInfo.latestExpirationDate`; mock = demo date); "Renews Jul 14, 2026" hardcode gone from
  paywall + subscription (null hides the line / falls back to "Active").
- `tosAcceptedVersion` (@aura/shared `TOS_VERSION`) is now captured at onboarding completion
  (register checkbox is the acceptance moment; the PUT waits for a guaranteed session).
- Gotchas earned: **iOS Keychain persists the Clerk session across app uninstall** (a "fresh
  install" can boot signed-in — sign out first when testing registration); **shared/ edits need
  `pnpm --dir shared build`** before the server bundle or Metro see them (stale `dist/` cost one
  confused retest); the free-tier day resets at **UTC midnight** (8pm ET) — the counter dropping
  mid-evening is correct behavior, not a bug.
- **Still open after this pass**: RC dashboard webhook not yet pointed at the tunnel/prod URL
  (server side verified by hand-delivering the real nested shape through the tunnel); push
  registration + WS/voice remain unwired (server code exists, dark); reset-demo fixture refresh;
  eval GO/NO-GO gate; the 9 gallery portraits.

## reset-demo rebuild + away-reply push wiring — 2026-07-07 (late night)

- **reset-demo is delete-driven now** (`scripts/dev/sim-storage.py`): it writes the one key the
  app can't invent — the Maya profile, from `scripts/dev/demo-user.fixture.json`, drift-tested by
  `lib/__tests__/demo-user-fixture.test.ts` — then deletes every seedable key so the next launch
  re-seeds canonically from client code (trio + pin from `DEFAULT_COMPANIONS`/state defaults,
  Aurora's thread from `seedConversation()`, 18/30 from `SEED_USAGE`). No roster fixture to rot
  when the Companion model changes. Sim-verified from live-polluted storage: Maya greeting, trio
  with portraits, pin, remembers card, 18/30. (RC-dashboard follow-through from the live pass also
  landed: webhook secret ROTATED to a dedicated value — it had been the client-bundled test_ SDK
  key — and RC's own test event authenticated through the tunnel.)
- **Away-reply push registration wired** (the dark half of `device_tokens`): new `lib/push.ts`
  (permission + RAW APNs device token via expo-notifications — the server sends through APNs
  itself; foreground presentation suppressed so an open chat never banners over itself) + seam
  `registerPushToken`/`unregisterPushToken` (POST/DELETE `/api/notifications/register`);
  `usePushRegistration` in the tabs layout asks ONCE on the first post-auth Home arrival and
  mirrors the token; the notifications-screen toggle registers/unregisters for real (a denied
  permission flips it back); logout drops the device token before the session dies. New native
  dep `expo-notifications` (expo install + pods + rebuild) + `aps-environment` entitlement.
  **Live-verified on the 16e (Apple-silicon sims get real APNs sandbox tokens): permission
  prompt → token → device_tokens row in Neon → real chat turn → `maybeSendReplyPush` fired and
  correctly reported "APNs not configured"** — actual delivery is blocked ONLY on the Apple
  Developer .p8 key + APNS_KEY_ID/TEAM_ID (all three empty in server/.env).
- Moderation field note: the prompt-guard blocked an instruction-shaped probe ("…probe, just say
  hi") from a REAL session — the injection layer works live; phrase test messages naturally.

## WS streaming chat — 2026-07-07 (late night, after push)

Replies now stream over the WebSocket with a CONTINUOUS word-by-word reveal. Live-verified on
the 16e (burst screenshots: "The ▍" → first sentence + held caret → full reply; APNs warn count
unchanged during the turn = presence suppressed the away-push).

- **`lib/websocket.ts` is the real transport now** (the old draft contract was wrong on every
  frame): sends `{type:'turn', companionId, content, turnId, sessionStartedAt}`; receives
  `token` (one per output-moderated SENTENCE) / `complete` (carries aiMessageId, breakReminder,
  aiDisclosure, crisisResources) / `abort` / `error`; auth via `?token=` (Clerk JWT from new
  `getSessionToken()` in lib/clerk.ts), `refresh_auth` every ~55s, cycle on `auth_expired`,
  backoff reconnect. One socket = presence for ONE companion (server delivers over WS instead
  of pushing while the chat is open).
- **AppContext**: sockets attach/detach with the chat screen (`attachChatStream`, live-mode
  only, never for local ids); `sendTurn` goes WS-first and falls back to REST with the SAME
  turnId (idempotent replay makes that safe — a replayed turn arrives whole with no token
  frames and is appended directly); new `growMessage`/`patchMessage` mutators;
  `streaming[companionId]` exposes the in-flight assistant message id.
- **The streamed bubble keeps its LOCAL row id forever** — the server id rides on the new
  `Message.remoteId` (Report uses `remoteId ?? id`). Swapping ids at complete would remount
  the bubble and restart the reveal.
- **`RevealingText` survives growing text**: progress lives in a ref, so each arriving
  sentence CONTINUES the word cadence instead of restarting/popping; a `streaming` prop keeps
  the caret while caught-up between chunks; the ≤6s compression still applies. REST replies
  keep the classic one-shot reveal (mock-verified unchanged).
- **The thread follows new content now** (the bug that hid streaming): mVCP's
  `minIndexForVisible` was holding the view in place on every insert — added
  `autoscrollToTopThreshold: 120` (readers at the bottom follow; readers scrolled up stay put)
  plus an `onContentSizeChange` re-pin gated by the jump-pill flag, which also tracks bubble
  GROWTH mid-stream. Mock- and live-verified with the keyboard up.
- ThinkingIndicator is driven by context `typing` (clears at the FIRST streamed sentence);
  `sessionStartedAt` now rides both transports (server break-reminder timing).
- **Maestro tooling refreshed** (a lot had drifted): flows `goto-tab` / `open-chat` /
  `send-message` / `signout` / `allow-notifications` keyed to the real a11y labels (tab labels
  are "X, tab, N of 3"; roster rows LEAD with a glyph → match `.*Name.*` unanchored; wait for
  the tab bar + "Search companions" before row taps — Home's pinned-companion label satisfies
  a premature name match); `restart-driver.sh` for the stale-XCUITest-runner failure mode;
  `signup-throwaway.yaml` fixed for the broken-on-iOS-26 `hideKeyboard`. Full surface map +
  mock-first testing rule captured in the verify-ui skill.

## Voice-call live loop — 2026-07-08 (small hours)

The call screen's mock timer loop is now MOCK-MODE ONLY; live mode runs the real pipeline:
client-recorded utterances ship as ONE binary WS frame; the reply returns as per-sentence
Inworld MP3 frames + `voice_caption` text, played in order through expo-audio temp files.

**Capture is expo-audio + an ADAPTIVE energy VAD, not SFSpeechRecognizer** (corrected in the
field the same night): Apple's recognizer fails outright wherever local speech assets are
missing — every iOS simulator throws `kLSRErrorDomain 300` ("Failed to initialize
recognizer", surfaced as `audio-capture`), and devices with dictation disabled hit 201 —
and the server does Whisper anyway, so the recognizer only ever provided VAD + a recorder.
The VAD tracks the room's noise floor (falls fast, rises at 2%/poll) and requires ~450 ms
of audio a 12 dB margin above it: a fixed −40 dB threshold false-triggered on background
noise (observed live — ambient sound kept starting turns; Whisper hallucinates words for
noise). **Human-verified end to end on a clean relaunch: 30 s of ambient noise → zero
triggers; real speech → audible Edward reply from the Mac speakers.**

- **`useVoiceCall`** owns the half-duplex machine (connecting → listening → thinking →
  speaking → listening): REST `/voice/start` budget-gates BEFORE the mic runs; `voice_ready`
  carries the server-authoritative remaining seconds (first one wins over the local mirror);
  `voice_limit_reached` lands in the existing out-of-time UI; a dead socket ends the call
  calmly. Silence keeps re-arming the mic (no-speech "errors" are the idle loop, not faults).
- **One socket, both modalities**: the transport gained voice frames + binary decode
  (`[u32 BE index][MP3]`), and the per-companion socket now lives in a refcounted registry —
  the chat screen and the call screen HOLD THE SAME INSTANCE (the server evicts duplicate
  sockets per companion with close code 4000).
- **`useDictation` is session-guarded now**: speech events are module-global, so without the
  guard the call's recognition would have dumped transcripts into the chat composer
  underneath.
- New native dep `expo-file-system` (utterance bytes in, MP3 frames out) — pods + rebuild.
- **Wire-verified end-to-end** (Node WS probe + on-sim): spoken-WAV utterance → sniffed
  container → Whisper → contextual reply → caption → real MP3 audio frame → ordered
  complete; metering decremented per turn; on-sim call opens to Listening with the capture
  loop stable. Server-side finds it took: see `CHANGELOG.md` 2026-07-08.
- **Still open**: **the three `INWORLD_VOICE_ID_*` values in server/.env are invalid** (Inworld
  "Unknown voice" — save/publish the voice designs in the portal and paste the SAVED ids;
  stock voices Ashley/Edward/Olivia work and can be env-overridden meanwhile); the 9 gallery
  personas stay silent until cast (client shows thinking→listening with no audio — a "voice
  coming soon" state is a nice-to-have); duplicate `voice_start` possible while the socket
  is dialing (idempotent server-side, benign).
- Sim-audio gotchas earned: the sim only enumerates audio devices present at BOOT (install
  BlackHole → reboot the sim); Simulator pins its input via I/O → Audio Input (scriptable
  once osascript has accessibility); the BlackHole→sim INPUT path still didn't deliver on
  the iOS 26 sim — the REAL MacBook mic did, so test voice by speaking. `voice-probe.sh`'s
  speak/record halves remain useful for output capture.
- **Home voice meter** (owner request): the monthly voice meter now sits under the hero for
  BOTH tiers (voice is always metered — 20 min free / 10 h premium), formatted by the new
  shared `fmtVoiceTime` (`utils/time.ts`, also used by voice-preferences); the messages line
  stays free-only. New copy `HOME.voiceTemplate`; at-cap tints accent like the messages dot.
  Maya's demo story seeds **12 min of 20** on first run (`DEMO.user.voiceSecondsUsed`,
  mirrors SEED_USAGE; reset-demo restores it). Mock-verified both tiers on the 16e.
