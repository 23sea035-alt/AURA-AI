---
name: Aura AI backend architecture
description: How the Expo app connects to the Express API server with PostgreSQL, JWT auth, and offline fallback
---

> ⚠️ **This documents the Replit-Agent PROTOTYPE, which the v1.0 plan supersedes.** Treat `docs/`
> (start at [`docs/README.md`](../../docs/README.md)) as authoritative. Notably, the v1.0 build replaces
> this auth (JWT + bcrypt + `SESSION_SECRET`) with **Clerk-managed auth** ([D8](../../docs/specs/v1-architecture.md)),
> the "smart AI engine" response pools with real Groq generation, and the 50/day free tier with 30/day —
> among other changes. Use this only as a map of the *existing* code, not a build target.

## Stack
- API server: Express on port 8080 (externalPort 80), routes at `/api`
- Database: PostgreSQL via Drizzle ORM (`@workspace/db`)
- Auth: JWT via `jsonwebtoken`, passwords via `bcryptjs`, secret from `SESSION_SECRET` env
- App: Expo app calls API via `EXPO_PUBLIC_DOMAIN` env var → `https://${EXPO_PUBLIC_DOMAIN}/api`

## Key design decisions
- **Companion IDs are user-scoped**: `aurora-${userId}`, `orion-${userId}`, `lyra-${userId}` — prevents conflicts when multiple users register
- **API-first with AsyncStorage fallback**: AppContext tries the API, falls back to local storage if unreachable. Unauthenticated users get DEFAULT_COMPANIONS (ids: aurora/orion/lyra) which work offline
- **Smart AI engine**: No external AI API. Server-side intent detection + persona-based response pools (aurora=empathetic, orion=strategic, lyra=creative). Responses vary based on history length + message content hash
- **App API client**: `artifacts/aura-ai/lib/api.ts` — thin fetch wrapper with token from AsyncStorage, typed per endpoint
- **New AppContext methods**: `sendMessageToAPI(companionId, content)` → returns AI message or null (fallback), `loadMessagesFromAPI(companionId)` → syncs DB history to local state

**Why:** Free tier — no OpenAI integration available. Smart fallback ensures app always works even if API is down.

## Routes (PROTOTYPE-ONLY — superseded by the v1.0 surface below)
- `POST /api/auth/register` — creates user + seeds 3 default companions, returns JWT
- `POST /api/auth/login` — returns JWT
- `GET /api/auth/me` — returns profile from token
- `PUT /api/auth/me` — updates profile
- `GET /api/companions` — lists user's companions
- `POST /api/companions` — creates companion
- `PUT /api/companions/:id` — updates companion
- `GET /api/companions/:id/messages` — message history
- `POST /api/companions/:id/chat` — saves user msg + generates + saves AI reply

---

## As-built v1.0 (authoritative — this is what ships)

The sections above map the *prototype*. The current backend (Clerk auth, real Groq generation,
voice, memory management) supersedes them. Use this block for the v1.0 schema, routes, and workflow.

### Tables (12)
`users`, `companions`, `messages`, `memories`, `safety_events`, `subscriptions`, `device_tokens`,
`banned_identities`, `memory_jobs`, `voice_usage`, `rate_limits`, `deletion_audit`.

New fields beyond the prototype:
- `users.avatar_color` — curated profile-avatar color (null = client default).
- `users.primary_companion_id` — companion pinned to Home; FK `set null` if that companion is deleted.
- `companions.remember_memory_id` / `remember_question` / `remember_generated_at` — the resurfaced-memory
  ("remembers") cache populated by the Groq consolidation service. `remember_memory_id` is FK `set null`
  to `memories`.

### Routes (current)
- **Voice** (`/api/voice/*`): `GET /api/voice/limits`, `POST /api/voice/token`, `POST /api/voice/start`,
  `POST /api/voice/stop`, `POST /api/voice/tts`.
- **Memory management**: `GET /api/companions/:companionId/memories`, `PATCH /api/memories/:id`,
  `DELETE /api/memories/:id`.
- **Message report**: `POST /messages/:id/report` → writes a `safety_events` row.

### Voice subsystem
Real-time voice via **LiveKit** (transport) + **Cartesia** TTS + **Deepgram** STT. Usage is metered into
`voice_usage` (user/companion FKs cascade-delete; `direction` enum `stt|tts`, `duration_seconds`,
`model_id`). Env keys: `CARTESIA*`, `DEEPGRAM*`, `LIVEKIT*`.

### Migration workflow
Single squashed **`0000_init`** baseline. Workflow: edit the Drizzle TS schema → `drizzle-kit generate`
(drafts SQL; config `server/drizzle.config.ts`, generate-only) → review/commit → runtime `migrate()` on
boot applies it (advisory-locked). **`drizzle-kit push` is FORBIDDEN** (no history; drops SQL-only
objects). The Drizzle schema is the complete source of truth (all CHECKs/indexes/UNIQUEs modeled,
incl. `rate_limits` + `deletion_audit` as pgTables). Guarded dev re-baseline tool: `server/scripts/db-reset.mjs`.
