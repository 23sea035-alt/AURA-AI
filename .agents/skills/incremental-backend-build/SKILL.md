---
name: incremental-backend-build
description: Build the Aura AI backend incrementally — one task/phase at a time, verified and committed before the next. Use for ALL server/backend work in this repo. Prevents diluted all-at-once scaffolding.
---

# Incremental Backend Build (Aura AI)

The plan of record is `docs/` (start at `docs/README.md`). The backend is built and **remediated
post-audit** — see `docs/planning/backend-fixlist-v1.md` for any deferred items; the original build order
is `docs/planning/v1-tasklist.md`. Work the way a careful engineer would — **depth per item, not one sweeping pass.**

## The rule: one thing at a time, verified

- **Work `docs/planning/backend-fixlist-v1.md` in order (P0→P4), one item at a time** (the backend is built; fix per the audit, don't rebuild). The original build order is in `docs/planning/v1-tasklist.md`.
- **Do NOT scaffold the whole backend in one pass.** Each of moderation, the chat turn pipeline,
  payments/webhooks, memory consolidation, and auth is a substantial subsystem that deserves its own
  focused effort — a diluted all-at-once build produces shallow, buggy code.
- **One task ≈ one focused commit** with a clear message. Keep diffs reviewable.

## Definition of Done (before moving to the next task)

A task isn't done until ALL of:
- [ ] `pnpm --filter @aura/server run typecheck` passes
- [ ] tests for the unit you just built pass (add them — don't skip)
- [ ] no `console.*` (use the pino logger), no hardcoded secrets/fallbacks
- [ ] it's committed

## Phase gates (stop-and-confirm)

- At the **end of each phase**, STOP: summarize what was built + how you verified it, and confirm
  before starting the next phase.
- Respect dependencies: build the **`Moderator` interface (Phase 2) before the chat turn pipeline
  (Phase 3)**; land the **secret-fallback removal with Phase 1 auth**; author the **initial Drizzle
  migration in Phase 0** before anything depends on the schema. (As built, migrations are squashed to a
  single `0000_init` baseline — extend the schema then `drizzle-kit generate` → review → `migrate()`;
  never `drizzle-kit push`.)

## Scope guardrails

- **Backend/server only.** Do NOT build the frontend (Expo app) — append client-affecting changes to
  `docs/planning/frontend-todo.md` → "Backend-driven items."
- Don't relitigate locked decisions in `docs/specs/v1-architecture.md` without a real reason.
- **Legal-review items** (retention numbers, `safety_events.flagged_content`, jurisdictions, policy
  wording) are NOT to be guessed — leave the defaults + flags.
