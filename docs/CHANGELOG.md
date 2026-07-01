# Aura AI — Backend Changelog

All notable backend changes to `server/` and `shared/`.

For everything up to and including the 2026-06-29 production-readiness audit and full remediation pass, see **[audit/backend-audit-2026-06.md §9 (Remediation log)](audit/backend-audit-2026-06.md)**. That document is the authoritative record for Phases A–F and all CRITICAL/HIGH fixes. Baseline after remediation: **304 tests green**, commit `25d96c6` on `main`.

**Process:** when you complete a task from [TODO.md](TODO.md), add an entry here before marking it done.

---

## 2026-07-01 — branch: `test-results`

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
