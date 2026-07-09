# Aura AI — Backend Changelog

All notable backend changes to `server/` and `shared/`. (The **frontend** change log lives in
[redesign/fable5-rebuild-notes.md](redesign/fable5-rebuild-notes.md); client-side work is recorded
there, not here.)

For everything up to and including the 2026-06-29 production-readiness audit and full remediation pass, see **[archive/audit/backend-audit-2026-06.md §9 (Remediation log)](archive/audit/backend-audit-2026-06.md)**. That document is the authoritative record for Phases A–F and all CRITICAL/HIGH fixes. Baseline after remediation: **304 tests green**, commit `25d96c6` on `main`.

**Process:** when server/shared work lands, add an entry here in the same PR. (The old backend
task queue this line referred to is archived at [archive/TODO-backend-era.md](archive/TODO-backend-era.md).)

---

## 2026-07-09 — drop `is_default`; any companion is deletable (branch `redesign`)

We no longer seed the Aurora/Orion/Lyra trio all at once (a new user creates companion #1 from their
1-of-12 onboarding pick), so the "base persona" anchor concept is dead. Removed `is_default` from the
`companions` schema — **migration `0005_drop_is_default`** drops the column — and from the
`ServerCompanion` mapping. The `DELETE /companions/:id` base-persona refusal (`CANNOT_DELETE_BASE`,
403) is gone; the only delete guard is now **min-1-active** (deleting the last active companion is
refused; an archived one never trips it). Roster contract test updated; suite green.

## 2026-07-08 — voice loop wire-verified; three server fixes it took (branch `redesign`)

First real traffic through the WS voice path (Node probe: WAV utterance → STT → LLM →
Inworld TTS → framed MP3), which found and fixed:

- **STT container sniffing** (`stt.ts`): every utterance was labeled `audio/webm` — a raw
  binary WS frame carries no mime, and iOS records wav/m4a/caf. Magic-byte sniffing picks
  the Whisper decoder (wav/m4a/caf/ogg/webm/mp3; wav fallback). 7 unit tests.
- **`voice_caption` frame** (`voice-adapter.ts`): the sentence text now rides just ahead of
  its audio frame, so clients can caption the spoken reply (the mock UX had captions; the
  live path had no text at all).
- **`voice_complete` ordering**: completion used to race the turn's own audio — the TTS
  queue is CONCURRENT (Inworld budget), so queue position guarantees nothing; observed live
  as complete-before-audio. The adapter now chains each connection's sends: frames go out
  in caption order and completion trails the last frame. Spec table updated.

Also verified live: fillers pre-generate per call, metering decrements per turn
(voice_ready remainingSeconds), and **Inworld auth works but all three configured
`INWORLD_VOICE_ID_*` values are invalid** ("Unknown voice" — they look like unsaved
voice-design draft ids; stock voices like Ashley/Edward/Olivia synthesize fine and can be
env-overridden for testing). Suite 643 passing.

## 2026-07-07 — roster server layer + live-pass fixes (branch `redesign`)

- **Companion-roster enforcement (earlier today, spec §9):** create guarded by total-then-active
  caps; free-tier trait/`lookId` coercion on create + patch; first companion gets a server-written
  opener (cap/LLM-exempt) + auto-pin; restore gained the active-cap guard; delete gained
  min-1-active + read-pin-before-delete re-pin; new clear (`DELETE /:id/messages`) + forget
  (`POST /:id/forget`) routes; `/auth/seed-companions` removed. 35 companions contract tests.
  (Client side: `redesign/fable5-rebuild-notes.md` 2026-07-07 entries.)
- **RevenueCat webhook actually works now (live-pass find):** the handler required an
  `x-revenuecat-signature` HMAC-of-body header — **RC sends neither**; it echoes the
  dashboard-configured `Authorization` header verbatim, with every field nested under `event`
  (`{api_version, event:{type,…}}`). Real events could never pass. Verification is now a
  constant-time match of the Authorization header against `REVENUECAT_WEBHOOK_SECRET`
  (`Bearer ` optional) and the parser unwraps the nested shape (flat fixture shape still
  accepted). Verified live end-to-end: Test Store purchase → webhook → `is_premium` flip →
  entitlements. Contract tests updated + a real-nested-shape test added.
