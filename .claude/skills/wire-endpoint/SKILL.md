# Wire Endpoint

Wire (or fix the wiring of) one backend seam in the Aura client, without touching any screen.
Invoked as `/wire-endpoint <seam>` — e.g. `/wire-endpoint sendTurn`, `/wire-endpoint memories`.

**Architecture (since the 2026-07-06 wiring arc):** every backend call goes through
`client/lib/backend.ts`, the mock/live switch. It re-exports one implementation of the seam
surface, chosen at bundle time by `DEV_USE_MOCKS` (constants/devFlags.ts):

- `client/lib/mock.ts` — fully local implementation (dev default; demo data, dev triggers).
- `client/lib/live.ts` — the real one: Clerk (`lib/clerk.ts`), REST (`lib/api.ts` fetch helper
  with the Clerk token provider + `{success,data}` envelope handling), RevenueCat
  (`lib/purchases.ts`). Server row → client shape mapping lives here too.
- Shared contract types: `client/lib/models.ts`. Persona seed data shared by AppContext and
  live-mapping: `client/constants/companions.ts`.

So "wiring a seam" = implementing/fixing it in `lib/live.ts` (and keeping the `Seams` type check
in backend.ts satisfied). Mock mode must keep working untouched.

## Ground rules

1. **Swap bodies, never shapes.** Signatures/returns in `lib/models.ts` + mock.ts are the contract
   screens were built against. Adapt server responses inside live.ts — screens must not change.
2. **Request DTOs come from `@aura/shared`** (rebuild via `pnpm --filter @aura/shared build` if the
   server contract changes). Response shapes are ad hoc per route — modeled as `Server*` interfaces
   in live.ts (see the server survey in docs/redesign/fable5-rebuild-notes.md §wiring).
3. **Map failures onto the existing degenerate states** — never invent new error UI:
   - network failure on a send → throw (context marks the user message `status: 'failed'`)
   - 400 `code:BLOCKED` → `{ inputBlocked: true }` → `status: 'blocked'`
   - 429 `code:LIMIT_REACHED` → `{ limitReached: { used, limit } }`
   - everything else non-send → existing Error/EmptyState.
4. **Envelope gotcha**: most routes reply `{success,data}`; `/auth/*`, `/healthz`, webhooks, and
   middleware-level 401/403/404 reply RAW — pass `raw: true` to `api()` for those.
5. **Auth**: Clerk session JWT via `setTokenProvider` (registered in lib/clerk.ts). After sign-up,
   the local user row doesn't exist until Clerk's `user.created` webhook lands (dev: ngrok tunnel,
   `scripts/dev/webhook-tunnel.sh`) — live.ts retries `USER_NOT_FOUND` briefly; keep that pattern.
6. **RevenueCat**: `appUserID` MUST be the local Aura user UUID (server webhook validates it).
   Products: `aura_premium_monthly` / `aura_premium_yearly`. Entitlement truth is the server's
   `GET /api/payments/entitlements` (webhook-fed); SDK CustomerInfo is the fast path.

## Seam index (source of truth: the export list in client/lib/backend.ts)

| Seam | Real endpoint(s) | Status |
|---|---|---|
| `authLogin/authRegister/authVerifyEmail/authResendCode/authSignOut` | Clerk SDK | wired (live untested) |
| `hydrate` | GET /auth/me + /companions + /chat/usage + /voice/limits + per-companion /messages | wired (live untested) |
| `updateMe` | PUT /api/auth/me (+ POST /api/auth/seed-companions on onboardingDone) | wired (live untested) |
| `sendTurn` | POST /api/companions/:id/chat (non-streaming; WS streaming is a later arc) | wired (live untested) |
| `fetchMemories/updateMemory/deleteMemory` | GET /companions/:id/memories · PATCH/DELETE /memories/:id | wired (live untested) |
| `reportMessage` | POST /api/messages/:id/report | wired (live untested) |
| `fetchAccountStatus/softDeleteAccount/reactivateAccount/requestDataExport` | /auth/me · DELETE /account · PATCH /account/reactivate · GET /account/export | wired (live untested) |
| `remoteCreate/Update/Archive/RestoreCompanion, remoteSetPrimary` | /api/companions CRUD · PUT /auth/me | wired (live untested) |
| `configurePayments/fetchStorePrice/purchasePremium/restorePurchases/fetchEntitlements` | RevenueCat SDK + GET /payments/entitlements | wired (live untested) |
| `fetchVoiceUsage` | GET /api/voice/limits | wired (live untested) |
| voice call loop (`app/voice-call.tsx` + `mockVoiceReply`) | voice WS state machine | NOT wired (mock in both modes) |
| chat history pagination | — server returns ALL messages (no cursor); client windows locally | n/a server-side |
| notifications toggle | POST /api/notifications/register (APNs) | NOT wired |

## Procedure

1. Read the seam in live.ts + mock.ts, and the server route (server/src/routes/*).
2. Implement in live.ts; keep mock.ts behavior identical.
3. `pnpm --dir client check` and `pnpm test`.
4. Mock regression: seams changed? verify affected flows on the 16e via `/verify-ui` (full
   relaunch). Live verification needs root `.env` + `pnpm --dir server dev` + client/.env with
   `EXPO_PUBLIC_USE_MOCKS=false` + Clerk/RC keys + webhook tunnel — then restart Metro (env is
   inlined at bundle time).
5. Update the seam index above + docs/redesign/fable5-rebuild-notes.md.

## Guardrails

- Never point the client at a production backend during verification.
- Release builds are always live (`DEV_USE_MOCKS` is `__DEV__`-gated) — mock code cannot leak.
