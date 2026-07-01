# Aura AI — Backend / Server (Replit Workspace)

> **Start here:** [`docs/README.md`](docs/README.md) → [`docs/CHANGELOG.md`](docs/CHANGELOG.md) → [`docs/TODO.md`](docs/TODO.md).
> Work `docs/TODO.md` top-to-bottom, one task at a time. Do not rebuild from scratch.

## What this is

Aura AI — an iOS AI-companion chat app (18+, US-first). This workspace owns the **backend / server only.** The iOS client (Expo RN) is owned separately and cannot be built or tested on Replit.

Stack: pnpm monorepo — `client` (Expo RN, not yours) + `server` (Express 5 + TypeScript) + `shared` (`@aura/shared` Zod DTOs + constants — the client/server contract).

- **DB:** PostgreSQL on Neon + Drizzle ORM — versioned migrations (`drizzle-kit generate`), never `push` in shared/prod. Schema is squashed to a single `0000_init` baseline; add new migrations on top.
- **LLM:** Groq — `llama-3.3-70b-versatile` (primary), `llama-3.1-8b-instant` (fallback).
- **Moderation:** layered L0–L3 pipeline across **two independent, unaffiliated vendors** — L1 prompt-guard and the safeguard/adjudicator escalation both run on **Groq**; L2 input / L3 output category scoring runs on **OpenAI's `omni-moderation` API**. Groq and OpenAI are separate companies — neither key substitutes for the other, and both are required (`GROQ_API_KEY`, `OPENAI_API_KEY`). Fail-closed. See [`docs/specs/moderation-pipeline.md`](docs/specs/moderation-pipeline.md).
- **Memory:** async consolidation job (Groq) + vector retrieval. See [`docs/specs/memory-pipeline.md`](docs/specs/memory-pipeline.md).
- **Auth:** Clerk (managed — email/password + Apple + Google; server verifies Clerk session tokens; webhook mirrors users to DB).
- **Payments:** RevenueCat + StoreKit webhooks.
- **Push:** APNs (skipped automatically when a live WebSocket connection is open).
- **Voice (optional):** Inworld TTS 2 over WebSocket for text-to-speech; Groq Whisper (`whisper-large-v3-turbo`) for speech-to-text. Voice features degrade gracefully when `INWORLD_*` env vars are unset.
- **Hosting:** Render (or Replit always-on Reserved VM — required for reliable RevenueCat webhook delivery).

## Branch and push rules

You are on **`test-results`**. At the start of each session:

```bash
git pull origin test-results
```

After each task, push here only:

```bash
git push origin test-results
```

Do NOT push to `main` or `backend`.

## Run & operate

```bash
# from repo root
pnpm install

# from server/
pnpm dev        # build + run with server/.env
pnpm build      # esbuild bundle → dist/
pnpm typecheck  # tsc --noEmit

# tests — run from repo root, not server/
npx vitest run

# evals — needs GROQ_API_KEY set; NOT part of CI
pnpm eval       # moderation pipeline (L0–L3) + confusion matrix
pnpm eval:gen   # generation (persona × trait × scenario) + LLM judge
```

## Required environment variables

Server and client each have their own `.env` — they don't share one, and you (backend/server) never need the client's. Copy the template and fill it in:

```bash
cp server/.env.example server/.env
```

In dev, `server/.env` is loaded automatically (via `--env-file=.env` in the npm scripts). In prod, set the same vars as Render/Replit environment variables instead. The server validates all required vars at boot and fails closed if any are missing (`server/src/config/env.ts`).

```
# Database
DATABASE_URL=<neon-postgres-connection-string>

# Auth (Clerk)
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=

# LLM + STT (Groq)
GROQ_API_KEY=

# Moderation (OpenAI — L2 output safeguard)
OPENAI_API_KEY=

# Payments (RevenueCat)
REVENUECAT_WEBHOOK_SECRET=

# Security
BANNED_IDENTITY_PEPPER=<random-32-byte-hex>

# Push notifications (APNs — optional, skipped gracefully when unset)
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_KEY_FILE=<path-to-.p8-key-file>
APNS_ENVIRONMENT=sandbox   # or production

# Voice — Inworld TTS 2 (optional — voice features skip gracefully when unset)
# Fill INWORLD_VOICE_ID_* values after completing TODO §1 (voice ID selection)
INWORLD_API_KEY=
INWORLD_VOICE_ID_AURORA=
INWORLD_VOICE_ID_ORION=
INWORLD_VOICE_ID_LYRA=

# Optional
SENTRY_DSN=
LOG_LEVEL=info
NODE_ENV=development
PORT=8080
```

The client (Expo app, not yours) has its own separate `client/.env.example` — a single optional `EXPO_PUBLIC_DOMAIN` var, unrelated to anything above.

## After each task

1. `pnpm build && pnpm typecheck && npx vitest run` — all green (baseline: **342 tests**).
2. No `console.*` or hardcoded secrets in the diff.
3. Commit with a `feat:` / `fix:` / `test:` / `chore:` prefix.
4. Add a CHANGELOG entry in [`docs/CHANGELOG.md`](docs/CHANGELOG.md).
5. Push to `origin/test-results`.

## Critical rules

- **Follow `docs/`** — architecture, schema, and decisions are deliberate. Don't relitigate without a real reason.
- **No hardcoded secrets** — Zod-validate env at boot; fail-closed.
- **Versioned migrations only** — `drizzle-kit generate` → review → runtime `migrate()`. Never `push` in shared/prod.
- **Do not build the frontend.** Append client-affecting contract changes to [`docs/planning/frontend-todo.md`](docs/planning/frontend-todo.md) under "Backend-driven items."
- **Legal-review items** (retention numbers, `safety_events.flagged_content` retain-vs-scrub, jurisdictions, policy wording) are NOT to be guessed — leave defaults + flags for counsel.
- **Jason owns `safetyCritical` eval labels** — tune moderation prompts to the labels, never the reverse.

## The docs

| What | Doc |
|---|---|
| What Aura is + how to run | [`docs/README.md`](docs/README.md) |
| What has shipped | [`docs/CHANGELOG.md`](docs/CHANGELOG.md) |
| Your task list | [`docs/TODO.md`](docs/TODO.md) |
| Architecture + decisions (D1–D12) | [`docs/specs/v1-architecture.md`](docs/specs/v1-architecture.md) |
| DB schema + `@aura/shared` catalog | [`docs/specs/v1-schema.md`](docs/specs/v1-schema.md) |
| Moderation pipeline (L0–L3) | [`docs/specs/moderation-pipeline.md`](docs/specs/moderation-pipeline.md) |
| Memory pipeline | [`docs/specs/memory-pipeline.md`](docs/specs/memory-pipeline.md) |
| Generation pipeline | [`docs/specs/generation-pipeline.md`](docs/specs/generation-pipeline.md) |
| Testing strategy | [`docs/testing/test-harness.md`](docs/testing/test-harness.md) |
| Eval safety rubric | [`docs/testing/eval-safety-rubric.md`](docs/testing/eval-safety-rubric.md) |
| Production-readiness audit (2026-06-29) | [`docs/audit/backend-audit-2026-06.md`](docs/audit/backend-audit-2026-06.md) |
| Frontend items (client owner only) | [`docs/planning/frontend-todo.md`](docs/planning/frontend-todo.md) |
| Post-launch roadmap | [`docs/planning/post-v1.0-roadmap.md`](docs/planning/post-v1.0-roadmap.md) |
| Compliance drafts (do not publish without counsel) | [`docs/compliance/`](docs/compliance/) |
