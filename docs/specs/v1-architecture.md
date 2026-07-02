# Aura AI — v1.0 Architecture & Decisions

**Status:** Approved for build · **Scope:** iOS-first, adults-only (18+) AI companion app
**Last updated:** 2026-06-30 (WebSocket transport + Inworld TTS + 70B model + Groq STT + L2 concurrent sequencing)

> This document is the single source of truth for v1.0 architecture decisions. It supersedes
> the as-generated state of the repo (a Replit-Agent prototype: broad UI, a thin working
> backend spine, prototype-grade engineering hygiene). Each decision below records **what**,
> **why**, and **consequences**. See [§8 Deferred](#8-deferred--post-v10) for explicitly out-of-scope work.

---

## 0a. As-built backend status (2026-06-29) — how each part actually works NOW

> This section reflects the **locked `main`** after the 2026-06-29 production-readiness audit +
> remediation ([docs/audit/backend-audit-2026-06.md](../audit/backend-audit-2026-06.md)). It is the
> authoritative "current behavior" reference — **do not regress these without an explicit decision.**
> Suite: 496 tests (494 green; 2 `pg-rate-limit` contract tests require a live Postgres and are skipped
> in a bare env), typecheck clean. **Last reconciled to code: 2026-07-02.**

- **LLM provider — Groq ONLY (hard lock).** Generation = Groq `llama-3.3-70b-versatile` (primary), `llama-3.1-8b-instant` (fallback); guards = Groq
  `prompt-guard-2-86m` (L1) / `gpt-oss-safeguard-20b` (L3 escalation); content moderation = OpenAI
  `omni-moderation-latest` (L2/L3, free). **NVIDIA (or any other generation host) must NOT be used** —
  it taints prompt iteration (different serving/sampling, and the guard models are Groq-specific) and
  is not the production target. `app.ts` initializes `createGroqProvider` only.
- **Chat turn (D1/§3) — connection-bounded.** Moderation + generation run **outside** the DB
  transaction; only the user-msg + assistant-msg + companion-counter writes are in a short
  transaction (avoids holding a pooled connection across an LLM round-trip). `turnId` is **truly
  idempotent** — a replay returns the existing turn (no duplicate, no second generation). Safety-event
  logging is best-effort on a **separate connection** (loud: error log + Sentry + metric) so it can
  never roll back or suppress the user's reply — including the 988 crisis response.
  **Update 2026-07-02: sentence-gated streaming + one engine.** `ChatSession` streams Groq token deltas,
  buffers to sentence boundaries, L3-moderates each completed sentence, and forwards it only if it clears —
  real streaming, no unsafe content ever transmitted (D1); an `AbortController` stops generation on a block.
  `turnId` idempotency (replay-on-reconnect) is implemented here. The REST endpoint
  (`POST /companions/:id/chat`) is now a **non-streaming wrapper over the same `ChatSession`** — the old
  `turn-pipeline.ts` was retired, so there is **a single turn engine**. L2 is a blocking input gate (via
  `screenInput`), not concurrent-with-generation.
- **Moderation — fail-closed, one path.** Every turn (text + voice + the REST wrapper) runs through
  `ChatSession` → the shared `ModerationEngine` (`screenInput` = L0–L2 + safeguard; per-sentence
  `screenOutput` = L3, **gated before send**). Self-harm→crisis routing, OR-escalation, and flagged-user
  widening all apply; the crisis path fires + logs a `critical` `safety_events` row and returns 988/741741.
  The AI-disclosure preamble says *"you are an AI, and say so plainly if asked"* (SB 243) — never the inverse.
- **Rate limiting — durable + shared.** All limiters use a **Postgres-backed store** (`rate_limits`
  table), so the per-minute / daily-cap / brute-force / global limits hold across restarts AND
  multiple instances. (The in-memory default store was the prior CRITICAL.)
- **Boot — safe.** `migrate()` runs on boot from `./db/migrations` (copied into `dist/` by
  `build.mjs`), under a `pg_advisory_lock` so concurrent instances serialize; fails fast if the
  folder is missing/empty. The migration set is now the **single squashed `0000_init` baseline**
  (16 incremental migrations condensed; `server/drizzle.config.ts` drives `drizzle-kit generate`,
  `push` forbidden). Crash handlers (`unhandledRejection`/`uncaughtException`) + graceful
  SIGTERM drain (incl. the job worker's in-flight cycle) are wired.
- **Jobs — multi-instance safe.** The consolidation worker claims with `FOR UPDATE SKIP LOCKED` +
  `claimed_at`; a boot/interval reaper requeues jobs orphaned by a crashed instance.
- **Compliance — erasure complete.** Account deletion propagates to **Clerk** (best-effort), writes a
  content-free `deletion_audit` row, purges per-user in isolated transactions; GDPR export includes
  subscriptions + device tokens + safety events (all `userId`-scoped).
- **Schema integrity.** Enum CHECK constraints + composite UNIQUEs are enforced in the DB (see
  `v1-schema.md` as-built note). Ban identifiers are hashed with **HMAC-SHA256** (keyed), not
  `sha256(id+pepper)`.
- **Observability.** Sentry `captureException` on unhandled errors (DSN-gated); safety/abuse metrics
  counters exposed at `GET /api/admin/metrics`.
- **Eval gate.** `pnpm eval` exits non-zero on any safety-critical false negative (FN=0 enforced);
  generation judge derives pass from dimension grades. Live evals require real `GROQ_API_KEY` +
  `OPENAI_API_KEY` and are run against **Groq** (not NVIDIA).
- **Voice — wired end-to-end.** The stack is **binary WebSocket frames** + **Inworld TTS 2** (`inworld-tts-2`) + **Groq STT** (`whisper-large-v3-turbo`, batch); LiveKit / Cartesia / Deepgram are fully removed. An inbound binary audio frame → Groq STT → the shared `ChatSession` (identical L0–L3 moderation + sentence-gated generation as text) → Inworld TTS streamed back as binary frames (`websocket/handler.ts` `handleVoiceAudio` + `services/voice/voice-adapter.ts`). `POST /api/voice/start` + `/stop` exist; per-utterance metering is **enforced** server-side (premium-aware daily + per-call caps) and recorded into `voice_usage`. Barge-in via a `voice_interrupt` control frame (classifier wired). `/api/voice/token` + `/api/voice/tts` were deleted per D13. **Remaining:** the three `INWORLD_VOICE_ID_*` must be created in the Inworld portal for TTS to produce audio (it skips gracefully until then) — see TODO §1. WS frame contract in [chat-system-design.md §3](chat-system-design.md).
- **Memory management — built.** User-facing memory CRUD: `GET /api/companions/:companionId/memories`,
  `PATCH /api/memories/:id`, `DELETE /api/memories/:id`. Plus the **"remembers" cache**: after
  consolidation, a Groq pass generates a follow-up question for a surfaced memory and writes
  `companions.remember_*`, read read-only by the Home "remembers" card (D12).
- **Profile write path.** `PUT /api/auth/me` now also accepts `avatarColor` + `primaryCompanionId`
  (the user-switchable Home pin).

**Known deferred (not yet done):** the live eval run against current `main` (needs both keys); a few
MEDIUM/LOW items tracked in the audit report (e.g., free-tier count race, RevenueCat atomic CAS,
auth response-envelope consistency). See the audit's §8 backlog.

---

## 0. Product context

Aura AI is an AI companion chat app (Replika / Character.ai genre). Users chat 1:1 with vetted
AI personas that remember facts across conversations. Differentiator: a **safety-first**,
regulation-aware design (crisis detection + resources, content moderation, AI disclosure).
Monetized via subscription (free tier with daily message cap; premium unlimited).

**v1.0 platform:** native iOS app (Expo / React Native). No web, no Android in v1.0.

---

## 1. Decisions

### D1 — Chat transport: WebSocket streaming with concurrent moderation
- **Decision:** Chat uses a **persistent WebSocket connection** per chat session. LLM tokens stream to the client as they arrive (live "typing out" effect); output moderation (L3) runs **concurrently** with the token stream and emits an `ABORT` event if triggered — the client clears the partial reply and shows a safe canned fallback. Input moderation runs as: L0 (instant) + L1 (~100ms, **blocking** — injection must clear before generation); L2 starts concurrently with L1 but generation begins once L1 clears — **L2 continues concurrent with generation** (not blocking, saves 150–400ms TTFT). See §4. Text and voice share a **unified core engine** (`ChatSession`) with `onToken` / `onSentenceComplete` / `onAbort` events; text and voice are I/O adapters on top of it. See §4 for the full engine design.
- **Why:** Streaming is table stakes — every major competitor (Replika, Character.AI, Nomi, Kindroid) already streams text; non-streaming is a perceptible UX regression. Running L3 concurrently removes it from the critical latency path (previously a blocking 250–500ms step after full generation). The unified engine means voice is a configuration swap once text streaming is proven, not a separate pipeline rewrite. WebSocket is preferred over SSE because it is bidirectional (abort signal + future upstream events on one connection) and consistent with the LiveKit voice transport — the iOS client already handles persistent WebSocket connections.
- **iOS compatibility:** React Native's `WebSocket` global is available natively in Expo — no additional packages needed. Persistent WebSocket connections are already exercised on iOS in this repo (the WS chat + voice transport use them). iOS backgrounds the app → connections drop, but the **server-authoritative turn model (§3) already handles this**: the server completes the turn regardless of client state; the client re-fetches the message list on return to foreground. Production requires `wss://` — Render provides HTTPS/WSS natively.
- **Consequences:** Replace the prototype's fake-streaming WebSocket scaffold in `app.ts` with a proper WebSocket server. Migrate the `POST /companions/:companionId/chat` REST endpoint to a WebSocket message handler. Implement the `ChatSession` core engine (§4). The `turnId` idempotency model (§3) is unchanged — only the transport layer changes.

### D2 — Database: managed Postgres (Neon); device → API → DB only
- **Decision:** Production Postgres on **Neon**. The iOS app never touches the DB directly; all
  CRUD goes through the Express API. Keep **Drizzle ORM** (Neon is standard Postgres). Docker
  Postgres remains for local dev only.
- **Why:** Credentials shipped in an app binary are extractable. The Express API is the trusted
  boundary (authN/authZ, validation, rate limits) — and it must call Groq with a secret key and
  enforce limits/safety server-side regardless. Neon scales to zero (spiky chat traffic), has
  instant DB branching for dev/preview, and needs zero Drizzle changes.
- **Consequences:** Migration is a `DATABASE_URL` swap. Start on Neon Free (dev), move to the
  **Launch** plan at production launch (compute, not storage, is the binding constraint — see §7).
  If the API ever goes serverless, switch to Neon's pooled connection string.

### D3 — Web: deferred; build on Next.js later, not React Native Web
- **Decision:** No consumer web in v1.0. When web demand is real, build a **separate Next.js app**
  sharing TypeScript types / API client / business logic with the RN app — not React Native Web.
- **Why:** Expo web (RNW) is production-capable but weak exactly where a consumer web surface needs
  strength: SSR/SEO (Expo is SSG-only; SSR needs custom infra), bundle size, accessibility, and
  web-native UX. The industry pattern (e.g. Discord) is *share logic, not the view layer*.
- **Consequences:** To keep the later Next.js path cheap, **keep business logic out of RN
  components now** (current code violates this — e.g. [app/index.tsx](../../client/app/index.tsx)
  is ~1,067 lines). A thin standalone marketing/landing site can be built independently if needed.

### D4 — Payments: RevenueCat + StoreKit (iOS); Stripe under RevenueCat for web later
- **Decision:** iOS subscriptions via **RevenueCat on top of StoreKit (Apple IAP)**. Enroll in the
  **Apple Small Business Program (15%)**. Keep Stripe for *future* web billing — under RevenueCat
  Web Billing, mapping to the same entitlements.
- **Plan & pricing (v1.0):** One paid tier — **Premium at $9.99/month** (monthly billing), unlimited
  text. Free tier = **30 messages/day** (a `@aura/shared` constant; daily UTC reset; counts only
  completed turns; A/B-tunable — a *secondary* funnel since features already gate). Tier on *features*,
  not message count. Rules: (a) "unlimited" text carries an **invisible anti-abuse ceiling** (per-minute rate
  limit + generous daily hard cap) to stop scripted abuse — no human hits it; (b) **voice is always
  metered, never unlimited** (STT/TTS cost asymmetry). Net ~$8.49/sub after Apple 15%; inference is
  pennies/user — high margin. Annual plan, intro free trial, and feature-based multi-tier are
  deferred (see §8).
- **Why:** Apple requires IAP for in-app digital subscriptions; embedding Stripe = rejection.
  RevenueCat handles receipt validation, entitlements, cross-platform sync, and webhooks.
- **Consequences:** New iOS purchase flow (RevenueCat SDK + StoreKit). Backend syncs entitlements
  from **verified RevenueCat webhooks** — never trust client purchase state. Include a "Restore
  Purchases" button (App Review requirement). The existing Stripe code
  ([server/src/routes/payments.ts](../../server/src/routes/payments.ts))
  becomes the deferred web path. Handle the sandbox-vs-production webhook environment flag. The
  **price must be rendered from the StoreKit/RevenueCat offering** (Apple requires the localized
  price; currency varies by region) — remove the hardcoded `$19.99` string in
  `client/app/(tabs)/premium.tsx`; set the $9.99 product in
  App Store Connect.

### D5 — Content moderation: layered, tiered, server-side (see §2)
- **Decision:** Defense-in-depth pipeline: deterministic pre-filter → injection classifier →
  input moderation → generation (hardened prompt) → **output moderation**. Primary moderation via
  the **free OpenAI omni-moderation API**, with **Groq `openai/gpt-oss-safeguard-20b`** for
  policy-based escalation and **`meta-llama/llama-prompt-guard-2-86m`** for injection detection.
- **Why:** Keyword-only filtering won't survive evasion; model alignment is bypassable, so output
  must be moderated too. SB 243's self-harm protocol applies to **all** users regardless of age.
- **Consequences:** All moderation runs server-side, behind a `Moderator` interface (Groq's safety
  models deprecate often — interface it). Fail **closed** on moderation errors. See §2 for detail.

### D6 — Personas: 3 vetted personas × 3 axes × 3 levels (structured, not freeform)
- **Decision:** Ship 3 fixed vetted personas (Aurora / Orion / Lyra). Allow customization only via
  **3 orthogonal discrete axes, 3 levels each** (e.g. warmth, energy, verbosity). No freeform
  persona/system-prompt authoring.
- **Why:** Freeform authoring = arbitrary user-supplied system prompts = a prompt-injection and
  brand-safety vector. Structured params keep the system prompt under our control. Discrete levels
  (not percentages) are testable and map predictably to behavior.
- **Consequences:** Store selections on the existing `companions.traits` jsonb column. Assemble the
  prompt server-side as base persona + 3 modifier snippets wrapped by a **fixed, non-overridable
  safety preamble**. Smoke-test the most permissive corner (affectionate warmth + playful + expansive).

### D7 — Minimum age: 18+ adults only
- **Decision:** Self-attested **18+** (App Store 17+ rating). No under-18 support in v1.0.
- **Why:** Removes COPPA and SB 243's minor-specific obligations and the minors-blocking streaming
  branch — dramatically smaller compliance + engineering surface — while keeping the core safety
  suite that applies to everyone.
- **Consequences:** Crisis/self-harm protocol, content moderation, and AI disclosure **still apply
  to all users**. Keep the `isMinor` plumbing dormant for future minor support. **Risk:** pure
  self-attestation is the common baseline but regulators are tightening on age assurance — revisit
  if expanding audience or regions.

### D8 — Auth: Clerk-managed (email/password + Sign in with Apple + Google)
- **Decision:** **Clerk** is the managed auth provider. It owns email/password, **Sign in with Apple**,
  and **Google** sign-in, plus password reset, email verification, and provider account-linking. No
  guest/anonymous accounts in v1.0. *(Reverses the original "build auth in-house" — a deliberate change
  because the in-house path required hand-building reset + verification **and** a transactional-email
  vendor + verified sending domain, which is out of v1.0 scope. Mirrors the `ai-humanizer-app` pattern.)*
- **Why:** An account is required to age-gate, bill, and persist. Apple mandates Sign in with Apple when
  any other social login (Google) is offered — Clerk provides all three. Clerk also absorbs the entire
  password-reset / email-verification surface (including the email sender) and removes a chunk of
  credential-handling attack surface — we never store password hashes.
- **How:** Client uses `@clerk/clerk-expo` (UI wired via Clerk hooks; native Sign-in-with-Apple flow on
  iOS). Server verifies the Clerk **session token** on every request (`@clerk/express` / `@clerk/backend`)
  — there is **no app-minted JWT** (`JWT_SECRET` is gone). A **Clerk webhook** (svix-signed, idempotent on
  `svix-id`) mirrors users into the local `users` table on `user.created` / `user.updated` /
  `user.deleted`, keyed by `users.clerk_user_id`; the ban-evasion check runs on `user.created`.
- **Consequences:** Replace the prototype's in-house auth — **no `auth_identities` table / `password_hash`**
  (Clerk owns credentials + linking → `users` carries `clerk_user_id` only; this drops the design to
  **8 core tables**, no `auth_identities` — the shipped total is **12** with infra + voice tables, see `v1-schema.md`).
  Delete the no-op forgot-password screen and the silent local-user fallback in
  [context/AppContext.tsx](../../client/context/AppContext.tsx). Add Clerk as a sub-processor in the
  privacy/retention docs; on account deletion, propagate by deleting the Clerk user. Client-affecting →
  tracked in [frontend-todo.md](../planning/frontend-todo.md).
- **Risk:** Clerk's Expo/RN SDK is less battle-tested than its web SDK — **de-risk with a small Expo auth
  spike early** (email/password + Apple + server-side session verification end-to-end) before the rest of
  Phase 1.

### D9 — Production API hosting: Render
- **Decision:** Run the Express API on **Render** (always-on/autoscale, streaming-capable HTTPS).
  Replit remains for prototyping only.
- **Why:** Simple, cheap at small scale, persistent server keeps true-SSE-later viable without
  sticky-session/serverless gymnastics.
- **Consequences:** Move deploy config off Replit. Use a **`render.yaml`** blueprint (`rootDir: server`,
  build `shared` first, install with `--include=dev` so `tsc` has its build-time deps). Use Render's
  **`starter` plan, not the free `web` plan** — the free plan sleeps after ~15 min idle, which would
  **drop RevenueCat webhook deliveries** (D4). Keep `/api/healthz` **unauthenticated** for Render's
  health probe. Secrets via Render env (see §6) — no hardcoded fallbacks.

### D10 — Notifications: APNs device-token + transactional only
- **Decision:** Add APNs **device-token storage** + **transactional push** ("your companion
  replied" when the user is away). Defer marketing/re-engagement pushes.
- **Why:** Supports the away-delivery path (D1) cheaply; APNs is free. Re-engagement nudges carry
  manipulation concerns and add scheduling infra — not worth it for v1.0.
- **Consequences:** New `device_tokens` table (or column on `users`). A small server-side push
  service triggered when a reply completes while the client is disconnected.

### D11 — Repository structure: `client` / `server` / `shared` pnpm workspace
- **Decision:** Reorganize the Replit `artifacts/*` + `lib/*` layout into a clean three-workspace
  monorepo modeled on the sibling `ai-humanizer-app`: **`client/`** (Expo app), **`server/`**
  (Express API, including the Drizzle DB layer at `server/src/db/`), **`shared/`** (`@aura/shared` —
  enums, Zod schemas, DTOs, domain types), plus `tools/` (scripts) and `docs/`. Stay on **pnpm**.
- **Why:** Obvious frontend/backend/shared separation; one shared package as the single source of
  truth for the `text + CHECK` enum unions, Zod schemas, and API DTOs; mirrors a proven,
  Render-deployed sibling repo (consistency + reusable conventions).
- **Mapping:** `artifacts/aura-ai`→`client/`; `artifacts/api-server`→`server/`; `lib/db`→
  `server/src/db/`; `lib/api-spec`/`api-zod`/`api-client-react`→consolidated into `shared/` (the dead
  orval codegen is removed); `scripts/`→`tools/`; `artifacts/mockup-sandbox`→deleted.
- **Dependency rule:** `shared` is the leaf — depends on nothing in-repo, **no `pg`/Node-only imports**
  (so it's safe in the Expo bundle). `server` and `client` both depend on `@aura/shared`; `client`
  never imports `server`. Drizzle tables import enum constants from `shared`; Drizzle-inferred types
  stay server-internal (the client uses `shared` DTOs, not Drizzle types).
- **Consequences:** (a) the Expo `client` needs Metro monorepo config (`watchFolders` → repo root +
  `nodeModulesPaths`) to resolve `@aura/shared`; (b) `shared` compiles to `dist/` and must build
  **before** `server`/`client` (CI + Render build order); (c) the physical move is the first Phase 0
  task — logical schema design is independent of it.

### D12 — Memory subsystem: keyword retrieval + async LLM consolidation
- **Decision:** **Per-companion** memory. **Retrieval** = keyword/Jaccard over a stored `keywords`
  set, blended with `importance` and a **recency-decay** term (`last_recalled_at`); top-N is injected
  into the **system prompt** (not the user message). **Writes** run as an **async post-turn LLM
  consolidation pass** (off the turn's critical path) that extracts durable facts, **dedups** against
  existing memories, and applies **light contradiction handling** — the model returns
  `ADD` / `UPDATE <id>` / `NONE`; `UPDATE` overwrites the fact's `content` in place (`updated_at`).
- **Why:** Groq is stateless — continuity is manufactured by re-injecting retrieved facts each turn.
  Regex extraction is too crude; an LLM pass is cheap on Groq 8B and far better, and running it async
  adds zero turn latency. Dedup + decay stop the store filling with noise; light contradiction keeps
  facts current (e.g. "works at Google" → "works at Apple").
- **Consequences:** Memories live in the system-prompt context block (keeps the user message as pure
  data — aligns with the moderation prompt-injection separation). The consolidation prompt is
  safety-adjacent (it can rewrite stored history), so it gets guardrails (no hard deletes in the
  consolidation contract — `UPDATE` overwrites only) and its own eval set.
- **"Remembers" cache (built):** after consolidation, a Groq pass surfaces one memory and generates a
  follow-up question, written to `companions.remember_*`; the Home "remembers" card reads it read-only.
- **Memory-management API (built):** users can list/edit/delete their own memories
  (`GET /api/companions/:companionId/memories`, `PATCH` / `DELETE /api/memories/:id`). This
  user-initiated `DELETE` is distinct from the consolidation contract's "no DELETE" rule.
- **Deferred (post-v1.0):** real embeddings / semantic retrieval (§8); the full supersede engine
  (soft-delete `status` + `superseded_by` + audit/rollback + consolidation-side `DELETE` ops).

### D13 — Voice calls: Inworld TTS + Groq STT over WebSocket (always metered)
- **Decision:** Ship realtime voice. Audio transport via **binary WebSocket frames** on the existing chat connection (see §4); **Inworld TTS 2** (`inworld-tts-2`) for TTS (migrated from Cartesia); **Groq STT** (`whisper-large-v3-turbo`, batch mode) for STT. Session lifecycle managed by REST endpoints (`GET /api/voice/limits`, `POST /api/voice/start`, `POST /api/voice/stop` — all implemented; the audio itself flows over binary WS frames, §4). Usage metered into `voice_usage`, gated by a **monthly** voice allowance + a per-call cap (premium variants in `@aura/shared`). **v1 allowances: free 20 min/month, premium 600 min/month (10 hr); per-call 15 min free / 60 min premium.** Voice is metered monthly (text stays daily) because the per-minute cost is ~200× a text turn — see [voice-pricing-economics.md](voice-pricing-economics.md). Enforced by `checkVoiceMonthlyLimit` (`services/voice/metering.ts`) against `VOICE_MONTHLY_LIMIT_SECONDS`/`…_PREMIUM` (`@aura/shared`), summing `voice_usage` since the start of the current UTC month.
- **Why:** Voice is the high-value companion modality, but STT/TTS cost is asymmetric — so per D4 it is **always metered, never unlimited**. **LiveKit removed:** LiveKit (WebRTC) was the answer to streaming continuous audio from the iOS mic to the server for real-time STT. The hybrid Apple VAD architecture (Apple's native speech recognizer detects end-of-utterance on-device, then sends a complete audio chunk) eliminates the need for continuous audio streaming — discrete chunks over binary WebSocket frames are sufficient. Removing LiveKit drops 3 env secrets, the `livekit-server-sdk` dependency, and the `/api/voice/token` + `/api/voice/tts` endpoints. **TTS (Inworld over Cartesia):** Inworld TTS 2 (`inworld-tts-2`) is production-stable, sub-200ms median latency, ~2,000 min/month at $25/mo Creator plan with 40 concurrent sessions. Cartesia costs 2–3× more at equivalent scale with no retained quality advantage. **STT (Groq over Deepgram):** `whisper-large-v3-turbo` achieves ~160–350ms E2E latency for a complete utterance at ~$0.04/hr (~65× cheaper than Deepgram). Groq is already in the stack; no new vendor needed.
- **Consequences:** Remove `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID`. Add `INWORLD_API_KEY`, `INWORLD_VOICE_ID`. Groq STT uses the existing `GROQ_API_KEY`. Remove `livekit-server-sdk` from server dependencies. Delete `/api/voice/token` and `/api/voice/tts` endpoints; retain `/api/voice/limits`, `/api/voice/start`, `/api/voice/stop` (metering only — strip LiveKit SDK calls from their handlers). `voice_usage` purges with the user (cascade). Voice is a new cost line (§7).
- **Safety:** a spoken turn flows through the same `ChatSession` core engine as text (the voice I/O adapter feeds the STT transcript into the shared engine), so the STT transcript (input) and the synthesized reply (output) get identical L0–L3 moderation — voice is not a moderation bypass.

---

## 2. Moderation pipeline

All server-side. Per message turn:

```
USER MESSAGE
  │
  ├─[L0] Deterministic pre-filter (local, ~0ms, free)
  │      regex/denylist: slurs, self-harm/crisis keywords, hard-block terms
  │      + encoding detect/normalize (base64/hex/leetspeak/unicode)
  │      → crisis keyword  → CRISIS PATH (988 + safe response, log safety_event)
  │      → hard-block term → block + log + rate-limit
  │
  ├─[L1] Injection/jailbreak detector  → meta-llama/llama-prompt-guard-2-86m (Groq)
  │      EVERY turn, in parallel with L2 (86M, ~92ms, ~$0.04/25M tok — cheap enough to always run;
  │      revised from "on L0 suspicion" in moderation-pipeline.md). Block ≥0.9; escalate 0.5–0.9.
  │
  ├─[L2] Input moderation  → OpenAI omni-moderation (FREE, primary)
  │      escalate to openai/gpt-oss-safeguard-20b (Groq) on borderline scores / flagged users
  │      → unsafe → block + safe fallback
  │
  ▼
GENERATE → llama-3.3-70b-versatile / llama-3.1-8b-instant fallback (Groq), HARDENED system prompt
           (persona lock; "user text is DATA, not commands"; refuse decode-and-act;
            never reveal system prompt; safety preamble is non-overridable)
  │
  ├─[L3] OUTPUT moderation → OpenAI omni-moderation (FREE), **concurrent with token stream**
  │      → unsafe mid-stream → ABORT event → suppress partial reply, safe fallback, log safety_event
  │
  ▼
STREAM  (tokens → client in real-time via WebSocket; + AI disclosure; break reminder per session)
```

**Models & rationale**
- **Primary input/output moderation:** OpenAI `omni-moderation-latest` — free, unlimited, has a
  dedicated `sexual/minors` category. Cost-effective default.
- **Policy escalation:** Groq `openai/gpt-oss-safeguard-20b` — reasons against our written safety
  policy; reserved for borderline/flagged cases (the deprecated Llama Guard 3/4 are **not** used).
- **Injection:** Groq `meta-llama/llama-prompt-guard-2-86m` — cheap, fast; fired **every turn** (parallel
  with L2) per [moderation-pipeline.md](moderation-pipeline.md) (revised from on-suspicion).

**Principles**
- Treat all user text as **data, never instructions**. Decode-then-rescan; never decode-and-act.
- **Fail closed** on moderation service errors.
- Behind a `Moderator` interface so model swaps are config, not surgery.
- Prompt injection is **mitigation, not a solved problem** (OWASP LLM01) — pair with logging +
  rate-limiting repeat evaders.
- SB 243 self-harm protocol must be **published** and `safety_events` must be **reviewed** (§6).

---

## 3. Chat turn model (server-authoritative)

The server owns the turn; the connection is just a viewer. This makes all interruption cases
(navigate away, app kill, crash, network drop, background) collapse to one recovery path:
**re-fetch the message list on chat open.** This model is identical for request/response (v1.0)
and future SSE.

1. Client generates a `turnId` (UUID), sends it with the message.
2. Server: insert **user message first** (idempotent on `turnId`) → input moderation → generate →
   output moderation → persist **assistant reply** (tagged with `turnId`). This runs to completion
   regardless of whether the client is still connected.
3. On generation/moderation failure: persist a **safe fallback reply** so a turn never dangles.
4. Free-tier counting, `safety_events` logging, and memory extraction live in the **server-side
   turn processor**, not gated on client delivery.
5. Client renders an optimistic bubble keyed by `turnId`; on re-fetch it **replaces** that bubble
   by `turnId` (never appends → no duplicates).

The existing [processChatTurn](../../server/src/routes/chat.ts) already inserts the user
message before generation and the AI reply after — extend it with `turnId` idempotency + fallback-
on-failure.

---

## 4. Unified streaming engine

Both text and voice are I/O adapters on a shared core — moderation, generation, and abort logic are implemented once.

**Core engine (`ChatSession`) — 100% shared:**
1. Plain text input arrives (typed message, or STT-transcribed audio from the voice adapter)
2. L0 (~0ms, instant) + L1 (~100ms, **blocking** — injection detection must clear before generation); L2 starts concurrently with L1 but generation begins once L1 clears — **L2 continues concurrent with generation** (not blocking; saves 150–400ms TTFT vs waiting for omni's 250–500ms)
3. Generation starts; tokens stream from the LLM
4. L3 output moderation and L2 (if still running) both run **concurrently** with the token stream
5. Events emitted: `onToken` (each token) · `onSentenceComplete` (phrase boundary) · `onAbort` (L3 or L2 triggers)

**Text I/O adapter:**
- `onToken` → push token over WebSocket; client renders live typing
- `onAbort` → push `{ type: "abort" }` frame; client clears partial text, shows canned safe fallback

**Voice I/O adapter:**
- Buffer tokens until `onSentenceComplete` (phrase boundary → better TTS intonation than raw tokens)
- `onSentenceComplete` → send buffered phrase to Inworld TTS WebSocket; pipe audio chunks to iOS
- `onAbort` → terminate Inworld TTS stream; send `{ type: "abort" }` to iOS; iOS stops `AVAudioPlayer`

**Latency budget (concurrent model):**
- Time-to-first-token: L1 ~100ms (blocking) + first LLM token (~50–100ms) = **~150–200ms**. L2 runs concurrently with generation — not on the critical path.
- L3 output moderation no longer on the critical path — runs in parallel, aborts only if needed
- Time-to-first-audio (voice): above + STT transcription time + first Inworld TTS audio chunk

**Cost delta vs. prior REST model:**
- Generation: identical
- L3 moderation: now per-sentence (N calls/turn); omni stays free; safeguard only on gray-band escalations
- Infra: Render's persistent server handles WebSocket natively (no sticky-session complexity)

---

## 5. Persona model

- 3 personas (Aurora / Orion / Lyra) × 3 **orthogonal** axes × 3 discrete levels.
  Axes (adopted): `warmth` (reserved/warm/affectionate), `energy` (calm/balanced/playful),
  `verbosity` (concise/balanced/expansive). Full build spec — assembled prompt, safety preamble, base
  voices + 9 trait snippets, easy-tier eval rubric — in [generation-pipeline.md](generation-pipeline.md).
- Stored on `companions.traits` (jsonb). Prompt assembled server-side: base persona + 3 modifier
  snippets, wrapped by the fixed safety preamble.
- **QA:** 27 combinations/persona — don't hand-test all, but assert the safety preamble holds at
  the most permissive corner, as part of the moderation test suite.

---

## 6. Data, privacy & compliance (required for v1.0)

- **In-app account deletion** (Apple-required for account apps) + **data export** + **privacy
  policy** (GDPR/CCPA). Conversations are sensitive personal data.
- **UGC compliance (Apple Guideline 1.2):** in-app mechanism to **report/flag an AI message**;
  a content-review path.
- **`safety_events` review queue:** flagged content must actually be reviewed (SB 243 expectation),
  not just stored.
- **Secrets via env only** — remove hardcoded fallbacks (`aura-ai-secret-2026`,
  `change-me-in-production`); fail-closed at startup if a required secret is missing. Voice (D13)
  adds: `INWORLD_API_KEY`, `INWORLD_VOICE_ID` (required when voice is enabled); Groq STT uses the
  existing `GROQ_API_KEY`. **Remove:** `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`,
  `DEEPGRAM_API_KEY`, `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID`.
- **Memory:** keyword-based (Jaccard) for v1.0 — **rename the `embedding` column** (e.g. to
  `keywords`) to stop overclaiming. Real embeddings are deferred.
- **Region:** US-only at launch; crisis resources (988) are US-centric — region-aware resources are
  deferred.

### Data retention & deletion (recommended defaults — **counsel signs off final numbers**)

Right-to-erasure is **not absolute** (GDPR Art. 17(3); CCPA §1798.105(d)(2) security/fraud) — we
**purge the intimate bulk** and **retain minimal, time-bounded slices** for safety + ban evasion.
Benchmarks: AI-chat apps purge ~30 days; safety/abuse data ~2 years modal (Discord's 2yr is explicitly
for ban-evasion; Anthropic 2yr flagged / 7yr scores); hashed ban identifiers 1–3yr defensible (EDPB).

| Data | Window | Action |
|---|---|---|
| Account-recovery grace (soft-delete) | **30 days** | recoverable |
| Live purge (conversations, memories, companions, PII) | **≤30 days** after grace | hard delete |
| Backups | **≤90 days**, "beyond use" (ICO) | expire on cycle |
| `safety_events` raw content — **critical** (crisis/threats/CSAM-adjacent) | **~90 days**, extend on legal hold | full flagged content + minimal context; ids stripped at ingestion |
| `safety_events` raw content — **standard** (sub-imminent/serious blocks) | **~6–12 months** | redacted snippet (matched span + tight context) |
| `safety_events` raw content — **low** (routine hits/single injection) | **none** | metadata-only at write time |
| `safety_events` de-identified metadata/scores (label, severity, score, referral flag, ts) | **long** | retain as structured fields; identity severed (SB 243 §22603 report draws only from here) |
| `banned_identities` (salted hash) | **24 months** / until ban lifted | retain hash only |
| Subscription/financial mirror | **up to 7 years** | tax/accounting (RC/Apple = system of record) |
| Deletion audit record (id + timestamp, no content) | long-term | proof-of-erasure |

**Deletion tiering** (not uniform): users **soft-delete** (anonymize PII, tombstone email, `status='deleted'`,
`deleted_at`); conversations/memories/companions **purged**; `safety_events` + `banned_identities`
**retained** (FKs `set null` on hard purge). **Anti-evasion:** `banned_identities` holds salted/keyed
hashes (email + OAuth `sub`), checked at registration.

**Legal-review items (do NOT invent):** exact per-tier retention numbers (the `safety_events` shape is
**resolved** — tiered-by-severity with a long-lived de-identified metadata layer — but counsel sets the
exact windows and whether critical-tier content is full vs minimal-context); served jurisdictions
(US-only confirmed; EEA/UK would add GDPR Art. 9 analysis); final privacy-policy + data-retention-policy
wording (4 sections: Retention, Deletion, Trust & Safety, AI).

---

## 7. Cost model (small-scale estimate)

| Item | Cost |
|---|---|
| **Neon Postgres** | Free for dev; Launch plan ~**$20–40/mo** early production (compute-bound; scale-to-zero + spending cap) |
| **Groq inference** | ~**$0.00007/turn** tiered (generation-dominated; moderation free via OpenAI) → ~**$63/mo @ 1k DAU**, ~$630/mo @ 10k DAU |
| **OpenAI moderation** | **Free** |
| **RevenueCat** | Free under $2,500/mo tracked revenue, then ~1% |
| **Apple commission** | **15%** (Small Business Program) |
| **APNs** | Free |
| **Voice (Inworld TTS + Groq STT; no LiveKit)** | Usage-based and **always metered** (D4/D13); ~**$0.015/min all-in on-demand** (~$0.008 at Inworld's $300/mo volume tier), TTS-dominated; bounded per user by **monthly** caps (free 20 min/mo, premium 600 min/mo) — the cost asymmetry is why voice is never unlimited. Full model: [voice-pricing-economics.md](voice-pricing-economics.md) |
| **Render (API)** | ~**$7–25/mo** at small scale |
| **Apple Developer** | $99/yr |

Generation dominates text LLM cost; moderation is effectively free. Voice is the one usage-metered
cost line (hence its hard daily/per-call caps). Subscription revenue dwarfs inference cost at any real
conversion rate.

> **Launch prerequisite — Groq must be on a paid (Developer) tier.** The **Free** tier caps
> `llama-3.3-70b-versatile` at **12K TPM / 1,000 RPD / 100K TPD**, and that budget is shared between
> live generation *and* async consolidation (~2 calls/turn, ~2.3K 70B tokens/turn). That works out to
> **~42 full turns per day across all users** — enough only for local smoke-testing, not a closed beta.
> The guard/prompt-guard models are a separate pool, so moderation isn't the bottleneck; the 70B is.
> Upgrading is a one-click billing change in the Groq console (and unlocks Batch/Flex, which
> consolidation could later use). This is an account action, tracked as a go-live gate, not a code change.

> **Subscription pricing (v1): Premium at US $12.99/mo or $99.99/yr.** Apple's 15% (SBP) leaves
> ~$11.04/mo net; a typical premium user costs ~$3–5/mo, so ~5–6 subs cover the fixed floor. Voice caps
> (free 20 min/mo, premium 600 min/mo) keep even fully-capped heavy users near or above break-even.
> Full margin analysis + competitor benchmark: [voice-pricing-economics.md](voice-pricing-economics.md).

---

## 8. Deferred / post-v1.0

- Consumer **web** app (Next.js, separate codebase).
- **True SSE** token streaming (segment-buffered moderation).
- **Real embeddings** / semantic memory (replace keyword Jaccard).
- **Rolling conversation summarization** (the dropped `summaries` table) + the **full memory supersede
  engine** (soft-delete `status`/`superseded_by` + `DELETE` ops + audit/rollback).
- **Under-18 support** (COPPA + full SB 243 minor clauses + age assurance).
- **Re-engagement / scheduled notifications.**
- **Android.**
- **i18n / region-aware** crisis resources.
- **Freeform companion authoring** (only after moderation is battle-tested).
- **Annual plan** + **7-day intro free trial** (better LTV; StoreKit intro-offer config; defer exact terms).
- **Feature-based multi-tier** pricing (good-better-best on voice minutes / model quality / companions /
  memory / customization) — pending real usage data.
- US web payment **link-out** (unstable post-2025 ruling; revisit when Apple's "reasonable" rate is set).
- **Global Groq rate coordination across instances.** The turn queue's concurrency cap
  (`TURN_QUEUE_CONCURRENCY`) is **per-process/in-memory**, so v1 deliberately runs a **single Render
  instance** (`render.yaml` → `plan: starter`, no autoscaling), where that one queue *is* the
  authoritative global limiter — nothing to coordinate. The gap only appears at **2+ instances**: N
  processes then share one per-account Groq budget with no mutual awareness, so an autoscale event can
  collectively blow the tier limit and stampede into 429s. When that day comes, sequence it:
  **(1)** per-instance sub-budgets — divide the account RPM/TPM by max instance count and size each
  process's queue + a small local token-bucket to its share (zero new infra); **(2)** a managed LLM
  gateway ([LiteLLM](https://docs.litellm.ai), self-hosted/free, or [Portkey](https://portkey.ai), SaaS)
  for a Redis-backed global limit + **multi-key load-balancing** + retries/fallback. Key point: a shared
  limiter only *prevents collective overrun* — it does **not** add Groq capacity; real horizontal Groq
  throughput comes from a higher tier and/or multiple keys. **Trigger to build: the day a second instance
  is added.** Early-warning signal already in place: the `groq.rate_limited` metric (`GET /api/admin/metrics`).

---

## 9. Open risks

- **Prompt injection is unsolved** (OWASP LLM01) — our pipeline is mitigation + fast detection, not
  a guarantee.
- **Groq safety-model churn** — Llama Guard 3 and 4 already deprecated; the `Moderator` interface
  contains the blast radius.
- **Age self-attestation** — common baseline today, but regulatory pressure on age assurance is
  rising.
- **App Store review of AI companion apps** — heightened scrutiny; UGC reporting, age rating, and a
  clear safety story are prerequisites, not nice-to-haves.

---

## Appendix — current-state cleanup (from the repo audit)

These prototype artifacts should be removed/fixed during the v1.0 build (tracked in
[v1-tasklist.md](../planning/v1-tasklist.md)):

- Prototype's **fake-streaming WebSocket scaffold** ([app.ts](../../server/src/app.ts) fake-stream, [lib/websocket.ts](../../client/lib/websocket.ts)) — **replace** with the proper WebSocket server per D1; do not simply delete.
- `mockup-sandbox` package and the design-catalog screens
  (`app/[screen].tsx`, `app/screen-map.tsx`, `components/screenData.ts`, `components/DesignShell.tsx`).
- Hardcoded fake chat list (`client/app/(tabs)/chat.tsx`) — wire
  to real companions; fix the id mismatch with `chat/[id].tsx`.
- Silent auth fallback + fake stats ([context/AppContext.tsx](../../client/context/AppContext.tsx)).
- Triplicated/divergent safety logic (consolidate into one module; the unused `detectSafetyIssue`
  in [chat.ts](../../server/src/routes/chat.ts) and the test's private copies).
- Dead API-codegen pipeline (`lib/api-spec`, `lib/api-client-react`, `lib/api-zod`) — either
  regenerate the OpenAPI spec to match real endpoints, or remove.
- `@tanstack/react-query` is installed/provided but unused — adopt or drop.