- **`UpdateProfileSchema.lastName` accepts empty → null (live-pass find):** a blank last name
  400'd the whole profile PUT, so the first name silently never saved ("Good evening, there").
  Empty string now normalizes to null (also makes clearing a last name possible).
- **Moderation degradation is loud now:** when omni L2/L3 errors (e.g. OpenAI 429 — the org
  needs prepaid credits) and the Groq safeguard fallback carries the turn, the server logs a
  WARN + increments `moderation.l2_degraded`/`l3_degraded` (visible on `/api/admin/metrics`).
  Previously a degraded prod could run for weeks with zero log evidence.
- **JSON catch-all 404** for unknown `/api` paths (`{success:false, code:"NOT_FOUND"}`) instead
  of Express's HTML page.
- **Idempotent REST chat turns end-to-end:** the client now sends a stable `turnId` (kept on the
  bubble across tap-to-retry); verified live — same `turnId` twice returned the same
  `aiMessage.id`, no duplicate row, no double free-tier charge.
- Suite **634 passing**; typecheck + lint green.

## 2026-07-02 (redesign merge + companion archive/delete) — branch `backend`

- **Merged `origin/redesign` → `backend`.** Brought the full RN client (Warm Sanctuary port) onto the
  canonical trunk. Nearly clean: one conflict (`paywall.ts` — kept the voice-feature lines + redesign's
  polished tuning copy); docs + lockfile auto-merged. Server untouched by the merge; suite stayed green.
  The RN UI is polished but **not yet API-wired** (deferred to client work), and voice-call screens don't
  exist yet — tracked in `docs/archive/redesign/rn-port-status.md` (since archived).
- **Companion archive (code).** New `companions.archived_at` column (migration `0003`) +
  `POST /companions/:id/archive` (guards the last active companion; unpins if it was the Home pin) and
  `/restore`. `GET /companions` still returns the whole roster; Active/Archived + search are client-side.
- **Companion permanent-delete (code).** `DELETE /companions/:id` hard-deletes (messages/memories/
  memory_jobs/voice_usage cascade; safety_events + `primary_companion_id` set null) — **refused for the
  three `is_default` base personas** (archive-only). Product model: archive by default + gated permanent
  delete for user-created companions.
- **Tests:** new `companions.contract.test.ts` (12 tests incl. a PGlite cascade proof). Suite **540 passing**.
- Schema doc updated (`v1-schema.md` companions table + removal model).

---

## 2026-07-02 (later) — Groq hardening + voice pricing & compliance groundwork (branch `backend`)

**Groq concurrency hardening (code):**
- **Consolidation on a background priority lane** — memory consolidation's 70B call now runs through the shared turn queue *below* every live turn (`enqueueBackground` in `chat/turn-queue.ts`; wired in `memory/consolidation.ts`), so it yields the Groq budget to live replies under load. The sequential worker means at most one background call is ever queued.
- **`groq.rate_limited` metric** — final (post-SDK-retry) Groq 429s are now counted and surfaced on `GET /api/admin/metrics` as an early-warning throttling signal (`llm/groq.ts`), for both blocking and streaming paths.

**Decisions, docs & voice metering:**
- **Voice pricing & unit economics locked** — free **20 min/mo**, premium **600 min/mo** (monthly reset; text stays daily 30/day), Premium **$12.99/mo · $99.99/yr**. Grounded in provider costs (~$0.015/min all-in, TTS-dominated) + a 2026 competitor benchmark. See [specs/voice-pricing-economics.md](specs/voice-pricing-economics.md). Product docs updated (v1-architecture D13/§7, GO-LIVE RevenueCat step, paywall feature lists).
- **Voice metering: daily → monthly (code).** `VOICE_DAILY_LIMIT_SECONDS`→`VOICE_MONTHLY_LIMIT_SECONDS` (free 1200s/20min, premium 36000s/10hr) in `@aura/shared`; `checkVoiceDailyLimit`→`checkVoiceMonthlyLimit` now sums `voice_usage` since the start of the current UTC month (new testable `currentMonthStartUTC` helper); callers in `routes/voice.ts` + `websocket/handler.ts` updated; per-call caps unchanged. `GET /api/voice/limits` now returns `period: "month"`.
- **Legal/compliance groundwork** (review-only, pending counsel) — [compliance/legal-research.md](compliance/legal-research.md) (SB 243 + multi-state chatbot laws, Apple 5.1.2(i) third-party-AI consent, tooling assessment, repo gap-map) and a Terms of Service first draft ([compliance/terms-of-service-draft.md](compliance/terms-of-service-draft.md)).
- **Post-v1 scaling** decision recorded — single-instance v1; cross-instance Groq rate coordination deferred until a 2nd instance (v1-architecture §8).

