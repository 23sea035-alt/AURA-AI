# Aura AI — Agent Guide

> **Start here:** [`docs/README.md`](docs/README.md) (what Aura is + how to run) →
> [`docs/CHANGELOG.md`](docs/CHANGELOG.md) (what has shipped) →
> [`docs/CHANGELOG.md`](docs/CHANGELOG.md) (the shipped record; the old task queue is complete and archived at [`docs/archive/TODO-backend-era.md`](docs/archive/TODO-backend-era.md)).
> For full Replit setup details, see [`replit.md`](replit.md).

## What this is

Aura AI — an iOS AI-companion chat app (18+, US-first). Users chat 1:1 with AI personas (Aurora, Orion, Lyra) that remember facts across conversations; safety-first design; $9.99/month premium (free tier: 30 msgs/day).

This workspace owns the **backend / server only.** The frontend (Expo RN app) is owned separately — do NOT build frontend here. Backend changes that affect the client get called out to the frontend owner in the PR description (the old frontend-todo queue is archived at [`docs/archive/planning/frontend-todo.md`](docs/archive/planning/frontend-todo.md)).

## Branch and push rules

You are on the **`test-results`** branch. At the start of each session:

```bash
git pull origin test-results
```

After each task, push here only:

```bash
git push origin test-results
```

Do NOT push to `main` or `backend` — Jason owns those branches.

## After each task

1. `pnpm build && pnpm typecheck && npx vitest run` — all green (baseline: **342 tests**).
2. No `console.*` or hardcoded secrets in the diff.
3. Commit (`feat:` / `fix:` / `test:` / `chore:` prefix).
4. Add a CHANGELOG entry in [`docs/CHANGELOG.md`](docs/CHANGELOG.md).
5. Push to `origin/test-results`.

## Critical rules

- **Follow `docs/`.** Architecture, schema, and design decisions are deliberate — don't relitigate without a real reason.
- **No hardcoded secrets** — env-validated at boot; fail-closed. See `server/src/config/env.ts` for the full list.
- **Versioned migrations only** — `drizzle-kit generate`, never `drizzle-kit push` in shared/prod. Schema is squashed to a single `0000_init` baseline; add new migrations on top.
- **Legal-review items** (retention numbers, `safety_events.flagged_content` retain-vs-scrub, jurisdictions, policy wording) are NOT to be guessed — leave flags for counsel.
- **Jason owns `safetyCritical` eval labels** — tune moderation prompts to labels, never the reverse.

## Ownership

| Role | Person | Scope |
|---|---|---|
| **Backend / server** | Coworker (Replit, `test-results` branch) | Old queue archived: [`docs/archive/TODO-backend-era.md`](docs/archive/TODO-backend-era.md) |
| **Frontend / client** | Jason (Claude Code) | Expo app — do not build frontend here |
| **Safety labels / eval corpus** | Jason | Coworker may run evals and scale non-safety cases, but must not author or freeze `safetyCritical` labels |
| **Contract boundary** | `@aura/shared` | Zod DTOs, enums, constants — single source of truth for client + server types |
