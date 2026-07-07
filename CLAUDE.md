# Aura — working notes for Claude Code

Expo RN client in `client/` (SDK 54, RN 0.81.5, expo-router, pnpm monorepo with `@aura/shared`
contract package + `server/`). Every backend call goes through `client/lib/backend.ts` — the
mock/live switch (`DEV_USE_MOCKS`): mock mode (dev default) runs fully local via `lib/mock.ts`;
live mode is Clerk + REST + RevenueCat via `lib/live.ts` (config in `client/.env`, see
`.env.example`; restart Metro after env edits — values are inlined at bundle time). Design system:
"Warm Sanctuary" — doctrine at `docs/redesign/01-doctrine.md`, running change log at
`docs/redesign/fable5-rebuild-notes.md`.

## Commands

- Typecheck: `pnpm --dir client exec tsc -p tsconfig.json --noEmit`
- Lint: `pnpm --dir client lint` · both: `pnpm --dir client check`
- Tests (root vitest; includes client pure-logic tests): `pnpm test`
- Run on iPhone 16e sim: `pnpm --filter @aura/client ios:sim` (xcodebuild workaround for Xcode 26 —
  plain `expo run:ios` fails on signing). Metro: `pnpm --dir client exec expo start --port 8081`.
- Sim storage inspect/stage/reset: `python3 client/scripts/dev/sim-storage.py {get|set|del|reset-demo}`
  (stage while the app is TERMINATED or its shutdown flush overwrites you; reset-demo assumes a
  signed-in demo user — stage the `user` key too after a sign-out/delete flow).
- Webhook tunnel for Clerk/RevenueCat dashboards: `client/scripts/dev/webhook-tunnel.sh [static-domain]`
  (needs one-time `ngrok config add-authtoken <token>`); voice-pipeline audio harness:
  `client/scripts/dev/voice-probe.sh` (BlackHole loopback — speak into the sim mic, record TTS out).
- Regenerate typed routes after adding a route file: briefly run
  `pnpm --dir client exec expo start --port 8090 --offline` until `.expo/types/router.d.ts` updates.

## Conventions

- **Tokens only** in screens: color/space/radius/type from `client/constants/design.ts`, motion from
  `constants/motion.ts`. No hardcoded hex/px/ms. `outline` token = idle interactive-control
  boundaries (≥3:1); `border`/`divider` = structural hairlines only.
- **Copy** lives in `client/constants/content/*` — sentence case everywhere (buttons too), warm
  voice, **no em dashes in user-facing copy**.
- **Wire seams**: the seam surface is the export list of `lib/backend.ts`; contract types in
  `lib/models.ts`; wiring work happens in `lib/live.ts` (see `/wire-endpoint`). Screens never
  import mock/live directly. Request DTOs from `@aura/shared`; response shapes are ad hoc per
  route (`Server*` interfaces in live.ts). `/auth/*` replies RAW (no `{success,data}` envelope) —
  use `api(path, { raw: true })`. RevenueCat `appUserID` = local user UUID, never the Clerk id.
- Verify UI changes on the sim via the `/verify-ui` skill; design-grade via `/audit-screen`.
  **Always relaunch (`simctl terminate` + `launch`) before trusting what you see** — fast refresh
  lies. Don't commit/push unless asked.

## Gotchas (each of these has burned a session)

- Install Expo-ecosystem deps with `pnpm --dir client exec expo install <pkg>` — plain `pnpm add`
  pulls SDK-mismatched majors ("Cannot find native module" at runtime). Native deps then need
  `npx pod-install ios` + an `ios:sim` rebuild, and reinstalling **changes the app's data-container
  UUID** (re-resolve via `simctl get_app_container` before touching storage).
- AsyncStorage on the sim: small values live in `RCTAsyncLocalStorage_V1/manifest.json`; large
  values move to sibling files named `md5(key)`. Use `sim-storage.py`, not hand edits.
- react-navigation's absolute tab bar ignores `left`/`right` in `tabBarStyle` — use
  `marginHorizontal`. A per-screen `tabBarStyle` (navigation.setOptions) REPLACES the navigator's
  style entirely; restore via the shared `tabBarPillStyle` from `(tabs)/_layout`, never
  `undefined`. A screen child can never paint OVER the tab bar (hide it instead). `router.push`
  issued in the same frame as a `router.replace` gets dropped — defer the push a tick.
  `animation: 'fade'` on a stack silently disables the iOS back-swipe.
- Inverted FlatList renders intra-cell sibling order unreliably — give attachments (captions,
  notices, cards) their own list rows. Scrollable screens need `style={{flex:1}}` +
  `contentContainerStyle={{flexGrow:1}}` or under-filled screens have dead swipe zones.
- iOS can't present a Modal while another is dismissing — wait `DURATION.normal + 30` between
  sequential sheets.
- Port 8081 collides with the sibling Amibroke repo's Metro (RN version-mismatch redbox) — check
  `lsof -i :8081` ownership before assuming an app bug.
- Deterministic dev triggers are registered in `client/constants/devFlags.ts` (premium override,
  `##fail`/`##block` send states).