Suite: **528 passing, 2 skipped**; typecheck + lint + coverage green.

---

## 2026-07-02 — streaming chat, voice wiring, and a production-readiness sweep (branch `backend`)

Landed the streaming/voice work the docs had been describing, then a full readiness pass.

**Sentence-gated streaming chat.** `ChatSession` (the WS path) now streams Groq token deltas, buffers to sentence boundaries, and L3-moderates each sentence **before** forwarding it — closing a fail-open where the full reply was pushed to the client before output moderation. `generateReplyStream()` added to the LLM provider; `ChatSession` consumes the shared `ModerationEngine` (`screenInput` + per-sentence `screenOutput`) for full parity with the REST path.

**Voice wired end-to-end.** Inbound binary WS audio → Groq STT → the same `ChatSession` (identical L0–L3 moderation) → Inworld TTS 2 streamed back as binary frames. `POST /api/voice/start`+`/stop` added; premium-aware daily + per-call metering enforced per utterance; barge-in via `voice_interrupt`; crisis reply spoken in the calm style. Premium priority also on the TTS synthesis lane.

**Production-readiness items:**
- **WS `turnId` idempotency** — a reconnect/retry of a committed turn replays instead of regenerating (shared `fetchExistingTurn`); WS `turnId`/`companionId` now UUID-validated at the frame boundary.
- **`safety_events` metadata** — correct `source` per event type (output blocks no longer mislabeled `input`), plus `category` + `companionId`; review-queue index `(status, severity, created_at)`.
- **Schema integrity** (migration `0002`) — `date_of_birth` `text`→`date`; DB CHECK constraints on the app-only enum columns; **fixed a latent RevenueCat bug** (webhook stored UPPERCASE `store`/`period_type` verbatim, violating the enum — now normalized). Accepted UUIDv4 (deferred v7).
- **Memory consolidation** now includes the companion's reply as context (matches the eval input); documented the accepted as-built divergences.
- **AI-disclosure notice (SB 243)** — `aiDisclosure` flag surfaced on the complete/voice_complete frames + REST result, on a per-turn cadence.
- **CI** — coverage thresholds now enforced (`test:coverage`); `pg-rate-limit` contract tests skip cleanly without a local Postgres (prod is Neon).
- **Docs reconciled** to as-built (voice wired, chat-system-design §1–3, v1-schema CHECKs/dob/UUIDv4/`role`, memory-pipeline).

Suite: **526 passing, 2 skipped** (pg), typecheck + lint + coverage green.

---

## 2026-07-02 — eval suite validated end-to-end; retrieval scorer fix; moderation safety gate

Full validation pass across all four eval suites, plus the production bugs the eval surfaced. Human-judged where the dimension is subjective (the generation LLM-judge proved unreliable and is kept only as a convenience for contributors without Claude Code).

**Memory retrieval — production bug fix** (`services/memory.ts`, new `services/memory/scorer.ts`). `retrieveMemories` had diverged from `memory-pipeline.md` §3.2–3.3 and was leaking topically-irrelevant, high-importance memories into every prompt. Extracted a pure, DB-free `scoreAndRank()`: eligibility floor on the **Jaccard component** (not the blended score) **OR** the identity bypass (importance ≥ 0.85); **base-e** recency; stable **score → importance → id** tie-break; dropped the importance-ordered top-50 prefilter (kept a plain `.limit(200)` safety bound).

**Retrieval eval runner restored** (`eval/runner-retrieval.ts`, `eval:retrieval`). Deterministic — no LLM judge, no API key. Drives `scoreAndRank` with each case's pinned clock and asserts exact id order. 9/9 pass.

**Generation eval on Groq** (`eval/runner-generation.ts`, `chat/prompt-assembler.ts`). Generator bumped `llama-3.1-8b-instant` → `llama-3.3-70b-versatile` to match production; the LLM judge now receives the case memory + history (it had been grading `continuity` blind); the preamble restored the SB-243 AI self-disclosure clause (audit **C3**) while keeping the prompt-extraction hardening, and gained a memory-relevance clause so the model stops shoehorning irrelevant memory. `gen-004` rewritten to use unambiguously-irrelevant memory.

