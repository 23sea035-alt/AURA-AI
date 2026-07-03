# Wire Endpoint

Wire one mock seam in the Aura client to the real backend, without touching any screen. Invoked as
`/wire-endpoint <seam>` — e.g. `/wire-endpoint memories`, `/wire-endpoint sendTurn`,
`/wire-endpoint entitlements`. The client was built so this is a body-swap: every future backend
call is one function in `client/lib/mock.ts` (or a Clerk/RevenueCat drop-in point in
`client/context/AppContext.tsx`), each documenting the endpoint it stands in for.

## Ground rules

1. **Swap bodies, never shapes.** The seam function's signature and return type are the contract
   the screens were built against. If the real endpoint's response differs, adapt inside the seam
   function — screens must not change.
2. **Contract types/constants come from `@aura/shared`** (already built + Metro-resolved). If the
   server changed the contract, update `@aura/shared` first, rebuild it
   (`pnpm --filter @aura/shared build`), then wire.
3. **Map failures onto the existing degenerate states** — never invent new error UI:
   - network failure on a send → throw (context marks the user message `status: 'failed'`,
     the thread renders tap-to-retry)
   - moderation hold → `{ inputBlocked: true }` → `status: 'blocked'`
   - daily cap → `{ limitReached: { used, limit } }`
   - everything else non-send → let the screen's existing Error/EmptyState handle it.
4. **Auth header/session comes from the Clerk session** once `login`/`register` are wired — the
   fetch helper belongs in a new `client/lib/api.ts` (the OLD `lib/api.ts` models the removed
   in-house auth endpoints — treat it as stale reference, rewrite rather than extend).
5. **Keep the mock path runnable** until the wiring arc is complete: gate on an env/config flag if
   the backend isn't always up during development.

## Seam index (grep `WIRE SEAM` and `drop-in point` for the live list)

| Seam | Real endpoint(s) |
|---|---|
| `sendTurn` | POST /api/companions/:id/messages (later: chat WS) |
| chat history paging | GET /api/companions/:id/messages?before=<cursor>&limit=30 |
| `fetchMemories` / `updateMemory` / `deleteMemory` | GET /api/companions/:id/memories · PATCH/DELETE /api/memories/:id |
| `softDeleteAccount` / `reactivateAccount` | DELETE /api/account · PATCH /api/account/reactivate |
| `requestDataExport` | POST /api/account/export |
| `fetchStorePrice` / `purchasePremium` / `restorePurchases` | RevenueCat SDK |
| `fetchEntitlements` | GET /api/payments/entitlements (already called on app foreground) |
| `reportMessage` | POST /api/messages/:id/report |
| voice usage (`voiceUsage` in context) | GET /api/voice/usage |
| voice call loop (`app/voice-call.tsx`) | voice WS state machine (docs/specs/chat-system-design.md §3) |
| auth (`login`/`register`/verify-email) | @clerk/clerk-expo (+ POST /api/auth/seed-companions after first sign-up) |
| profile fields (`updateUser`) | PUT /api/auth/me (firstName/lastName/dateOfBirth/avatarColor/primaryCompanionId) |
| notifications toggle | APNs registration (POST /api/devices) |

## Procedure

1. Read the seam function + its `WIRE SEAM` comment, and the corresponding backend route/DTO
   (`@aura/shared` schemas; `docs/planning/frontend-todo.md` for behavior notes).
2. Replace the body with the real call (via the shared fetch helper). Delete the seam's mock-store
   reads/writes; keep dev triggers (`##fail`/`##block`) behind `__DEV__` if useful.
3. `pnpm --dir client check` and `pnpm test` (pure-logic tests must stay green — they don't touch
   the network).
4. Verify the affected flow on the 16e via `/verify-ui` (full relaunch, never fast-refresh), with
   the real backend running (`server/`, needs root `.env`).
5. Update `docs/redesign/fable5-rebuild-notes.md` seam index (mark wired) — and remove the mock
   function once nothing references it.

## Guardrails

- Don't wire payment/auth SDKs (RevenueCat, Clerk, APNs) unless the task explicitly says so —
  those need dashboard credentials and native rebuilds (see CLAUDE.md gotchas for `expo install`
  + pod + rebuild).
- Never point the client at a production backend during verification.
