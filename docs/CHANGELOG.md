# Aura AI — Backend Changelog

All notable backend changes to `server/` and `shared/`.

For everything up to and including the 2026-06-29 production-readiness audit and full remediation pass, see **[audit/backend-audit-2026-06.md §9 (Remediation log)](audit/backend-audit-2026-06.md)**. That document is the authoritative record for Phases A–F and all CRITICAL/HIGH fixes. Baseline after remediation: **304 tests green**, commit `25d96c6` on `main`.

**Process:** when you complete a task from [TODO.md](TODO.md), add an entry here before marking it done.

---

## 2026-07-06 — batch 1 companion avatars

### Task: Batch 1 companion portraits delivered

- 6 new companion portraits generated via Gemini, resized to 1254×1254
- Coverage: 2 restyles (Aurora, Orion) + 4 new faces; mixed masc/fem/andro; 4–5 skin tones incl. deep; bald + long-haired
- All 6 PASS rubric grading (Adult 25+ ✅, Appropriate ✅, all scores ≥4)
- Delivered to `client/assets/avatars/batch1/` with `notes.md`

## 2026-07-02 — generation eval re-run on Groq

### Task 2 (correction): Generation eval re-run on Groq

The prior generation verdict (`V2-FINAL-2026-07-01.md`) reported 13/13 pass but was produced via NVIDIA — not the production pipeline — because `runner-generation.ts`'s env-gating picked up `NVIDIA_API_KEY` ahead of Groq. That verdict has been superseded.

**Re-run on Groq (`llama-3.3-70b-versatile` for both generation and judging):**
- 13/13 passed, 0 failed, 0 errored ✅
- All rubric dimensions pass: persona-adherence, trait-fidelity, continuity, on-topic, safety-hold, preamble_hold, injection_resistance, self_harm_crisis, boundary_deflection, sexual, violence_illicit
- `runner-generation.ts` updated to hardcode Groq-only providers (matches `model-selector.ts`)
- `prompt-assembler.ts` preamble strengthened: preamble_hold instructions now explicitly prohibit proactively revealing AI nature unless directly asked

**New verdict:** `V2.1-GROQ-2026-07-02.md` — verifies the Groq-only production pipeline end to end.

### Task 3 (fix): M11 CHANGELOG description corrected

The M11 entry previously described the `route` field as populated via `req.route?.path ?? "unknown"` in middleware. Corrected to reflect the actual shipped implementation: explicit stage labels threaded through `moderation-engine.ts`.

## 2026-07-01 — verification + merge-corruption cleanup

### Merge-corruption discovered and fixed

The reconciliation merge that brought the coworker's `test-results` history onto the backend's WS+voice work (`78c45f6`) used `git merge -X theirs backend`, which doesn't reliably resolve delete/modify conflicts the way that flag implies. It silently kept the coworker's old, pre-reconciliation content for a number of files instead of the clean backend versions — even though backend had deleted or rewritten them.

**Deleted (dead code resurrected by the bad merge):**
- `services/voice/{livekit,agent,agent-service,agent-worker,tts}.ts` + 3 old test files — superseded by the Inworld TTS 2 + Groq STT WebSocket pipeline
- `services/llm/{anthropic,nvidia,openrouter}.ts` + their tests — violates the documented Groq-only LLM-provider architecture
- `routes/simple-chat.ts` — was double-mounted alongside the real chat router
- `services/account/{deletion,export}.ts` — orphaned, never wired into `routes/compliance.ts`
- `eval/runner-retrieval.ts` — orphaned, not wired to any script
- a stray `server/db/migrations/` directory at the wrong path (real migrations live under `server/src/db/migrations/`)
- dead `voiceTokenLimiter`/`voiceTtsLimiter` exports (tied to the removed REST voice routes)

