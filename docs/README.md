# Aura AI — Backend Brief & Doc Index (Start Here)

Status (2026-06-29): an independent **production-readiness audit + remediation** has landed and is locked on `main` (commit `25d96c6`): 3 CRITICAL + ~13 HIGH (plus selected MEDIUM/LOW) fixed and verified — **364 tests green**, typecheck clean. The authoritative current behavior of every backend subsystem is **[specs/v1-architecture.md §0a "As-built"](specs/v1-architecture.md)** (note the **Groq-only LLM-provider lock**). The full findings + remediation log + remaining backlog: **[audit/backend-audit-2026-06.md](audit/backend-audit-2026-06.md)**.

**Authoritative backend status** = the **audit report** ([audit/backend-audit-2026-06.md](audit/backend-audit-2026-06.md)) for current state, and `planning/backend-fixlist-v1.md` for the Phase A–F history. The old phase tracker (`planning/v1-tasklist.md`) over-claims "done" — trust the audit report. The pre-audit version of this README is archived at `archive/README.pre-audit-2026-06.md`.

## What Aura AI is

An iOS AI-companion chat app (**18+, US-first**). Users chat 1:1 with vetted AI personas that remember facts across conversations; the differentiator is a **safety-first, regulation-aware** design. Monetized via a single **$9.99/month** premium subscription (free tier: 30 messages/day). The repo began as a Replit-Agent prototype; v1.0 rebuilt it on pnpm workspaces (`client` Expo + `server` Express 5 + `shared` `@aura/shared`), Clerk auth, RevenueCat, Drizzle/Neon, APNs.

---

## App name (resolved)

The name stays **Aura** (per coworker decision 2026-06-24). Five candidates were researched (Nosta, Lumine, Velara, Serein, Mellora) — see [`planning/app-name-research.md`](planning/app-name-research.md) for the full availability audit. Velara, Serein, and Mellora were blocked; the remaining candidates had domain/conflict concerns worse than staying with Aura.

---

## What's left — in order

> **2026-06-29 update.** The audit remediation superseded most of the list below. The two items that
> remain real: **(1) run the live evals against `main`** — they need real `GROQ_API_KEY` +
> `OPENAI_API_KEY` and **must run on Groq, not NVIDIA** (the coworker's earlier eval reports ran
> partly on NVIDIA + a placeholder OpenAI key, which taints generation/consolidation results); the
> `pnpm eval` safety gate now enforces FN=0. **(2) the deferred MEDIUM/LOW items** in the audit
> report's §8 backlog. The original Phase E/F text below is kept for context.

The blocking fixes (Phases A–D) have landed; their full per-item history with resolving files is in `planning/backend-fixlist-v1.md`. Below is everything that still needs doing — work it top to bottom. IDs reference the fixlist (Pn-n) and testing plan (Tn-n).

