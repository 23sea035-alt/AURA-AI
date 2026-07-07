# Aura AI — v1.0 Task List

Scoped to the decisions in [v1-architecture.md](../specs/v1-architecture.md). Ordered by dependency:
foundation → safety → chat → payments → compliance → polish. Items marked **(cleanup)** remove
prototype scaffolding from the Replit-Agent build.

> ⚠️ **Backend status moved.** This is the original build plan; several checkboxes here over-claim "done."
> The **authoritative backend status + remaining work is [`backend-fixlist-v1.md`](backend-fixlist-v1.md)**
> (post-audit, 2026-06-23). Keep this file as the phase/dependency history + the frontend-tagged items.

## Ownership & coordination

- **Backend / server — coworker (on Replit):** everything in the phases below except items tagged frontend. Express API, DB + migrations, moderation, memory, payments webhook, notifications, jobs, retention. **The coworker does NOT build the frontend.**
- **Frontend / client — you (via Claude Code):** the Expo app, tracked in [frontend-todo.md](frontend-todo.md).
- **Contract boundary:** `@aura/shared` (enums, Zod DTOs, constants). When the backend changes the contract, the client consumes the new shape; the coworker **appends any frontend implication to `frontend-todo.md`**.
- Several items are [both] (e.g. input cap = server-enforce + client counter; Clerk auth = client `@clerk/clerk-expo` + server session-verify) — coordinate via `@aura/shared`.

---

## Phase 0 — Foundation & hygiene

- [x] **Restructure repo to `client/` + `server/` + `shared/`** (pnpm workspaces, scoped `@aura/*`), mirroring `ai-humanizer-app`: `artifacts/aura-ai`→`client/`, `artifacts/api-server`→`server/`, `lib/db`→`server/src/db/`, `lib/api-*`→`shared/`, `scripts/`→`tools/`; delete `artifacts/mockup-sandbox` **(cleanup)** · **NOTE: `server/` already exists** (holds the committed `server/eval/` eval corpus) — merge `api-server` into `server/src/` etc. **around** it; do **NOT** delete/recreate `server/`, and preserve `server/eval/`
- [x] Create **`@aura/shared`** package (enums as `text + CHECK` unions, Zod schemas, DTOs, domain types); compiles to `dist/`, builds before server/client
- [ ] Configure **Metro monorepo support** in `client` (`watchFolders` → repo root + `nodeModulesPaths`) to resolve `@aura/shared`  *(frontend)*
- [x] Add **`render.yaml`** (rootDir `server`, build `shared` first, `--include=dev`, **`starter` plan**, unauthenticated `/api/healthz`); keep Replit dev-only **(cleanup)**
- [x] Provision **Neon** Postgres; set `DATABASE_URL`; keep Docker for local dev only
- [x] Remove hardcoded secret fallbacks (`aura-ai-secret-2026`, `change-me-in-production`); **fail-closed** at startup if a required secret is missing
- [x] Centralize env/secrets (Render env + local `.env`); document required vars
- [x] Add a **real test runner** (vitest) + **CI** (GitHub Actions: typecheck + tests on PR)
- [x] Add a linter (eslint) + prettier check in CI
- [x] Add error/crash reporting (e.g. Sentry) on app + API
- [x] Remove `mockup-sandbox` package **(cleanup)** *(artifact already removed)*
- [ ] Remove design-catalog screens: `app/[screen].tsx`, `app/screen-map.tsx`, `components/screenData.ts`, `components/DesignShell.tsx` **cleanup)** *(frontend)*
- [x] Consolidate/remove the dead API-codegen pipeline (`lib/api-spec`, `lib/api-client-react`, `lib/api-zod`) — folded into `shared/`, orval removed **(cleanup)**

## Phase 1 — Auth (D7, D8)

- [x] Enforce **18+** self-attestation at registration; App Store age rating 17+ *(server enforces DOB check in PATCH /api/profile)*
- [x] **Integrate Clerk** (D8): client `@clerk/clerk-expo`; server verifies the Clerk **session token** per request (`@clerk/backend`) — no app-minted JWT/bcrypt. Clerk owns email/password, password reset, and email verification **(cleanup: delete the no-op `forgot-password.tsx` + any local JWT/bcrypt code)**
- [ ] **Sign in with Apple + Google via Clerk** — provider creds configured in the Clerk dashboard (not server env); native Apple flow on iOS; Clerk handles account linking *(frontend — Clerk SDK handles this)*
- [x] **Clerk webhook** (`/webhooks/clerk`, svix-signed, idempotent on `svix-id`) → mirror users into `users` (`clerk_user_id`) on `user.created`/`updated`/`deleted`; run the **ban-evasion check** on `user.created`
- [ ] Remove silent local-user auth fallback in `AppContext.tsx` **(cleanup)** *(frontend)*
- [ ] Add a route guard so `(tabs)` is unreachable without a real session *(frontend)*
- [x] Keep `isMinor` plumbing dormant (future minor support)

