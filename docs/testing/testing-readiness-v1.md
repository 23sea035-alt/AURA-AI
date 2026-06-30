# Aura AI — Testing Readiness (v1.0)

**Status:** Unit + contract harness **green and gating in CI** (now **35 test files / 364 tests**, incl. a supertest HTTP integration test and the voice + remember suites). The `pnpm eval` runner now **enforces a safety-critical FN=0 gate** (exits non-zero). What's left: a **live eval run against `main`** (needs real `GROQ_API_KEY` + `OPENAI_API_KEY` — on **Groq**, not NVIDIA), coverage-to-target, and signing off the safety corpus.
**Launch gate:** `pnpm build && pnpm typecheck && pnpm lint && pnpm test` — all green; enforced by [`../../.github/workflows/ci.yml`](../../.github/workflows/ci.yml) on push/PR to `main`.
**Last updated:** 2026-06-30 (voice + memory-API tests; was 2026-06-29)

> Supersedes the pre-fix snapshot (that version was UTF-16-encoded and described an uninstalled framework). The unit/contract harness now exists; this doc tracks what remains.
> **Note:** the coworker's earlier eval reports (on the divergent `test-results` branch) ran partly on **NVIDIA** + a placeholder OpenAI key, so their generation/consolidation numbers do **not** reflect the Groq production pipeline — re-run on Groq.

---

## Current state

| Item | Status | Notes |
|------|--------|-------|
| Test framework installed | ✅ | Vitest ^3 at the repo root (`pnpm test` → `vitest run`) |
| Test configuration | ✅ | Root [`../../vitest.config.ts`](../../vitest.config.ts) — globals, node env, v8 coverage (text + lcov) |
| PGlite setup | ✅ | [`../../server/src/__tests__/setup.ts`](../../server/src/__tests__/setup.ts) — in-memory Postgres, applies the Drizzle migrations (single `0000_init` baseline folder), seed constants |
| Tier 1 — unit tests | ✅ | keywords, deterministic, prompt-assembler, free-tier, break-reminder, response, errors, safety-errors, moderation, consolidation, **remember**, **voice (livekit, tts, metering, agent)** |
| Tier 2 — contract tests | ✅ | auth, admin, ban, idor, rate-limit, **pg-rate-limit-store**, require-admin, moderation(-engine), turn-pipeline, turn-retry, retention, **routes.integration (supertest HTTP — incl. voice + memory-API routes)** |
| CI gating | ✅ | build + typecheck + lint + test on every push/PR to `main` |
| Coverage threshold | ⚠️ | Coverage is **reported** (v8) but **not yet enforced** at ≥80% |
| Tier 3 — eval harness | ◑ | Runners built **and the moderation runner now enforces FN=0 + the generation runner derives pass from dimension grades** (audit H13). Not yet run against `main` with live keys — see Status. |
| Safety corpus sign-off | ❌ | `safetyCritical` labels await Jason's sign-off before promotion into a regression gate |

The **35 test files** live in [`../../server/src/__tests__/`](../../server/src/__tests__/). LLM providers are mocked in Tiers 1–2; contract tests hit a real (in-memory) Postgres or a mocked `db`.

---

## What's left

### 1. Run the eval loop — the actual remaining work

The corpus and runners exist; nobody has executed them. This is the prompt-iteration loop. See **[docs/README.md → Running tests & evals](../README.md#running-tests--evals)** for the commands and the `GROQ_API_KEY` requirement (the runners hit the live Groq pipeline, so they're out of CI).

- [ ] `pnpm eval` — run `server/eval/cases/moderation/*` through the live L0–L3 pipeline; read the confusion matrix in `server/eval/reports/`. **Gate: safety-critical cells (`sexual/minors`, `self-harm`, injection) at FN = 0.**
- [ ] Tune [`../../server/src/services/moderation/safeguard.ts`](../../server/src/services/moderation/safeguard.ts) and [`prompt-guard.ts`](../../server/src/services/moderation/prompt-guard.ts) **to the labels**; re-run; record before/after.
- [ ] `pnpm eval:gen` — generation persona × trait × scenario + LLM judge; tune the persona/safety prompts against the rubric.
- [ ] Keep signed-off verdicts under `server/eval/verdicts/` (`reports/` is regenerable + gitignored).
- [ ] Get Jason's sign-off on the `safetyCritical` labels before any eval result is treated as a gate.

### 2. Coverage to target

- [ ] Raise Tier 1 + 2 line coverage to ≥80% on `server/src/` and **enforce** it (vitest `coverage.thresholds`) so CI fails under the bar.

### 3. (Optional) Nightly eval job

- [ ] Evals stay **out of the PR gate** (live key + cost). If you want continuous signal, add a separate **scheduled** workflow with `GROQ_API_KEY` as a secret — do not add it to `ci.yml`.

---

## How to add a test

Vitest discovers `server/src/**/*.test.ts`. Pure unit test:

```typescript
// server/src/__tests__/example.test.ts
import { describe, it, expect } from "vitest";

describe("ModuleName", () => {
  it("does the thing", () => {
    expect(fn()).toBe("expected");
  });
});
```

Contract test (real in-memory Postgres via PGlite):

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, closeTestDb, TEST_USER_ID } from "./setup";

let db: Awaited<ReturnType<typeof createTestDb>>;
beforeAll(async () => { db = await createTestDb(); });
afterAll(async () => { await closeTestDb(); });
```

**Ownership.** Jason owns the safety-tier labels/corpus ([`eval-safety-rubric.md`](eval-safety-rubric.md) §0). The coworker builds/runs the runner, scales non-safety cases, and tunes prompts — but does not author or freeze safety labels.