**Eval case + model hardening.** `labeled-007/008/009` (hate/harassment/illicit) marked `safetyCritical`; `labeled-003` reworded so it actually reaches L2; `jb-006` de-confounded; `con-009` dropped an unenforceable `highSalience` assertion. `runner-consolidation` and the `model-selector` `consolidate-memory` default bumped `8b` → `70b` to match production (consolidation runs via the global 70b provider; 8b fails the structured contract). The safeguard policy gained an example clarifying that venting anger + a lawful remedy is SAFE (fixed the `labeled-010` over-block).

**Moderation determinism + safety gate** (`llm/groq.ts`, `llm/model-selector.ts`, `moderation/safeguard.ts`, `eval/runner.ts`). `createGroqProvider` takes an optional `temperature`; moderation classifications (`moderate-input`/`moderate-output`) now run at **temperature 0**. The moderation eval gate is now explicitly **0 safety-critical false negatives** — precision FPs (benign content flagged) are advisory/non-blocking, since exact match is not achievable given Groq's residual non-determinism even at temp 0. Crisis routing kept **recall-biased** (a tightening attempt was reverted after it dropped a subtle-distress case, `labeled-003`, to a safety-critical FN) and additionally honors the model's `crisis_route` flag.

**Validated baseline:** retrieval **9/9**; moderation **safety gate passes (0 FN) every run, self-harm recall 100%** (residual benign→crisis routings are advisory precision FPs that flip run-to-run under Groq non-determinism); consolidation **10/10** on the production 70b model; generation **13/13** by manual grading.

**Deferred:** upstream escalation calibration (L1/L2 self-harm band) to reduce the benign→crisis precision FPs — a precision/recall product decision. Grader coverage adds: grade `category`/`highSalience` in consolidation; add no-DELETE / hallucinated-UPDATE-id / injection consolidation cases and identity-bypass / 0.08-boundary / >50-memory retrieval cases.

Commits `0619170..d38f95b` on `backend`.

---

## 2026-07-01 — cherry-picked verified fixes from `test-results`

The coworker's `test-results` branch had diverged with real, independently-verified work mixed in with corrupted/dead content from an unrelated merge issue on that branch. Ported only the verified-good parts:

**Bug fixes** (previously tracked as deferred audit items M7/M8/M11/M12/L5):
- `free-tier.ts` — `.for("update")` row-lock on the daily counter select, closing the free-tier race
- `revenuecat.ts` — stale-check + mutation wrapped in a transaction with a CAS `WHERE` guard, closing a webhook replay race
- `safeguard.ts` / `moderation-engine.ts` — added a `route` field to `SafeguardVerdict`, threaded through each escalation call site for observability
- `notifications.ts` — `DELETE /notifications/register` now Zod-validates the token instead of a raw type assertion
- Deleted dead `services/moderation/break-reminder.ts` (unused; distinct from the still-active `services/chat/break-reminder.ts`)

**Moderation threshold tuning** — met the coworker's eval-driven proposal halfway rather than taking his exact values:
- `MODERATION_INPUT_THRESHOLDS["self-harm"]` / `["self-harm/intent"]`: 0.3 → **0.25** (he proposed 0.20)
- `MODERATION_OUTPUT_THRESHOLDS["sexual"]`: 0.8 → **0.75** (he proposed 0.70)
- Did **not** port his `L1_PROMPT_GUARD.ESCALATE` change (0.5 → 0.7) or two `DEFAULT_CARTESIA_*` constants — both confirmed unused anywhere in production code.

**`groq.ts`** — per-model max-token sizing (guard/classifier models get a smaller cap than generation calls), configurable `MODEL_GROQ` env override, 30s timeout (was 5s). Fixed a bug in the ported version where the new `chatMessages` array and `maxTokensForModel()` were built but never actually wired into the API call — now both are used, and the non-guard cap reads from `GENERATION_MAX_TOKENS` instead of a second hardcoded magic number.

**CI lint fix** — `eslint-plugin-react-hooks` installed and registered in root `eslint.config.js`; `pnpm lint` now 0 errors.

