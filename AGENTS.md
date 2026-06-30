# Aura AI — Agent Guide

> **Plan of record:** read [`docs/README.md`](docs/README.md) first, then the specs in
> [`docs/specs/`](docs/specs/) ([v1-architecture](docs/specs/v1-architecture.md), [v1-schema](docs/specs/v1-schema.md)).
> **The backend audit is remediated and locked on `main`; remaining = the eval run, and voice has landed — see [`docs/planning/backend-fixlist-v1.md`](docs/planning/backend-fixlist-v1.md)**
> (follow it; don't rebuild), then the test/eval loop in [`docs/testing/testing-readiness-v1.md`](docs/testing/testing-readiness-v1.md).
> For backend/server work also see [`replit.md`](replit.md).
> Those docs are authoritative — follow them; don't relitigate decisions without a real reason.

## What this is

Aura AI — an iOS AI-companion chat app (**18+, US-first**). The current code is a Replit-Agent
**prototype** being rebuilt for v1.0 per `docs/`; treat existing code as a sketch, not a foundation.

## Ownership

- **Backend / server** (Express + Drizzle + Neon, moderation, memory, payments, jobs) — coworker, on
  Replit. See [`replit.md`](replit.md).
- **Frontend / client** (Expo app) — owned separately; tracked in
  [`docs/planning/frontend-todo.md`](docs/planning/frontend-todo.md). **Do not build frontend from the server side.**
- **Contract = `@aura/shared`** (Zod DTOs, enums, constants).

## Critical rules

- Follow `docs/`. **No hardcoded secrets** (env-validated, fail-closed). **Versioned migrations**, not `push` — migrations are squashed to a single `0000_init` baseline; add new ones via `drizzle-kit generate` (config: `server/drizzle.config.ts`).
- **Legal-review items** in the docs (retention numbers, `safety_events.flagged_content`,
  jurisdictions, policy wording) are **NOT to be guessed**.
- Target structure is **`client` + `server` + `shared`** (replaces the prototype's `artifacts/*`).

---

## Replit Custom Instructions (workspace settings, always-on)

The backend audit is **remediated and locked on `main`** (remaining = the eval run; voice has landed). Work `docs/planning/backend-fixlist-v1.md` in order,
ONE item at a time — do not rebuild from scratch and do not batch unrelated fixes.
Then build the test/eval loop in `docs/testing/testing-readiness-v1.md` and iterate the prompts. After
each item: `pnpm build && typecheck && lint && test` pass (add/keep tests), no `console.*` or hardcoded
secrets, then commit. Backend/server only — do not build the frontend; append client-affecting changes
to `docs/planning/frontend-todo.md`. Don't guess the legal-review items.

---

_This file intentionally defers to `docs/` + `replit.md` to avoid drift. The previous contents
(a prototype build log) are in git history._