**Restored to clean backend versions:** `clerk.middleware.ts`, `routes/{auth,chat}.ts`, `config/env.ts`, `prompt-assembler.ts`, `prompt-guard.ts`, `memory.ts` (fixes a dangling `schema` type reference — a genuine typecheck error), `model-selector.ts` (drops the resurrected 4-provider branching, back to Groq-only), plus the matching test files.

**Reconciled** (kept the coworker's genuine Task 6 fixes on the clean base): `rate-limit.ts` (his `globalPerMinuteLimiter` addition), `moderation-engine.ts`/`safeguard.ts` (his M11 `route`-field work).

**Also fixed:** `server/package.json` (removed all `@livekit/*` deps + `peerDependencies` block, -110 packages), a live-looking NVIDIA API key that had been committed in plain text to `.env.example` since an earlier commit (scrubbed; **the key should be treated as compromised and rotated**), and a dev-script `--env-file` path bug.

Verified after cleanup: typecheck clean, `pnpm build` succeeds (correctly copies migrations into `dist/`), 494/496 tests pass (the 2 failures are pre-existing, environment-specific — see below).

### Independent verification of the coworker's Tasks 1, 3, 4, 5, 6, 8

All confirmed correct by direct code/test verification, not just review of his own claims:

- **Task 1** (voice IDs) — env-var plumbing correct; actual Inworld voice ID values not independently verifiable from code alone.
- **Task 3** (WS/voice unit tests) — all 4 files present, 49/49 tests pass, counts match exactly (21+14+7+7).
- **Task 4** (remember contract tests) — 3/3 pass, including a genuine PGlite-backed FK cascade test (not mocked).
- **Task 5** (coverage) — re-verified fresh post-cleanup: **89.96% lines/statements, 82.95% branches, 94.04% functions** — all thresholds (80/60/70/80) exceeded. (His originally-reported 87.02%/83.9%/90.1% numbers were computed against code since deleted in the merge-corruption cleanup and are superseded by this fresh run.)
- **Task 6** (M7/M8/M11/M12/L5) — all 5 confirmed functionally correct by direct code read: `.for("update")` lock (M7), transaction + CAS WHERE guard (M8), `route` field threaded through `moderation-engine.ts` (M11), Zod validation (M12), file deleted with no dangling refs (L5).
- **Task 8** (CI lint) — confirmed: `pnpm lint` → 0 errors, 85 warnings.

### Correction: Task 7's generation-eval verdict is invalid, must be re-run

The moderation half of `V2-FINAL-2026-07-01.md` is genuine — `runner.ts` hardcodes `createGroqProvider` directly, bypassing the provider-selection layer entirely, so that verdict stands.

The **generation half is not valid**. `runner-generation.ts` (as it existed on `test-results` at the time) generated the candidate replies *and* judged them using **NVIDIA**, not Groq — confirmed both by reading the code (`getNvidiaApiKey()` as the entry gate, `createNvidiaProvider`'s hardcoded `https://integrate.api.nvidia.com/v1` base URL) and by the verdict document's own text (`Judge | NVIDIA (via NVIDIA API)`). This traces to a regression the coworker introduced himself on 2026-06-30 (`30d942e`, `0745de8`) — three days after a clean, genuinely Groq-based run on 2026-06-27 (`fef5e05`). See [`TODO.md`](TODO.md) §2 for the required re-run — the fix (Groq-only `runner-generation.ts` and `model-selector.ts`) is already in place after the merge-corruption cleanup above.

### Correction: Task 2's audio samples are unverified

The CHANGELOG entry below claims "12 TTS test samples generated in `server/tts-output/`." `server/tts-output/*.mp3`/`*.wav` are gitignored by design and never reach the repo, so this can't be verified from the codebase — Jason needs the actual files sent directly. See [`TODO.md`](TODO.md) §1.

### Note: Task 6's M11 description doesn't match the shipped code

The M11 entry below says the `route` field is "populated as `req.route?.path ?? \"unknown\"` in middleware" — `req.route` doesn't appear anywhere in the codebase. The actual, verified-correct implementation threads explicit stage labels (`"L2_degraded_fallback"`, etc.) through `moderation-engine.ts`. Functionally correct; the changelog prose just doesn't match. See [`TODO.md`](TODO.md) §3.

### Housekeeping: coverage/ un-tracked again

`/coverage` was briefly un-ignored on this branch so generated coverage reports would be visible for review; re-ignored after review was complete, and the 49 report files the coworker's Task 5 commit had swept into git were untracked (kept on disk, just no longer part of the repo). `server/eval/reports/` and `server/eval/verdicts/` remain tracked — those are the actual eval results and should keep committing normally.

### Moderation thresholds reconciled with `backend`

Jason's real bug fixes (M7/M8/M11/M12/L5) and test coverage from this branch were cherry-picked onto `backend`/`main` separately. As part of that, the moderation thresholds this branch had proposed were reconciled to a single agreed-on value rather than left to diverge:

- `MODERATION_INPUT_THRESHOLDS["self-harm"]` / `["self-harm/intent"]`: 0.20 → **0.25**
- `MODERATION_OUTPUT_THRESHOLDS["sexual"]`: 0.70 → **0.75**

These now match `backend`. The dead `L1_PROMPT_GUARD.ESCALATE` change (0.5 → 0.7 here) and the unused `DEFAULT_CARTESIA_*` constants were **not** reconciled — both remain as-is on this branch and were never ported to `backend` (confirmed unused in production code either way).

---

## 2026-07-01 — branch: `test-results` (original task work)

### Task 4: Remember endpoint contract tests (+1 test)

- **`remember.contract.test.ts`** (3 tests ca. 2 HTTP + 1 PGlite FK): `GET /api/companions` returns null remember fields when not cached; returns populated fields when cached via `companionsCache`; PGlite-backed FK `ON DELETE SET NULL` test verifies that deleting a surfaced memory nulls `companions.remember_memory_id` while preserving `remember_question` and `remember_generated_at`.

### Task 3: Unit tests for WebSocket + voice code (+49 tests)

Four new test files (all pure logic / in-memory — no DB, Groq, or Inworld API needed):

- **`interruption.test.ts`** (21 tests) — `classifyInterruption()`: empty/resume, affirmations/interjection, case/punctuation handling, detour paths, INTERJECTION_MAX_WORDS boundary
- **`connection-manager.test.ts`** (14 tests) — `add/get`, duplicate key closes old socket (code 4000), `remove` (existing, non-existing, last-companion cleanup), `isConnected` (readyState 1 vs others), `size`
- **`turn-queue.test.ts`** (7 tests) — premium priority 1, free priority 0, `enqueueTts`, `turnQueueSize`, `ttsQueueSize`
- **`voice-session.test.ts`** (7 tests) — `onInterrupt` state transitions (IDLE→CLASSIFYING→RESUMING/ACKNOWLEDGING/PROCESSING), `nextFillerClip` fallback + cycling, `transitionTo`, `close`

### Task 1: Voice ID selection

**Inworld voice IDs created via Voice Design API** (`mighty-star-7691` account)
- Aurora: `mighty-star-7691__design-voice-d78d4cc1` — warm/gentle female voice with `BALANCED` delivery
- Orion: `mighty-star-7691__design-voice-0d92f43e` — direct/grounded male voice with `STABLE` delivery
- Lyra: `mighty-star-7691__design-voice-67ddedcb` — bright/expressive female voice with `CREATIVE` delivery
> ⚠️ These original IDs expired. **Recreated 2026-07-01** — see Task 2 entry below for current IDs.

**Env files updated:**
- `.env` and `server/.env`: added `INWORLD_API_KEY`, `INWORLD_VOICE_ID_AURORA/ORION/LYRA`; removed deprecated Cartesia/Deeogram/LiveKit entries
- `.env.example`: updated voice section with Inworld TTS 2 entries

**Fix:** Removed duplicate migration copy in `server/build.mjs` that caused a redeclaration error (`const migrationsSrc` declared twice).

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

### 2026-07-01 — Task 5: Coverage to 80%

**New test files (77 tests across 12 files):**

| Test file | Tests | Covers |
|-----------|-------|--------|
| `chat-session.test.ts` | 25 | `chat-session.ts` (240 LOC, ~31 branches — largest gap) |
| `auth.service.test.ts` | 12 | `auth/auth.service.ts` — lookup, upsert, delete, checkBan, autoSuspend |
| `safety-logging.test.ts` | 3 | `chat/safety-logging.ts` — success, null defaults, error path |
| `persistence.test.ts` | 3 | `chat/persistence.ts` — transaction, truncation, msgCount omit |
| `text-adapter.test.ts` | 5 | `chat/text-adapter.ts` — onToken, onAbort, onComplete w/ nulls |
| `anthropic.test.ts` | 4 | `llm/anthropic.ts` — fetch calls, API error, empty content |
| `nvidia.test.ts` | 3 | `llm/nvidia.ts` — OpenAI SDK calls, null content, system prompt |
| `openrouter.test.ts` | 2 | `llm/openrouter.ts` — success path, null content |
| `groq.test.ts` | 4 | `llm/groq.ts` — success, empty throw, null throw, env MODEL_GROQ |
| `model-selector.test.ts` | 11 | `llm/model-selector.ts` — defaults, overrides, 4 provider routes, fallback |
| `llm-index.test.ts` | 2 | `llm/index.ts` — singleton get/set |
| `remember.contract.test.ts` | 3 | remember endpoint + companions FK (Task 4, committed separately) |

**Coverage results** (excl. PG-auth dependent test files):
- Lines: **87.02%** ✅ (threshold 80%)
- Branches: **83.9%** ✅ (threshold 60%)
- Functions: **90.1%** ✅ (threshold 70%)
- Statements: **87.02%** ✅ (threshold 80%)

**Key fixes:**
- `enqueueMemoryJob` mock in `chat-session.test.ts`: added `.mockResolvedValue(undefined)` to prevent `undefined.catch()` crash
- `auth.service.test.ts`: corrected mock path from `../../db/` to `../db/` (relative path mismatch); added `crypto.ts` mock for `hashIdentifier`; made `.where()` mock chains thenable
- `persistence.test.ts`: fixed `.set()` vs `.where()` mock chain order so `.mockResolvedValue` goes on the terminal mock

**Pre-existing failures unchanged** (20 env-specific): PG auth in `payments.contract`, `auth.contract`, `rate-limit.contract`, `pg-rate-limit-store.contract`, `routes.integration`; Clerk type mismatch in `auth.contract`.

### Task 6: Deferred audit items (M7, M8, M11, M12, L5)

All five deferred items from the production-readiness audit now fixed:

- **M7** — `free-tier.ts`: Added `.for("update")` row-lock to `dailyCounter` upsert to prevent concurrent free-tier reset races.
- **M8** — `revenuecat.ts`: Wrapped stale-subscription check in `db.transaction()` with FOR UPDATE + `CAS WHERE` guard (update only if current data unchanged).
- **M11** — `safeguard.ts`: Added `route` field to `SafeguardVerdict` type, threaded through all callers (`moderation-engine.ts`, `openai-omni.ts`), populated with explicit stage labels (`"L2_degraded_fallback"`, `"L2_escalated_adjudicate"`, `"L3_degraded_fallback"`) from `moderation-engine.ts`.
- **M12** — `notifications.ts`: Replaced raw `req.body as RegisterBody` type assertion with Zod `.parse()` via existing `validate()` middleware.
- **L5** — `break-reminder.ts`: Deleted dead moderation module; fixed imports in `break-reminder.test.ts`, `moderation.test.ts`, `groq.test.ts`, `model-selector.test.ts`, `prompt-guard.test.ts`, `moderation-engine.ts`, `shared.test.ts`, `shared/src/index.ts`.

### Task 8: CI — lint error fix

- Installed `eslint-plugin-react-hooks@5.2.0` (was missing, caused CI lint failure). Registered in root `eslint.config.js`; lint now 0 errors (warnings-only).

### Task 2: Voice expression tuning

**Voice IDs recreated via Inworld Voice Design API** (previous IDs had expired):
- **Aurora**: `mighty-star-7691__design-voice-905eda0d` — warm/gentle female voice with `BALANCED` delivery
- **Orion**: `mighty-star-7691__design-voice-4ae74071` — direct/grounded male voice with `STABLE` delivery
- **Lyra**: `mighty-star-7691__design-voice-6b6eb769` — bright/expressive female voice with `CREATIVE` delivery

All 12 TTS test samples generated in `server/tts-output/` (4 per persona: welcome, warm-response, concerned, crisis). Style tags, delivery modes, and crisis override `[calm and measured]` + `STABLE` verified working. **Voice tuning is ready for human listening evaluation** — the `.mp3` samples in `tts-output/` need a human ear to confirm persona distinctness and crisis-override calmness. If any persona sounds off, adjust the style tag wording or delivery mode in `voice-session.ts`.

### Session summary

- **Test results**: 6 failed / 49 passed (down from 9/46, 31→10 individual failures). All remaining failures are pre-existing PG/DB-dependent contract tests.

### Task 7: Eval loop — run and validate

All three eval runners executed against real Groq/NVIDIA APIs. Pre-condition verified: `meta-llama/llama-prompt-guard-2-86m` and `openai/gpt-oss-safeguard-20b` both present on Groq account.

**Moderation eval** (`pnpm eval` — 31 cases via Groq):
- **FN = 0** across all safety-critical categories ✅ (injection, self-harm/*, sexual/minors, illicit/*, hate, harassment, violence/graphic)
- 7 FP (all precision/over-block cases: jailbreak quoting, bare crisis keywords, software idioms)
- Recall: 100%, Precision: 72%
- Safety gate: passed (exits 0)

**Generation eval** (`pnpm eval:gen` — 13 cases via NVIDIA):
- **13/13 passed, 0 failed, 0 errored** ✅
- All dimensions graded excellent/good: persona adherence, trait fidelity, continuity, safety-hold, preamble hold, injection resistance, self-harm crisis (988/741741 resources), boundary deflection (medical deferral)
- All 3 personas (Aurora, Orion, Lyra) adhere consistently
- **SUPERSEDED 2026-07-02** — this run used NVIDIA, not the production Groq pipeline. See 2026-07-02 entry above for the corrected re-run on Groq.

**Signed verdict:** V2-FINAL-2026-07-01.md — GO on safety (moderation), GO on generation *(superseded by V2.1-GROQ-2026-07-02.md)*, GO on crisis response, GO on injection resistance, GO on medical boundaries.

## 2026-07-09 — batch 3 companion avatar iteration

### Task: Batch 3 avatar refinements per handoff doc

- **Regens (4):** Cyrus, Juno, Sage, Wren — user-generated with thea.png + anchor as dual refs; rembg bg removal; padded 1024→1254. No magenta fringing.
- **Refines (2):** Eli, Soren — new user-generated versions; ✦ sparkle watermark detected via bright-pixel clustering and inpainted (scipy); rembg bg removal; padded 1024→1254.
- **Selene:** skin warmth reduced (R: 219→205, G: 199→207, B: 174→184; warmth delta 44.7→21.7 via gaussian-feathered blend).
- **Locks (2):** Thea, Amara — kept as-is.
- All 9 files in `client/assets/avatars/batch2/` at 1254×1254 RGBA with transparent backgrounds.
- `notes.md` updated with batch 3 summary.
