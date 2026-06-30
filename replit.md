# Aura AI — Companion Chat (Backend / Server)

> **Read [`docs/README.md`](docs/README.md) first.** Specs live in [`docs/specs/`](docs/specs/)
> ([v1-architecture](docs/specs/v1-architecture.md), [v1-schema](docs/specs/v1-schema.md)).
> **The backend audit is remediated and locked on `main`; remaining = the eval run, and voice has landed — see [`docs/planning/backend-fixlist-v1.md`](docs/planning/backend-fixlist-v1.md)**
> (follow it; don't rebuild), then the test/eval loop in [`docs/testing/testing-readiness-v1.md`](docs/testing/testing-readiness-v1.md).
> Those docs are the **plan of record** — follow them; don't relitigate decisions without a real reason.

## What this is

Aura AI — an iOS AI-companion chat app (**18+, US-first**). Users chat 1:1 with vetted AI personas
that remember facts across conversations; safety-first design; **$9.99/month** premium (free tier
**30 msgs/day**). The current code is a **Replit-Agent prototype** being rebuilt per `docs/` — treat
existing code as a sketch, not a foundation.

**This workspace owns the BACKEND / SERVER.** The frontend (Expo app) is owned separately —
**do NOT build frontend here.** Backend changes that affect the client get appended to
[`docs/planning/frontend-todo.md`](docs/planning/frontend-todo.md) → "Backend-driven items."

## Stack (v1.0 target)

- Monorepo (pnpm): **`client`** (Expo/RN) + **`server`** (Express 5 + TS) + **`shared`**
  (`@aura/shared` — enums, Zod DTOs, constants = the client/server contract). (Replaces the prototype's
  `artifacts/*` + `lib/*` layout.)
- DB: PostgreSQL on **Neon** + Drizzle ORM — **versioned migrations, NOT `drizzle-kit push`**.
- LLM: **Groq** (Llama 3.1). Moderation: OpenAI omni + Groq gpt-oss-safeguard + prompt-guard
  (layered, server-side, fail-closed). **Auth: Clerk** (managed — email/password + Apple + Google;
  reset/verification handled by Clerk; server verifies Clerk session tokens, webhook mirrors users).
  Payments: **RevenueCat + StoreKit**. Notifications: APNs.
  Hosting: **Render** (or Replit always-on Reserved VM).

## Run & operate (after the Phase 0 restructure)

- `pnpm --filter @aura/shared run build` — build `shared` first (server depends on it)
- `pnpm --filter @aura/server run dev` — run the API server
- `pnpm --filter @aura/server run typecheck`
- DB: `drizzle-kit generate` (config: `server/drizzle.config.ts`) → review → runtime `migrate()`; `push` is forbidden. Dev-only reset: `server/scripts/db-reset.mjs`. (See `docs/specs/v1-schema.md`.)
- Required env: see the env-var list in `docs/planning/v1-tasklist.md` (validated at boot, fail-closed). **Note:** that list omits the voice vars — also set `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID`, `DEEPGRAM_API_KEY`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` (voice, optional).

## Critical rules

- **Follow `docs/`** — the architecture, schema, and task list are deliberate decisions.
- **Don't build the frontend.** Append client-affecting changes to `docs/planning/frontend-todo.md`.
- **No hardcoded secrets** — Zod-validate env at boot and fail closed (replace the prototype's
  `process.env.X ?? "fallback"` patterns). **Auth is Clerk-managed (D8):** verify the Clerk session
  token server-side; there is **no app-minted JWT** — delete the prototype's `SESSION_SECRET`/JWT
  logic. Add `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` / `CLERK_WEBHOOK_SECRET`.
- **Versioned migrations**, never `push` in shared/prod.
- **Legal-review items** (retention numbers, `safety_events.flagged_content` retain-vs-scrub,
  jurisdictions, policy wording) are **NOT to be guessed** — leave the defaults + flags for counsel.
- Build the **`Moderator` interface (Phase 2) before the chat turn pipeline (Phase 3)** — they're
  co-dependent.

## Build protocol (work incrementally — do NOT build everything at once)

Replit Agent defaults to building whole apps in one pass; for this backend, **don't.**

- The backend audit is **remediated and locked on `main`** (remaining = the eval run; voice has landed): work `docs/planning/backend-fixlist-v1.md` **in order, one item at a time** (follow it, don't rebuild), then the test/eval loop in `docs/testing/testing-readiness-v1.md`.
- Each subsystem (moderation, chat turn pipeline, payments/webhook, memory consolidation, auth) is
  substantial — give it **focused depth**, not a diluted all-at-once scaffold.
- **One task ≈ one commit.** Definition of Done before the next: typecheck passes, tests for that unit
  pass, no `console.*`/hardcoded secrets, committed.
- **Stop and confirm at the end of each phase.** Full rules: the `incremental-backend-build` skill.

## Skills & customization

- Project skills live in **`.agents/skills/`** (Replit applies them when relevant):
  `incremental-backend-build` (the guardrail), `database-migrations`, `api-design`, `backend-patterns`,
  `cost-aware-llm-pipeline`, `ai-regression-testing`.
- Also set **Custom Instructions** in your Replit workspace (always-on) — suggested text is in
  `docs/README.md` → "Replit setup."

## Where things live (target)

- `server/src/` — layered `route → controller → service → db (repositories)`; see the server-structure
  reference in `docs/planning/v1-tasklist.md`. The chat turn pipeline + `Moderator`/`LLMProvider` interfaces
  live under `server/src/services/`.
- `server/eval/` — **already on disk + committed:** the synthetic chat-pipeline eval corpus
  (`cases/` + the to-be-compiled `rubrics/`). Read `server/eval/cases/README.md`. The eval *harness*
  is still to be built (this workspace); the cases/labels are the seed it runs against. Note:
  `cases/retrieval/` holds **Tier-1 deterministic** fixtures (consumed by the CI unit tests, not the
  human report).
- `shared/` — `@aura/shared` enum/DTO/constant catalog (`docs/specs/v1-schema.md`).
- `docs/` — the plan of record (start at `docs/README.md`).

## Gotchas

- The **iOS client can't be built/tested on Replit** (needs Mac + Xcode + simulator + EAS). This
  workspace is the server; client work happens elsewhere.
- The old `.replit` / `.replit-artifact/*` config targets the prototype's `artifacts/*` structure and
  **needs rewriting** for `client/server/shared`.
- **`server/` already exists** (it holds the committed `server/eval/` corpus). The Phase 0 restructure
  maps `artifacts/api-server`→`server/` — do that by adding `server/src/` + `server/package.json`
  **around** the existing tree; do **NOT** `rm`/recreate `server/` or move `api-server` to *become*
  `server/`, or you'll clobber `server/eval/`. Preserve it.
- If hosting on Replit instead of Render, use an **always-on Reserved VM** (not a sleeping instance)
  so RevenueCat webhooks deliver within their retry window.