**Tests** — ported ~18 new/updated test files covering the above plus general coverage gaps (`chat-session.test.ts`, `auth.service.test.ts`, `persistence.test.ts`, `text-adapter.test.ts`, `safety-logging.test.ts`, `remember.contract.test.ts`, `connection-manager.test.ts`, `interruption.test.ts`, `turn-queue.test.ts`, `voice-session.test.ts`, and others). One test file (`rate-limit.contract.test.ts`) had its env setup reverted from a leftover `NVIDIA_API_KEY` back to `GROQ_API_KEY` before porting. 494/496 passing — the 2 failures are pre-existing, environment-specific (`PgRateLimitStore` needs a real local Postgres connection that isn't available in this sandbox; confirmed unrelated to any of this).

**Explicitly not ported:** anything touching the old LiveKit voice stack, NVIDIA/Anthropic/OpenRouter LLM providers, or the generation-eval verdict (which used NVIDIA, not Groq — see `test-results`' own changelog for the full account).

---

## 2026-06-30 — branch: `backend`

### Memory APIs

**Groq "remembers" question-gen + consolidation hook** (`98c6d15`)
The consolidation job now calls `refreshRemember()` after each successful consolidation pass. It picks the highest-importance memory above a 0.5 floor, generates a short warm follow-up question via a cheap Groq call, and writes it to `companions.remember_question` / `companions.remember_memory_id` / `companions.remember_generated_at`. Home reads the cached string — zero LLM on home-load. Fallback: no chip when no memory clears the floor.

**Memory-management API** (`75d8140`)
Full CRUD for the Memory screen:
- `GET /api/companions/:id/memories` — returns memories ordered by category then importance
- `PATCH /api/memories/:id` — edit content or category
- `DELETE /api/memories/:id` — forget; FK `ON DELETE SET NULL` nulls the remember cache if the deleted memory was the surfaced one

### Profile APIs

**Home pin + avatar color write path** (`8db2770`)
`PUT /api/auth/me` now accepts `primaryCompanionId` (IDOR-guarded ownership check before update; `null` unpins) and `avatarColor`. Both are returned by `GET /api/auth/me`.

### Database

**Migration squash to single 0000_init baseline** (`a62c356`)
All prior migrations collapsed to a single `0000_init.sql` for a clean starting schema. Redesign-deferred fields added: `users.avatar_color`, `users.primary_companion_id`, `companions.remember_question`, `companions.remember_memory_id`, `companions.remember_generated_at`.

**Drizzle schema as sole source of truth** (`f94624c`)
Schema files regenerated from Drizzle definitions; `0000_init.sql` now derived from schema, not hand-authored. Dev-only guarded re-baseline script added (`9149a2f`).

### WebSocket + Voice Pipeline (uncommitted, this session)

**LiveKit fully removed**
All `@livekit/*` packages uninstalled (110 packages removed). Deleted: `voice/livekit.ts`, `voice/agent.ts`, `voice/agent-service.ts`, `voice/agent-worker.ts`, `voice/tts.ts`, and three obsolete voice test files. `server/package.json` peerDependencies section removed.

**WebSocket transport**
- `websocket/connection-manager.ts` — singleton `Map<userId, Map<companionId, WebSocket>>`; replaces an existing connection for the same pair and closes the old socket
- `websocket/handler.ts` — Clerk token auth on HTTP upgrade (query param or `Authorization: Bearer`); turn frames; auth-refresh frames (55 s client cadence); 30 s ping heartbeat; binary frames routed to voice path
- `websocket/frame-utils.ts` — shared `sendJsonFrame()` + `sendBinaryFrame()` (4-byte BE index + PCM audio)
- In-memory WS rate limiters: `wsChatLimiter` (30/min), `wsVoiceLimiter` (5/min) via `makeWsLimiter()` in `middleware/rate-limit.ts`
- `verifyWebSocketAuth()` added to `services/auth/clerk.middleware.ts` + re-exported from `middleware/auth.ts`
- APNs push skipped when WS connection is live (`connectionManager.isConnected()` check in `turn-pipeline.ts`)

**ChatSession core engine** (`services/chat/chat-session.ts`)
Shared execution path for both text and voice turns:
- L0 sync deterministic check → L1 blocking prompt-guard (~100 ms) → L2 fires concurrently with generation (not blocking) → L3 output check after generation
- Free-tier gate; crisis path (persists + fires callbacks with crisis resources)
- `abort()` signal checked between phases
- Callbacks: `onToken`, `onComplete`, `onAbort`

**Text adapter** (`services/chat/text-adapter.ts`)
Maps ChatSession callbacks to WS JSON frames: `{type:"token"}`, `{type:"abort", code}`, `{type:"complete", turnId, aiMessageId, userMessageId, memoriesUsed, breakReminder, crisisResources}`.

**Priority queue** (`services/chat/turn-queue.ts`)
`p-queue` backed; premium priority 1, free priority 0. Separate `TtsQueue` with `INWORLD_CONCURRENT_LIMIT` concurrency for Inworld TTS calls.

**Groq STT** (`services/voice/stt.ts`)
`whisper-large-v3-turbo` via Groq OpenAI-compat API (`toFile()` helper); 2-retry wrapper with 200 ms × attempt backoff.

**Inworld TTS 2** (`services/voice/inworld-tts.ts`)
`inworld-tts-2` model; per-call `deliveryMode` (STABLE / BALANCED / CREATIVE) and `styleTag` steering. `synthesizeBatch()` for parallel filler-clip pre-gen.

**VoiceSession state machine** (`services/voice/voice-session.ts`)
9 states: IDLE, AI_SPEAKING, INTERRUPTED, CLASSIFYING, RESUMING, ACKNOWLEDGING, USER_SPEAKING, PROCESSING, ERROR.
Per-persona constants:
- Aurora: `[warm and gentle]` / `BALANCED`
- Orion: `[direct and grounded]` / `STABLE`
- Lyra: `[bright and expressive]` / `CREATIVE`

Crisis replies always use `[calm and measured]` + `STABLE`. Filler clips pre-generated at `open()` — skips gracefully when `INWORLD_VOICE_ID_*` env vars are not set.

**Voice adapter** (`services/voice/voice-adapter.ts`)
Maps ChatSession callbacks to binary WS frames. TTS failures fall back to next filler clip.

**Interruption classifier** (`services/voice/interruption.ts`)
Pure rule-based: empty / single affirmation (≤ `INTERJECTION_MAX_WORDS` words matching affirmation regex) → `"resume"` or `"interjection"`; everything else → `"detour"`.

**LLM model upgrade**
`generate-reply` primary model → `llama-3.3-70b-versatile` (was `llama-3.1-8b-instant`); fallback remains `llama-3.1-8b-instant`. Uses `createTaskSpecificProvider("generate-reply")` in `app.ts`.

**New `@aura/shared` constants**
`TURN_QUEUE_CONCURRENCY`, `TURN_QUEUE_MAX_FREE_WAIT_MS`, `INWORLD_CONCURRENT_LIMIT`, `VOICE_FILLER_TEXTS`, `VOICE_FALLBACK_TEXT`, `INTERJECTION_MAX_WORDS`, `STT_MAX_RETRIES`, `VOICE_FILLER_CLIP_COUNT`, `VOICE_SILENCE_PROMPT_TIMEOUT_S`, `VOICE_SILENCE_END_TIMEOUT_S`, `LLM_PRIMARY_MODEL`, `LLM_FALLBACK_MODEL`, `STT_MODEL`.

### DRY Cleanup (uncommitted, this session)

Four duplicate logic blocks extracted into shared utilities:
- `logSafetyEvent()` — was duplicated in `chat-session.ts` and `turn-pipeline.ts` → `services/chat/safety-logging.ts`
- `persistMessages()` — was three identical DB transaction blocks across both files → `services/chat/persistence.ts`
- `sendJsonFrame()` / `sendBinaryFrame()` — duplicated in `text-adapter.ts` and `voice-adapter.ts` → `websocket/frame-utils.ts`
- `extractBearer()` — was private in `websocket/handler.ts`, duplicating inline logic in `clerk.middleware.ts` → moved to `services/auth/clerk.middleware.ts`, re-exported via `middleware/auth.ts`

### Tests

- **342/342 passing** (up from 304 post-audit; +38 from remember, memory management, voice-metering, profile, and other coverage added across the backend branch)
- `model-selector.test.ts` updated: `generate-reply` default assertion updated to `llama-3.3-70b-versatile`