1. **Precondition — verify the Groq guard models (P2-3):** confirm `prompt-guard-2-86m` and `gpt-oss-safeguard-20b` exist on the Groq account (one curl — see the bottom of the fixlist). If either is missing, point `model-selector.ts` at a fallback (llama-guard / wildguard / 70b). The selector already falls back to a safe default, so this gates eval *quality*, not boot.
2. **Prompt-iteration loop (Phase E) — the main job:** the runners are built (`pnpm eval` / `pnpm eval:gen`) but have **never been run** — the prompts are unvalidated first drafts. Run the moderation corpus → tune `services/moderation/{safeguard,prompt-guard}.ts` → re-run; then the generation runner + LLM judge → tune the persona/safety prompts. Commands + Groq setup are in **[Running tests & evals](#running-tests--evals)** below. **Jason owns the `safetyCritical` labels** — tune prompts to the labels, never the reverse.
3. **Coverage to 80% (Phase F):** fill Tier-1/Tier-2 gaps and **enforce** ≥80% line coverage via vitest `coverage.thresholds` so CI fails under the bar.
4. **Reports / verdicts (Phase F):** capture the eval reports under `server/eval/verdicts/`, record GO/NO-GO per dimension (safety, persona, memory, payments), then sign off.

**Acceptance per item:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test` green (incl. new tests); a fresh-DB boot serves an authenticated chat turn end-to-end.

---

## Running tests & evals

Two distinct loops — don't conflate them. The first gates every commit; the second is the prompt-iteration work that's still owed.

### Unit + contract tests — the CI gate (mocked LLM, no API key)

```bash
pnpm test          # vitest run — whole suite (server/src + shared)
pnpm test:watch    # watch mode while iterating
```

Config is the root [`../vitest.config.ts`](../vitest.config.ts); the 21 suites live in [`../server/src/__tests__/`](../server/src/__tests__/). Contract tests run against a **real Postgres via PGlite (in-memory)** — `__tests__/setup.ts` boots it and applies the Drizzle migrations, so they exercise the actual schema. LLM providers are mocked in this tier. This is what [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) enforces on every push/PR to `main` (build + typecheck + lint + test).

### Evals — the prompt-iteration loop (runs the REAL pipeline against Groq)

The eval corpus is hand-authored JSON in [`../server/eval/cases/`](../server/eval/cases/) — see its [README](../server/eval/cases/README.md) for the schema per call-type and the safety-review queue. The runners are built and wired as `server/package.json` scripts:

```bash
# from server/ — GROQ_API_KEY must be present in the environment
pnpm eval        # moderation: runs cases/moderation/* through the live L0–L3 pipeline,
                 # writes a confusion matrix (TP/TN/FP/FN) to server/eval/reports/
pnpm eval:gen    # generation: persona × trait × scenario cases + an LLM judge
```

These call the **Groq** LLM provider for real (the model-selection seam, T0-1), so they need `GROQ_API_KEY` (and the judge key for `eval:gen`) in the env. They are intentionally **not** part of `pnpm test` and **not** in the CI gate (live key + cost). `server/eval/reports/` is regenerable/gitignored; the kept source of truth is the cases + signed-off verdicts.

**The loop itself:** run `pnpm eval` → read the confusion matrix (the safety-critical cells — `sexual/minors`, `self-harm`, injection — must hit **FN = 0**) → tune the prompts in [`../server/src/services/moderation/`](../server/src/services/moderation/) (`safeguard.ts`, `prompt-guard.ts`) and the persona/generation prompts → re-run → compare. Iterate until the safety tier holds and over-block stays low. Same loop for `pnpm eval:gen` against the generation rubric. Log before/after so the iteration is auditable.

> **Jason owns the safety labels.** You may run the runners, scale the non-safety cases, and tune prompts — but do **not** author or freeze the `safetyCritical` labels (corpus README's review queue). Tune the prompts to the labels; never move the labels to match the prompts.

---

## The docs

### Specs — the agreed design ("what it should be"; conformance targets, don't relitigate)

| Doc | Location |
|-----|----------|
| Architecture & decisions (D1–D12) | `specs/v1-architecture.md` |
| DB schema & `@aura/shared` catalog | `specs/v1-schema.md` (12 tables incl. `voice_usage`; `users.avatar_color`/`primary_companion_id` + `companions.remember_*`) |
| Moderation pipeline (L0–L3) | `specs/moderation-pipeline.md` |
| Memory pipeline (async LLM consolidation) | `specs/memory-pipeline.md` |
| Generation pipeline (hardened prompt assembly) | `specs/generation-pipeline.md` |

### Testing — how we validate

| Doc | Location |
|-----|----------|
| 3-tier strategy (Vitest + PGlite + evals) | `testing/test-harness.md` |
| What's missing before you can iterate | `testing/testing-readiness-v1.md` |
| Eval criteria + report format | `testing/eval-safety-rubric.md` · `testing/eval-report-layout.md` |

**Jason owns the safety labels.** Coworker may build the eval runner and scale non-safety cases, but must not author or freeze safety labels.

### Planning — actionable / time-bound

| Doc | Location |
|-----|----------|
| Live backend work (P0→P4) | `planning/backend-fixlist-v1.md` |
| Original phase plan (history) | `planning/v1-tasklist.md` |
| Client/Expo build (frontend owner only) | `planning/frontend-todo.md` |
| Post-v1.0 deferred features (roadmap) | `planning/post-v1.0-roadmap.md` |
| Real-time voice call — research + spike plan | `planning/realtime-voice-call-research.md` |

> **Voice has partially landed (2026-06-30).** No longer purely deferred: the voice backend ships
> endpoints (`/api/voice/limits`, `/voice/token`, `/voice/start`, `/voice/stop`, `/voice/tts`) + a
> `voice_usage` metering table (LiveKit + Cartesia TTS + Deepgram STT). The two voice docs above now
> describe an in-progress feature, not a parked one.

### Compliance — legal drafts (do NOT publish without sign-off)

| Doc | Location |
|-----|----------|
| Data retention policy | `compliance/data-retention-policy.md` |
| Privacy policy draft | `compliance/privacy-policy-draft.md` |

### Design

| Doc | Location |
|-----|----------|
| Client visual redesign | `redesign/` |

---

## Ownership

| Role | Person | Scope |
|------|--------|-------|
| **Backend / server** | Coworker (on Replit) | Work `planning/backend-fixlist-v1.md` then `testing/testing-readiness-v1.md`. Does NOT build the frontend — append client-affecting contract changes to `planning/frontend-todo.md` → "Backend-driven items." |
| **Frontend / client** | Jason (via Claude Code) | Expo app — `planning/frontend-todo.md` |
| **Safety labels / eval corpus** | Jason | The coworker may build the eval runner and scale non-safety cases, but must not author or freeze safety labels (`testing/eval-safety-rubric.md` §0). |
| **Contract boundary** | `@aura/shared` | Zod DTOs, enums, constants — the single source for client+server types. |

---

## Do NOT guess these — they're for legal counsel

- Exact **retention windows** (current numbers are defaults).
- Whether `safety_events.flagged_content` is **retained in full or scrubbed** to metadata (fixlist leaves a `TODO(legal)`).
- **Served jurisdictions** (US-only vs EEA/UK) and final **privacy-policy / data-retention** wording.

---

## Replit setup (for the coworker)

This workspace is the **server** (the iOS client needs Mac + Xcode + EAS — not buildable on Replit). The Agent reads `../replit.md` + `../AGENTS.md` each session; both now point here and to the fixlist. Custom Instructions (workspace settings) should say: work `docs/planning/backend-fixlist-v1.md` in order, one item at a time; after each — typecheck + tests pass, no console.*/secrets, then commit; backend only; don't guess the legal items. Hosting is Render (or an always-on Replit Reserved VM so RevenueCat webhooks deliver).
