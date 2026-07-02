# Aura v1 — Go-Live Checklist

**Status:** the backend **code is v1-complete and green** (526 tests pass, coverage enforced ~90%,
typecheck clean, lint 0 errors; migrate-on-boot wired; `render.yaml` complete). Everything below is
**ops / config / legal** — none of it is code. Work top-to-bottom; each gate is a hard prerequisite
for the next.

Canonical branch: **`backend`**. Deploy target: **Render** (`render.yaml`, `plan: starter` = single
instance — intentional, see [v1-architecture.md §8](specs/v1-architecture.md)).

---

## Gate 0 — Third-party accounts & tiers

- [ ] **Groq — upgrade to a paid (Developer) tier.** *Hard launch blocker.* The Free tier caps
  `llama-3.3-70b-versatile` at **12K TPM / 1K RPD / 100K TPD**, shared between generation and
  consolidation (~2 calls/turn) → **~42 turns/day across ALL users**. One-click billing change in the
  Groq console. Verify the guard models exist on the account:
  ```bash
  curl -H "Authorization: Bearer $GROQ_API_KEY" https://api.groq.com/openai/v1/models \
    | grep -E "prompt-guard|safeguard|whisper-large-v3-turbo"
  ```
  If any are missing/deprecated, pick a replacement in `server/src/services/llm/model-selector.ts`.
- [ ] **Inworld — create 3 voices** (Aurora / Orion / Lyra) in the TTS portal; copy each voice ID.
  Casting guide + style tags are in [docs/TODO.md §1–2](TODO.md). *Until these are set, voice sessions
  run but produce **no audio** (TTS skips gracefully).*
- [ ] **Neon — provision the production database** (separate from dev). Grab the pooled connection
  string for `DATABASE_URL`. Migrations run automatically on server boot — no manual migrate step.
- [ ] **Clerk — production instance**; note the secret + publishable keys and create a webhook signing
  secret.
- [ ] **RevenueCat — production project**; create the webhook auth secret; configure StoreKit products.
- [ ] **APNs — production key** (`.p8`), Key ID, Team ID; decide `APNS_ENVIRONMENT` (`production`).
- [ ] **Sentry (optional but recommended)** — project DSN for error monitoring.

---

## Gate 1 — Render environment variables

Every var below is declared `sync: false` in `render.yaml` and **must be set in the Render dashboard**
(none are committed). `NODE_ENV` and `PORT` are already valued in the manifest.

| Var | Source |
|---|---|
| `DATABASE_URL` | Neon prod pooled connection string |
| `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_WEBHOOK_SECRET` | Clerk prod instance |
| `GROQ_API_KEY` | Groq (paid tier) |
| `OPENAI_API_KEY` | OpenAI (moderation) |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat prod |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_KEY_FILE`, `APNS_ENVIRONMENT` | Apple push key |
| `BANNED_IDENTITY_PEPPER` | generate a strong random secret (used to hash banned identities) |
| `INWORLD_API_KEY`, `INWORLD_VOICE_ID_AURORA`, `INWORLD_VOICE_ID_ORION`, `INWORLD_VOICE_ID_LYRA` | Inworld |
| `SENTRY_DSN` | Sentry (optional) |

- [ ] All required vars set in Render. (Server validates critical secrets at startup — a missing one
  fails boot loudly rather than degrading silently.)

---

## Gate 2 — Point webhooks at production

- [ ] **RevenueCat** webhook → `https://<prod-host>/api/payments/webhook`, auth secret =
  `REVENUECAT_WEBHOOK_SECRET`.
- [ ] **Clerk** webhook → `https://<prod-host>/api/webhooks`, signing secret = `CLERK_WEBHOOK_SECRET`.
- [ ] Fire a test event from each provider dashboard; confirm a 2xx and no error logs.

---

## Gate 3 — Deploy

- [ ] Push `backend` and deploy on Render (build + start commands are in `render.yaml`).
- [ ] Confirm the boot log shows **migrations applied** against Neon (no pending-migration errors).
- [ ] `GET /api/healthz` returns `200 {"status":"ok","checks":{"database":"ok"}}`
  (returns `503 degraded` if the DB check fails — this is the Render health-check path).

---

## Gate 4 — Production smoke test

- [ ] **Auth:** sign in from the app (Clerk) → authenticated request succeeds.
- [ ] **Text turn (REST):** send a message → reply returns; verify moderation fires (a disallowed
  input is blocked with `400 BLOCKED`).
- [ ] **Text turn (WS streaming):** open the chat WebSocket → tokens stream sentence-by-sentence.
- [ ] **Voice:** `POST /api/voice/start` → speak → hear in-character audio → `POST /api/voice/stop`;
  confirm usage metered into `voice_usage` and daily/per-call caps enforced. Repeat per persona to
  sanity-check the three voice IDs (feeds the §2 expression-tuning QA pass).
- [ ] **Memory:** after a few turns, confirm a `memory_jobs` row is consolidated by the worker and a
  memory surfaces on a later relevant turn.
- [ ] **Payments:** a sandbox purchase flips the user to premium (RevenueCat webhook path).
- [ ] **Admin metrics:** with an admin account (`users.role = 'admin'`), `GET /api/admin/metrics`
  returns counters. **Watch `groq.rate_limited`** — any nonzero value = Groq is throttling us (tier too
  low or traffic too high).

---

## Gate 5 — Legal / compliance sign-off

- [ ] **Counsel signs off data-retention windows** (arch §6 leaves the final numbers to counsel).
- [ ] **AI-disclosure + SB 243 copy** reviewed (recurring in-chat AI-disclosure notice is implemented).
- [ ] **Age gate** (18+, self-attestation) and App Store age rating consistent.
- [ ] **UGC reporting** path verified (`POST /api/messages/:id/report` → `safety_events`).
- [ ] **Crisis-resource** copy reviewed and region-appropriate for the launch market.

---

## Gate 6 — Eval status (informational)

Moderation + generation prompts were **validated in a dedicated eval session with Jason's approval**.
The formal signed verdicts under `server/eval/verdicts/` were **intentionally not committed** — treat
the pipeline as *validated but not archived*. If a future audit needs a paper trail, re-run
`pnpm eval` + `pnpm eval:gen` (needs `GROQ_API_KEY` + `OPENAI_API_KEY`) and commit the reports.

---

## Monitoring & rollback

- [ ] Sentry receiving events (if configured).
- [ ] Bookmark `GET /api/admin/metrics`; alert on `groq.rate_limited > 0` and rate-limit counters.
- [ ] **Rollback:** redeploy the previous Render build. Migrations are additive/forward-only — do not
  roll the database back under a rolled-back app without checking schema compatibility.

---

## Explicitly deferred to post-v1 (do NOT block launch)

- **Cross-instance Groq rate coordination** — v1 is single-instance, so the in-memory turn queue is the
  authoritative global limiter. Trigger to build: the day a 2nd instance is added. Full sequencing in
  [v1-architecture.md §8](specs/v1-architecture.md).
- True SSE token streaming, real embeddings, rolling summarization, under-18 support, Android, i18n
  crisis resources — see [v1-architecture.md §8](specs/v1-architecture.md).