## Phase 2 — Safety / moderation (D5, §2)

> **Specs:** [moderation-pipeline.md](../specs/moderation-pipeline.md) · [eval-safety-rubric.md](../testing/eval-safety-rubric.md) · [test-harness.md](../testing/test-harness.md)

- [ ] Define a `Moderator` interface (swappable backends)
- [ ] L0 deterministic pre-filter: crisis keywords, hard-block terms, encoding detect/normalize
- [ ] L2/L3 moderation via **OpenAI omni-moderation** (input + output)
- [ ] Escalation to Groq `openai/gpt-oss-safeguard-20b` (policy-based) for borderline/flagged
- [ ] L1 injection detection via Groq `meta-llama/llama-prompt-guard-2-86m` (**every turn, ∥ L2** — revised from on-suspicion; see moderation-pipeline.md)
- [ ] Harden the generation system prompt (persona lock, "user text is data", refuse decode-and-act, no prompt leakage)
- [ ] **Fail-closed** on moderation errors
- [ ] Crisis path: detection → 988 + safe response → log `safety_event`
- [ ] Publish the SB 243 self-harm protocol (website/legal)
- [ ] Consolidate triplicated safety logic into one module **(cleanup: remove unused `detectSafetyIssue` in `chat.ts` + test's private copies)**
- [ ] Moderation test suite against the **real** module (input, output, evasion, persona-permissive corner) **(cleanup: replace the 51 "tests" that test copies)**

## Phase 3 — Chat & personas (D1, D6, §3, §5)

> **Specs:** [generation-pipeline.md](../specs/generation-pipeline.md) · [memory-pipeline.md](../specs/memory-pipeline.md) · [test-harness.md](../testing/test-harness.md)

- [ ] Remove WebSocket server + client **(cleanup: `app.ts` WS block, `lib/websocket.ts`)**
- [ ] Implement request/response turn: generate → moderate → return; **client-side typing animation**
- [ ] Server-authoritative turn model: `turnId` idempotency, user-message-first, fallback reply on failure
- [ ] Client optimistic bubble keyed by `turnId`; re-fetch reconciliation (replace, not append)
- [ ] Wire real companions into the chat list **(cleanup: `app/(tabs)/chat.tsx` hardcoded list + id mismatch with `chat/[id].tsx`)**
- [ ] 3 personas × 3 orthogonal axes × 3 levels; store on `companions.traits`; server-assembled prompt with fixed safety preamble
- [ ] Memory retrieval: keyword/Jaccard + `importance` + **recency decay**; inject top-N into the **system prompt** (not the user message) **(cleanup: rename `embedding`→`keywords`, now `text[]`)**
- [ ] Memory writes: **async post-turn LLM consolidation** pass — extract durable facts + **dedup** + **light contradiction** (`ADD`/`UPDATE <id>`/`NONE`; `UPDATE` overwrites in place); guardrails (no hard deletes) + eval set **(design done — cards/rubric specced + seed corpus in `server/eval/cases/consolidation/`; just implement the harness on Replit)**
- [ ] `MEMORY_CATEGORY` enum in `@aura/shared`; per-companion scope
- [x] **Memory-management API (2026-06-30):** `GET /api/companions/:companionId/memories` (list), `PATCH /api/memories/:id` (edit, body = `UpdateMemorySchema`), `DELETE /api/memories/:id` (delete) — ownership-scoped; powers the client view/delete-memories UI.
- [ ] Input length cap: `MAX_MESSAGE_CHARS` (~2000, `@aura/shared`) in the turn Zod schema — client live counter + block-send; **server rejects 400** (authoritative); check after trim; count code points not UTF-16 units
- [ ] Prompt-assembly budget: cap injected memories at **top-N** + keep facts concise + cap history to last **K** msgs; **trim-to-fit** (drop lowest-scored memories / oldest history first) so a valid message never fails on context size
- [ ] Drop the unused `summaries` table + dead `generateSummary`/`shouldSummarize` code; log rolling-summarization under Deferred **(cleanup)**
- [ ] Free-tier daily message limit (**30/day**, `@aura/shared` constant, UTC reset, completed turns only) enforced server-side in the turn processor
- [ ] Replace remaining fake/static screens & dead buttons with real or removed **(cleanup)**

## Phase 4 — Payments (D4)

- [ ] RevenueCat SDK + StoreKit; configure products → entitlements *(frontend)*
- [ ] Create the **Premium $9.99/month** product in App Store Connect (monthly) *(App Store Connect)*
- [ ] Render price from the StoreKit/RevenueCat offering (localized) **(cleanup: remove hardcoded `$19.99` in `premium.tsx`)** *(frontend)*
- [x] Enforce "unlimited" **anti-abuse ceiling** (per-minute rate limit + daily hard cap); keep **voice metered**, never unlimited
- [ ] Enroll in Apple **Small Business Program** (15%) *(App Store Connect)*
- [x] Verified RevenueCat **webhook** handler → sync entitlements to DB (never trust client)
- [ ] "Restore Purchases" button (App Review requirement) *(frontend)*
- [x] Sandbox vs production webhook environment handling
- [x] Keep Stripe code dormant for deferred web billing **(cleanup: repurpose `payments.ts`)**

## Phase 5 — Notifications (D10)

- [x] `device_tokens` storage (table)
- [ ] APNs setup + token registration on the client *(frontend)*
- [x] Transactional push: "your companion replied" when the user is away (sendReplyPush wired after AI reply completes)

## Phase 6 — Compliance & data (§6)

- [x] In-app **account deletion** (Apple-required): soft-delete grace (**30d**, recoverable) → hard purge of conversations/memories/companions/PII (**≤30d**); backups "beyond use" (**≤90d**)
- [x] **Data export**
- [x] **`banned_identities`** table + salted/keyed hash of email + OAuth `sub`; checked at registration to block ban evasion (retain **24mo**)
- [x] Retention enforcement jobs: messages purge (90d), safety_events (365d), banned_identities (730d), grace-expiry hard purge (30d) *(financial mirror 7yr + deletion audit record are legal-review items — pending)*
- [ ] **Privacy policy** (4 sections: Retention, Deletion, Trust & Safety, AI — incl. no-training clause, human-review disclosure, post-deletion exceptions) + **data-retention policy** doc + App Store privacy nutrition labels *(legal/documentation)*
- [ ] **Legal-review items:** exact retention numbers; `safety_events.flagged_content` retain-vs-scrub; jurisdictions (US-only vs EEA/UK); final policy wording *(legal)*
- [x] In-app **report/flag an AI message** (UGC, Apple Guideline 1.2)
- [x] `safety_events` **review queue** / workflow
- [x] Confirm US-only launch; 988 crisis resources

## Phase 7 — Release readiness

- [ ] App Store metadata, 17+ rating, screenshots, subscription terms on paywall
- [ ] Load/cost sanity check against §7 estimates; set Neon + spending caps
- [ ] Verify the full turn lifecycle under interruption (navigate away, kill, crash, background, network drop)
- [ ] Security pass: no secrets in client, rate limits, input validation at boundaries

---

## Server structure (`server/src/`) — reference

Layered: route → controller → service → db (repositories). Maps additively onto the prototype's `routes/` + `services/` + `middleware/`.

- `config/` — Zod-validated env (`env.ts`, fail-closed at boot) + server-only constants
- `routes/` — HTTP only (path + verb + middleware → controller)
- `controllers/` — validate (Zod from `@aura/shared`) → call service → response envelope; thin
- `services/`
  - `chat/` — `turn-pipeline.ts` (server-authoritative turn), `prompt-assembler.ts` (persona+traits+safety+memory+history, trim-to-fit), `free-tier.ts`, `break-reminder.ts`
  - `moderation/` — `moderator.ts` (interface + L0→L3 orchestrator, fail-closed + degradation ladder), `deterministic.ts`, `prompt-guard.ts`, `openai-omni.ts`, `safeguard.ts`, `crisis.ts`
  - `memory/` — `retrieval.ts`, `consolidation.ts` (async), `keywords.ts`
  - `llm/` — `provider.ts` (interface) + `groq.ts`
  - `auth/` — `clerk.middleware.ts` (verify Clerk session → `AuthRequest`), `auth.service.ts` (local user upsert/lookup + ban check); Clerk webhook under `webhooks/clerk.ts`. (No `password.ts`/`oauth.ts`/`tokens.ts` — Clerk owns credentials/OAuth/sessions.)
  - `payments/` — `revenuecat.ts` (webhook verify → upsert subs + flip `is_premium`), `entitlements.ts`
  - `notifications/apns.ts` · `account/` — `deletion.ts` (tiered purge), `export.ts`
  - `jobs/` — worker substrate + `memory-consolidation.job.ts` + `retention.job.ts`
- `db/` — `client.ts` (Neon + drizzle casing), `schema/` (one file/table; import enums from `@aura/shared`), `repositories/` (keep Drizzle out of services), `migrations/`
- `middleware/` — `auth.ts`, `validate.ts`, `rate-limit.ts`, `error-handler.ts` (Express 5, mounted last), `not-found.ts`, `request-context.ts`
- `lib/` — `logger.ts` (pino), `errors.ts` (AppError hierarchy), `response.ts` (envelope), `crypto.ts` (banned-identity hashing)

Principles: routes never touch db/services internals; services never see `req`/`res`; Drizzle behind repositories; `Moderator` + `LLMProvider` are interfaces (model/provider churn = config).

## Open implementation decisions & gaps (from audit 2026-06-22)

Resolve in an implementation-kickoff session (a fresh session loading these docs is sufficient — the docs carry the state).

**Product decisions (your call):**
- [x] **Voice scope — DECIDED: deferred to post-v1.0.** v1.0 is text-only. Voice = STT → the existing turn pipeline → TTS (a modality wrapper, not a separate AI); re-adds later with a provider + `voice_usage` metering table + transcript moderation. See Deferred section. **⚠️ 2026-06-30 — REVERSED/LANDED:** the voice backend has since shipped (`server/src/services/voice/` — LiveKit + Cartesia TTS + Deepgram STT, `/api/voice/*` endpoints, `voice_usage` metering table). No longer deferred.
- [x] **Async-job substrate — DECIDED: durable lightweight queue** (`memory_jobs` table polled by an in-process interval worker; pg-boss acceptable). Powers async memory consolidation (D12) + retention jobs. Lives in `server/src/services/jobs/`.

**P0 — blockers / silently-wrong-if-guessed:**
- [x] Explicit Phase 0 task: **author + commit the initial Drizzle migration** for all tables (originally 8; as-built = **12 tables**, adding `memory_jobs`, `rate_limits`, `deletion_audit`, `voice_usage`; migrations later squashed to a single `0000_init` baseline).
- [x] **`userId` numeric → UUIDv7** breaking change across auth/chat/memory/safety/payments + JWT payload + `AuthRequest` — explicit early task.
- [x] **Response/error envelope** (`{success,data?,error?,meta?}`) + client-switchable error codes (`LIMIT_REACHED` 429, `BLOCKED`, `CRISIS`); centralize in `lib/response.ts` + `error-handler.ts`.

**P1 — correctness/security:**
- [x] Zod request-validation middleware; turn/auth/companion DTO schemas in `@aura/shared`.
- [x] Boot-time env validation (`config/env.ts`, fail-closed) + published env-var list.
- [x] Moderation **degradation ladder** (behavior when OpenAI omni is down, given fail-closed).
- [x] pino everywhere (no `console.*`); never log `flagged_content`/message content; request-id correlation.
- [x] RevenueCat webhook: signature verify, idempotency on `original_transaction_id`, sandbox-vs-prod, out-of-order events.
- [x] Rate-limit topology: per-user chat limiter + per-minute anti-abuse ceiling + auth brute-force limiter + webhook exemption (replace coarse global 100/15min).
- [x] `is_premium` staleness reconciliation (scheduled RC poll or app-foreground refresh).
- [x] **Seed the 3 default companions** on registration/onboarding (no task does this today).
- [x] Crisis path: high-precision keyword tuning + eval; crisis reply is a fixed template (not LLM).

**P2 — quality bar:**
- [x] vitest layout: moderation evasion suite, prompt-assembler trim-to-fit, retrieval scoring **(fixtures seeded: `server/eval/cases/retrieval/`)**, deletion tiering, turn-pipeline integration, webhook idempotency; 80% target.
- [x] Graceful shutdown (drain in-flight turns + jobs on SIGTERM — Render sends it on deploy).
- [x] Transactions: `turn_id` unique-violation handling; `companions.last_message`/`message_count` in one DB transaction.

**Env vars to publish:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `APNS_*`, `BANNED_IDENTITY_PEPPER`, `SENTRY_DSN`, `PORT`, `NODE_ENV`, `APNS_ENVIRONMENT`. **Voice (optional tier):** `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID`, `DEEPGRAM_API_KEY`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`. *(Clerk replaces `JWT_SECRET`; Apple/Google OAuth creds live in the Clerk dashboard, not server env.)*

**Ordering fixes:** Phase 2 (moderation) and Phase 3 (chat turn) are co-dependent — build the `Moderator` interface before the turn pipeline; secret-fallback removal (Phase 0) must land with/before Phase 1 auth.

## Deferred (post-v1.0) — do NOT build in v1.0

Voice calls (speech → turn pipeline → TTS; metered) · True SSE streaming · Next.js web · real embeddings ·
under-18 support · re-engagement notifications · Android · i18n/region crisis resources ·
freeform companion authoring · US web payment link-out.
