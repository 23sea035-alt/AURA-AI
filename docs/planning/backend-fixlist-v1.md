# Aura AI — Backend Fixlist v1.0

**Status:** Reconciled against the code 2026-06-27 — **Phases A–D have LANDED** across two fix rounds (coworker's round + a cleanup/hardening round). **Remaining = Phase E (prompt iteration) + the tail of Phase F (coverage → 80%, eval verdicts).**
**Supersedes:** `planning/v1-tasklist.md` (deprecated, kept for history)
**Read before building:** `docs/README.md` (the "Running tests & evals" section is the entry point for what's left), then the referenced spec docs.
**Last updated:** 2026-06-29 (was 2026-06-27)

> **2026-06-29 — audit remediation landed (locked on `main`, commit `25d96c6`).** An independent
> production-readiness audit ([../audit/backend-audit-2026-06.md](../audit/backend-audit-2026-06.md))
> found **3 CRITICAL + ~13 HIGH**; all CRITICAL/HIGH plus selected MEDIUM/LOW are now **fixed and
> verified** (312 tests green, typecheck clean). The authoritative as-built behavior is in
> [specs/v1-architecture.md §0a](../specs/v1-architecture.md) (note the **Groq-only LLM-provider
> lock**). Remaining work — the **live eval run against `main` with real `GROQ_API_KEY` +
> `OPENAI_API_KEY`** (Groq, not NVIDIA) and a few MEDIUM/LOW items — is tracked in the audit report's
> §8 backlog. Phase E/F below is partially superseded by that report.

> **How to read this now.** The blocking fix work is done — do **not** re-do Phases A–C. Each subsection below carries a **Status** line: ✅ landed (with the file that proves it), or ⬜ remaining. Your job is the ⬜ items: run the eval loop and finish coverage/verdicts. Some planned filenames differ from what shipped (noted inline) — the work is what matters, not the name.

---

## Audit findings summary (original 2026-06-22 — now resolved)

The v1.0 backend was rated **NO-GO / fix-first** at the 2026-06-22 audit. Every finding below has since been addressed; the table is kept as the historical baseline. See the per-phase **Status** lines for the resolving file.

| Area | Original issue | Resolved by |
|------|----------------|-------------|
| **Chat turn** | `routes/chat.ts` 410 lines, inline prompt/free-tier logic, hardcoded prompt, canned fallback. No `services/chat/`. | `services/chat/{turn-pipeline,prompt-assembler,free-tier,break-reminder}.ts` (T0-3) |
| **Payments** | `services/payment.ts` was Stripe; spec demands RevenueCat. No webhook. | `services/payments/revenuecat.ts` + webhook (P1-9…11) |
| **Auth** | Clerk verifyToken broken. No ban-evasion / status filter. | P0-2, P1-1, P1-2 |
| **DB** | Dropped UNIQUEs. Migrations never ran. No migrate-on-boot. | 0002 UNIQUE, migrate-on-boot (P0-3) |
| **Moderation** | Input thresholds mis-tuned. Partial degradation failed open. | P0-5, P0-6 (fail-closed) |
| **Memory consolidation** | Skipped safety checks. No recency/floor. | P0-7, memory recency/floor |
| **Testing** | No Vitest. 2 test files. No PGlite. No eval loop. | Vitest + PGlite + 21 suites (T2-1); eval runners built (T3-1/T3-2) |
| **Retention** | Hardcoded 90/365/730-day numbers. | Global purge removed; numbers tagged legal-review |
| **Repositories / Controllers / Accounts** | Missing layers. | services/account + service layer extracted |
| **Shared contract** | No Zod DTOs. | DTOs in `shared/src/index.ts` (P1-5) |

---

## Working order

**Acceptance per item:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test` green (incl. new tests); a fresh-DB boot serves an authenticated chat turn end-to-end. **The full suite is currently green (21 suites) and gated by CI.**

---

## Phase A — Scaffolding / unblockers — ✅ LANDED

### P0-3 — Migrate on boot — ✅

**Status: ✅ landed** — `index.ts` runs `migrate()` before `startBackgroundServices()`; boot fails fast if migration fails.

- [x] Add `drizzle-orm` migrate call to startup
- [x] Run migrations automatically before accepting requests (fail-fast if migration fails)
- [x] Verify: fresh DB → boot → tables exist (PGlite test setup proves the migration chain applies clean)

### T0-1 — Model-selection seam — ✅

**Status: ✅ landed** — `services/llm/model-selector.ts` exists and is wired into the moderation engine + LLM provider.

- [x] Create `services/llm/model-selector.ts`
- [x] Route by task (generate-reply / moderate-input / moderate-output / consolidate-memory)
- [x] Make model IDs configurable via env
- [x] Graceful fallback to a safe default if a dedicated guard model is unavailable
- [x] Wire into moderation engine and LLM provider

### T0-3 — Extract the turn processor — ✅

**Status: ✅ landed** — full `services/chat/` layer extracted; `routes/chat.ts` delegates.

- [x] Create `services/chat/turn-pipeline.ts` (pure orchestration, no `req`/`res`)
- [x] Create `services/chat/prompt-assembler.ts` (safety preamble, persona, datamarked memory, output constraints, trim-to-fit; hardcoded `HARDENED_SYSTEM_PROMPT` removed)
- [x] Create `services/chat/free-tier.ts` (`checkFreeTierLimit()`)
- [x] Create `services/chat/break-reminder.ts` (`shouldShowBreakReminder()`)
- [x] `routes/chat.ts` delegates to the service layer

### T2-1 — Install test infra (PGlite + coverage) — ✅

**Status: ✅ landed** — Vitest lives at the **repo root** (not `server/`), config `vitest.config.ts`, PGlite setup `server/src/__tests__/setup.ts`.

- [x] Vitest + v8 coverage installed (root `package.json`)
- [x] Vitest config (root `vitest.config.ts` — globals, node, v8 coverage)
- [x] PGlite global setup (`server/src/__tests__/setup.ts` — in-memory Postgres, runs migrations, seed constants)
- [x] `"test": "vitest run"` / `"test:watch"` scripts (root)
- [x] Verify: `pnpm test` green

---

## Phase B — P0 blockers + their contract tests — ✅ LANDED

### P0-1 — Retention purge fix — ✅

**Status: ✅ landed** — the global 90-day message purge (`enforceRetention`) and `markInactiveUsers` were **removed** (decision: no mass message deletion); safety-event / grace / banned-identity retention kept. Test: `retention.contract.test.ts`.

- [x] Audit `services/retention.ts` for live-data deletion bugs
- [x] Remove the unbounded message purge; keep scoped retention jobs
- [x] Tag remaining retention numbers as legal-review items
- [x] Contract test: `retention.contract.test.ts`

### P0-2 — Clerk verifyToken fix — ✅

**Status: ✅ landed** — verification fixed and fail-closed; `auth.contract.test.ts` is green.

- [x] Fix broken Clerk session verification
- [x] Error handling: expired / invalid signature / malformed → 401
- [x] Contract test: `auth.contract.test.ts`

### P0-4 — Dropped UNIQUEs + turn transaction — ✅

**Status: ✅ landed** — migration `0002_add_message_turn_role_unique.sql`; turn written in a transaction; idempotency covered by `turn-pipeline.contract.test.ts` + `turn-retry.contract.test.ts` (planned name was `turn.contract.test.ts`).

- [x] Restore dropped UNIQUE constraints (migration 0002)
- [x] `turn_id` unique-violation handling (retry path)
- [x] Companion counters updated in the same transaction as the message insert
- [x] Contract test: duplicate turnId doesn't duplicate messages

### P0-5 — Moderation input thresholds — ✅

**Status: ✅ landed** — thresholds reconciled to `specs/moderation-pipeline.md`; test `moderation.contract.test.ts`.

- [x] Audit input/output thresholds in `shared/src/index.ts`
- [x] Fix mis-tuned thresholds
- [x] Contract test: known-safe passes, known-violation blocks

### P0-6 — Partial-degradation fail-open → fail-closed — ✅

**Status: ✅ landed** — degradation ladder fails **closed**; safeguard/prompt-guard return a safe block on unparseable/ambiguous output. Test: `moderation-engine.contract.test.ts` (planned name was `degradation.contract.test.ts`).

- [x] If a moderation layer fails → fail closed
- [x] L2 fails → L3 still runs; L3 fails → safe block
- [x] All providers fail → safe fallback reply, never unmoderated pass-through
- [x] Contract test for each failure mode

### P0-7 — Consolidation safety-skip — ✅

**Status: ✅ landed** — `consolidation.ts` skips crisis/flagged content (`CRISIS_PATTERNS`, safety-skip rules in the prompt); bounded retry via `attempts` (migration 0008). Test: `consolidation.contract.test.ts`.

- [x] Flagged/crisis/blocked content is not consolidated
- [x] Safety-skip for blocked input / crisis / moderated output
- [x] `attempts` column added to `memory_jobs` (0008)
- [x] Contract test: blocked content not stored as memory

---

## Phase C — P1 security — ✅ LANDED

### P1-1 — Auth status filter — ✅
**Status: ✅ landed** — suspended/banned users are rejected; admin gating via `require-admin`. Tests: `require-admin.test.ts`, `auth.contract.test.ts`.
- [x] Status check rejects suspended/banned on authenticated requests
- [x] Contract test

### P1-2 — Ban-evasion detection — ✅
**Status: ✅ landed** — `checkBan` over email/Apple/Google sub hashes; auto-suspend on repeat safety events; Clerk webhook blocks banned identities on create+update. Test: `ban.contract.test.ts`.
- [x] Banned identity → registration rejected
- [x] Repeat offender → auto-suspend
- [x] Contract test

### P1-3 — IDOR prevention — ✅
**Status: ✅ landed** — resource queries scoped by `userId` (companions, messages, report, notifications). Test: `idor.contract.test.ts`.
- [x] Per-resource ownership checks
- [x] Contract test: user A cannot access user B's data

### P1-4 — Rate-limit audit — ✅
**Status: ✅ landed** — `apiLimiter`, `authBruteForceLimiter`, `webhookLimiter` (express-rate-limit v8, `ipKeyGenerator`); `trust proxy` set; webhook paths skipped. Test: `rate-limit.contract.test.ts`.
- [x] Per-IP API limiter + auth brute-force + webhook handling
- [x] `trust proxy` so per-IP limiting works behind Render
- [x] Contract test: over-limit → 429

### P1-5 — Zod validation — ✅
**Status: ✅ landed** — reusable Zod DTOs in `shared/src/index.ts`, consumed by routes.
- [x] Request bodies validated; reusable DTOs in `@aura/shared`
- [x] Malformed input → 400

### P1-6 — Webhook rawBody — ✅
**Status: ✅ landed** — Clerk webhook verifies `req.rawBody`; RevenueCat webhook verified.
- [x] Raw body preserved for signature verification on webhook routes

### P1-7 — DB indexes — ✅
**Status: ✅ landed** — migrations `0003_add_indexes.sql` + `0005_add_missing_indexes.sql`.
- [x] Indexes for history / free-tier counting / offender lookup / companion listing / entitlement / job polling

### P1-8 — Admin → Clerk roles — ✅
**Status: ✅ landed** — `role` synced from Clerk metadata (migration `0004`), `isAdmin` column dropped (`0006`); admin endpoints check the synced role. Test: `admin.contract.test.ts`.
- [x] No hardcoded admin; role synced from Clerk; admin endpoints gated on synced role

### P1-9 … P1-11 — RevenueCat trust — ✅
**Status: ✅ landed** — `services/payments/revenuecat.ts`: signature verification, sandbox-vs-prod via `environment`, stale-event guard via `lastEventTimestampMs` (migration `0007`) + premium-staleness reconcile.
- [x] P1-9 signature verification
- [x] P1-10 sandbox-vs-prod detection
- [x] P1-11 `is_premium` staleness reconciliation

---

## Phase D — P2 spec features + tests — ✅ LANDED (one precondition for the coworker)

### P2 — Persona/traits assembly — ✅
**Status: ✅ landed** — 3×3×3 persona system in `prompt-assembler.ts` (Aurora/Orion/Lyra × warmth/energy/verbosity), personality in the system prompt.
- [x] 3 personas × 3 trait axes, trait snippets, system-prompt placement, wired into the assembler

### P2 — Datamarking — ✅
**Status: ✅ landed** — `prompt-assembler.ts` fences memory/history with `<<MEMORY …>>` / `<<HISTORY …>>` and instructs the model to treat them as reference-only.
- [x] Memory + history datamarked; reference-only instruction

### P2-3 — Dedicated guard models — ⬜ PRECONDITION (coworker)
**Status: ⬜ remaining — needs a live Groq key.** The selector wires `prompt-guard-2-86m` / `gpt-oss-safeguard-20b` with a safe fallback, but whether they exist on **this** Groq account can only be confirmed by running the check at the bottom of this file. Run it before the eval pass.
- [x] Guard models wired into `model-selector.ts` with fallback
- [ ] **Verify the models exist on the Groq account** (curl below) — if missing, pick a fallback (llama-guard / wildguard / 70b)

### P2 — Memory recency/floor — ✅
**Status: ✅ landed** — `services/memory.ts` applies `MEMORY_RECENCY_HALFLIFE_DAYS` + `MEMORY_RELEVANCE_FLOOR` in retrieval.
- [x] Recency scoring + relevance floor in retrieval

### T1 — Tier-1 unit tests — ✅
**Status: ✅ landed** — keywords, prompt-assembler, deterministic, free-tier, break-reminder, response, errors (+ safety-errors).
- [x] All Tier-1 unit suites present and green

### T3-1 — Moderation eval runner — ✅
**Status: ✅ landed (built, not yet run for tuning — that's Phase E).** `server/src/eval/runner.ts`, corpus `server/eval/cases/moderation/`, `pnpm eval`, report layout per spec.
- [x] Runner loads JSON cases, runs the pipeline, emits a scored confusion-matrix report
- [x] `pnpm eval` script; runs independently

---

## Phase E — Prompt-iteration loop — ⬜ REMAINING (the coworker's job)

> The runners and corpus exist; **nobody has run them.** This is the actual outstanding work. See `docs/README.md` → **Running tests & evals** for commands + the `GROQ_API_KEY` requirement, and `testing/testing-readiness-v1.md` for the checklist. Jason owns the `safetyCritical` labels — tune prompts to the labels, do not move the labels.

### T3-2 — Generation runner + LLM judge — ✅ built / ⬜ run
**Status: ⬜ remaining** — `server/src/eval/runner-generation.ts` + `pnpm eval:gen` are built; the judged tuning pass has not been run.
- [x] Generation runner + LLM judge built
- [ ] Run it; record persona/safety verdicts

### Moderation corpus tuning — ⬜
- [ ] `pnpm eval` → analyze FP/FN (safety-critical cells at **FN = 0**)
- [ ] Tune thresholds + `services/moderation/{safeguard,prompt-guard}.ts`
- [ ] Re-run → measure improvement; log before/after

### Generation prompt tuning — ⬜
- [ ] `pnpm eval:gen` → analyze persona drift / safety failures
- [ ] Tune safety preamble, persona snippets, datamarking
- [ ] Re-run → measure improvement

---

## Phase F — P3/P4 cleanup — ◑ PARTIAL

### Quality/types/silent-failures — ✅ (largely)
**Status: ✅ landed** — catch blocks reviewed (moderation/consolidation/worker fail-closed or re-queue), `as any` casts removed in the touched paths, typecheck green. A final blanket sweep is optional.
- [x] No silent swallows in the safety/turn/job paths
- [x] `as any` removed in touched code; typecheck clean

### Config/docs — ✅
**Status: ✅ landed** — `render.yaml` present, env list in `config/env.ts`, docs reorganized into subdirs with `docs/README.md` as the brief.
- [x] Env-var list, `render.yaml`, doc structure

### Coverage to 80% — ⬜ REMAINING
**Status: ⬜ remaining** — coverage is reported (v8) but **not enforced**.
- [ ] Fill gaps to ≥80% line coverage on `server/src/` and enforce via vitest `coverage.thresholds`
- [ ] (Integration smoke test: fresh-DB boot → authenticated turn — partially covered by contract tests)

### Reports/verdicts — ⬜ REMAINING
**Status: ⬜ remaining** — depends on Phase E being run.
- [ ] Run the full eval suite → produce reports
- [ ] Record GO/NO-GO per dimension (safety, persona, memory, payments) and sign off

---

## Pre-condition check: Groq guard models (run before Phase E)

Verify the dedicated guard models exist on the Groq account:

```bash
curl -H "Authorization: Bearer $GROQ_API_KEY" \
  https://api.groq.com/openai/v1/models
```

Expected:
- `prompt-guard-2-86m` (L1 input screening)
- `gpt-oss-safeguard-20b` (L3 safeguard fallback)

If either is missing or deprecated, the selector already falls back to a safe default; choose a replacement and update `model-selector.ts`:
- `llama-guard-3-8b` (Meta) · `wildguard` (Allen AI) · a local ONNX model · or `llama-3.3-70b` as a more-capable (costlier) safeguard.

---

## Post-v1.0 (deferred — do NOT build)

Voice calls (speech → turn pipeline → TTS; metered) · True SSE streaming · Next.js web · Real embeddings (vector search) · Under-18 support · Re-engagement notifications · Android · i18n/region crisis resources · Freeform companion authoring · US web payment link-out.
