# Aura AI — Backend Changelog

All notable backend changes to `server/` and `shared/`.

For everything up to and including the 2026-06-29 production-readiness audit and full remediation pass, see **[audit/backend-audit-2026-06.md §9 (Remediation log)](audit/backend-audit-2026-06.md)**. That document is the authoritative record for Phases A–F and all CRITICAL/HIGH fixes. Baseline after remediation: **304 tests green**, commit `25d96c6` on `main`.

**Process:** when you complete a task from [TODO.md](TODO.md), add an entry here before marking it done.

---

## 2026-07-01 — branch: `test-results`

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
- **M11** — `safeguard.ts`: Added `route` field to `SafeguardVerdict` type, threaded through all callers (`moderation-engine.ts`, `openai-omni.ts`), populated as `req.route?.path ?? "unknown"` in middleware.
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

**Signed verdict:** V2-FINAL-2026-07-01.md — GO on safety (moderation), GO on generation, GO on crisis response, GO on injection resistance, GO on medical boundaries.
