# Aura AI — Frontend To-Do (client / Expo app)

> **Frontend owner:** you (client, via Claude Code). **Backend owner:** coworker (server, via Replit).
> **The coworker does NOT build the frontend.** As backend work lands that implies frontend changes
> (new/changed endpoints, DTOs, error codes, flows), the coworker **appends an item under
> "Backend-driven items"** below so the frontend side is captured.
>
> Companion docs: [v1-architecture.md](../specs/v1-architecture.md), [v1-schema.md](../specs/v1-schema.md),
> [v1-tasklist.md](v1-tasklist.md) (backend build).

## Coordination

- **Contract boundary = `@aura/shared`** (Zod DTOs, enums, constants like `FREE_DAILY_LIMIT`,
  `MAX_MESSAGE_CHARS`, `PersonaTraits`). The client validates/consumes these; when the backend
  changes the contract, the client follows the new shape.
- The backend `v1-tasklist.md` is the server build; **this file is the client build.** Items tagged
  **[both]** there have a frontend half here, coordinated via `@aura/shared`.
- You'll also re-audit the coworker's backend changes with Claude Code — this file is the lightweight
  written trail so nothing frontend-affecting slips through.

## Planned v1.0 frontend (from the rebuild plan)

- [ ] **Monorepo wiring** — Metro config to resolve `@aura/shared` (`watchFolders` → repo root + `nodeModulesPaths`)
- [ ] **Auth UI (Clerk)** — integrate `@clerk/clerk-expo`; build sign-in/sign-up + forgot-password + email-verification via Clerk hooks (**Clerk sends the reset/verification emails** — no custom flow), **Sign in with Apple + Google** via Clerk; persist the session in `expo-secure-store`; remove the silent local-user auth fallback in `AppContext`
- [ ] **Age gate & onboarding** — DOB picker (18+), AI-disclosure screen, first/last-name capture; runs after Clerk sign-up and completes the local profile (the Clerk webhook creates the `users` mirror)
- [ ] **Chat list** — wire to **real** companions (remove the hardcoded `CHATS` array + the id mismatch with `chat/[id]`)
- [ ] **Chat conversation** — client-side **typing animation** on the (already-moderated) reply; render break-reminders, crisis responses, and the AI-disclosure banner; optimistic bubble keyed by `turn_id`, reconcile on re-fetch
- [ ] **Input cap** — live char counter (count code points, not UTF-16) + block-send at `MAX_MESSAGE_CHARS`
- [ ] **Companions** — create/customize UI (3×3×3 trait selectors: warmth/energy/verbosity), persona-name auto-numbering ("Aurora 2"); **premium-gate** trait tuning + creation; **downgrade = lock-not-delete** UX
- [ ] **Memory** — view/delete memories UI *(now unblocked — backend memory-management API is live; see Backend-driven items)*
- [ ] **Premium / paywall** — render the price **from StoreKit/RevenueCat** (remove the hardcoded `$19.99`), **"Restore Purchases"** button, RevenueCat SDK integration
- [ ] **Safety/UGC** — report/flag an AI message (Apple Guideline 1.2)
- [ ] **Account** — in-app account deletion + data export UI
- [ ] **Notifications** — APNs registration + handling ("your companion replied")
- [ ] **Cleanup** — delete `mockup-sandbox` + the design-catalog screens (`app/[screen].tsx`, `screen-map.tsx`, `components/screenData.ts`, `DesignShell.tsx`)

> Note: iOS client work needs **Mac + Xcode + simulator + EAS** — it can't be built/tested on Replit.

## Backend-driven items (coworker appends as work lands)

- [ ] **AI-disclosure recurring notice (SB 243)** — the chat `complete` / `voice_complete` frame (and the REST turn response) now carries an `aiDisclosure: boolean`. When `true`, render the standard "you're talking to an AI" disclosure line in the chat (UI copy is client-owned; the server only decides *when*, ~every 50 messages). This is alongside the existing `breakReminder` string, which should also be surfaced when present.

- [ ] **Auth → Clerk (D8, reverses in-house auth)** — all sign-in/up/forgot-password/email-verification + Apple/Google move to `@clerk/clerk-expo`; the server verifies the Clerk session token (no app JWT). → rebuild the Auth UI on Clerk (the "Auth UI (Clerk)" item above) and attach the Clerk session token to API requests. New client env: `CLERK_PUBLISHABLE_KEY`.
- [ ] **Schema: userId type changed to UUID** — `users.id`, `companions.user_id`, etc. are now `uuid` (were `serial`). Client API calls and local state that assume numeric IDs need updating.
- [ ] **Auth endpoints removed** — `POST /api/auth/register` and `POST /api/auth/login` are gone. Sign-up/Login is handled entirely by Clerk on the client side. After Clerk auth, call `POST /api/auth/seed-companions` to create default companions.
- [ ] **User profile shape changed** — `name` → `firstName`/`lastName`, `birthYear` → `dateOfBirth` (ISO string). Update any local user state or profile forms accordingly.
- [ ] **forgot-password.tsx deleted** — Clerk handles password reset via its own UI; remove any custom forgot-password screen from the client.
- [ ] **Sign in with Apple + Google via Clerk** — configure provider creds in Clerk dashboard (not server env); native Apple flow on iOS; Clerk handles account linking. No server changes.
- [ ] **Remove silent local-user auth fallback in AppContext.tsx** — Clerk session is the single source of truth; remove the old JWT fallback check.
- [ ] **Route guard for (tabs)** — protect the main tab navigator with `useAuth()` from Clerk; redirect to sign-in if no session.
- [ ] **Account deletion soft-delete (30d grace)** — `DELETE /api/account` now soft-deletes (anonymizes PII, toggles `status` to `"deleted"`). Show a confirmation: "Your account will be deactivated for 30 days before permanent deletion. You can reactivate by signing in." Add a **Reactivate Account** flow (re-enables account if within 30-day window; client calls `PATCH /api/account/reactivate`).
- [ ] **Reactivate Account endpoint** — frontend needs to call `PATCH /api/account/reactivate` to restore a soft-deleted account. The endpoint sets `status = "active"`, `deletedAt = null`, and clears the tombstoned email.
- [ ] **Premium staleness refresh** — call `GET /api/payments/entitlements` on app foreground to reconcile `isPremium` staleness (fires DB expiry check server-side). Response envelope: `{ success: true, data: { isPremium: boolean } }`.
- [ ] **Home pin + avatar color (2026-06-30)** — `PUT /api/auth/me` now accepts `avatarColor` and `primaryCompanionId` (the companion pinned to Home, backed by `users.primary_companion_id`). Add the avatar-color picker + a "pin to Home" affordance, and send both fields on profile update.
- [ ] **Memory-management API live (2026-06-30)** — `GET /api/companions/:companionId/memories` (list), `PATCH /api/memories/:id` (edit; body = `UpdateMemorySchema`), `DELETE /api/memories/:id` (delete). Unblocks the "Memory — view/delete memories UI" item above; wire the list/edit/delete screens to these routes.
- [ ] **Home "remembers" card (2026-06-30)** — the Groq consolidation service populates `companions.remember_memory_id` / `remember_question` / `remember_generated_at`. Render a Home resurface card from these fields (read-only on Home).
