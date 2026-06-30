# Aura AI — Test Harness & Strategy

**Status:** Build spec · **Scope:** the testing infrastructure for the server — tiers, framework, the
contract-test DB strategy, the DI fakes, the turn-orchestration test list, coverage, and CI. Companion
to the eval docs ([eval-report-layout.md](eval-report-layout.md) et al.), which cover the *Tier-3* evals.
**Last updated:** 2026-06-30

> Three tiers. **Tier 1 (deterministic units)** and **Tier 2 (contract tests, mocked providers + real
> PGlite DB)** are fast, deterministic, and **gate CI**. **Tier 3 (LLM-judged evals)** is the
> human-in-the-loop eval set under `server/eval/` — pre-release/scheduled, **never** in CI.

---

## 1. The three tiers

| Tier | What | Network? | DB? | Location | Gates CI? |
|---|---|---|---|---|---|
| **1 — unit** | pure functions (Jaccard, scoring, regex, prompt assembly, break-reminder…) | no | no (or PGlite for count) | `server/src/__tests__/` | ✅ |
| **2 — contract** | turn-processor orchestration + DB state, providers faked | no (faked) | **PGlite** | `server/src/__tests__/` | ✅ |
| **3 — eval** | persona/safety/consolidation/moderation quality, LLM-judged | yes (real Groq/OpenAI) | — | `server/eval/` | ❌ (pre-release/scheduled) |

LLM output is non-deterministic → you can't *assert* on it, so Tiers 1–2 assert on the deterministic
surface (the assembled prompt, control flow, DB writes) and Tier 3 *scores* quality.

## 2. Framework — Vitest

Clean slate at spec time: **no framework was installed** (the prototype's `safety.test.ts` was a
standalone `tsx` script with its own private `detectCrisis` copy — since replaced). **Vitest**:
ESM-native (repo is `"type": "module"`), fast, Jest-compatible API, built-in **v8 coverage**. One config;
Tier-1/2 tests in `server/src/__tests__/`. (As built, the harness now also covers the voice subsystem
and the memory-management API — added after this spec was written.)

## 3. Contract-test DB — PGlite

- **PGlite** (`@electric-sql/pglite`) — real Postgres (PG17) compiled to WASM, in-process. Our contract
  assertions (**unique-constraint idempotency, FK cascades, `CHECK`, `jsonb`, `text[]`**) run on the real
  engine. No Docker; fast.
- **Migrations: programmatic `migrate()`** (`drizzle-orm/pglite/migrator`) against the real migrations
  folder — **not `drizzle-kit push`** — so tests exercise the exact DDL/constraints that ship.
- **Isolation: fresh PGlite instance per test file** (`beforeAll`) **+ `TRUNCATE … RESTART IDENTITY
  CASCADE` per test** (`beforeEach`). **Not** transaction-rollback-per-test: the turn processor opens its
  own `db.transaction()`, and Drizzle nested transactions are **savepoints** whose inner `COMMIT` destroys
  the outer rollback's isolation — so rollback-teardown silently breaks. Truncate sidesteps it.
- **Pin PG major to prod (17)** everywhere fidelity is claimed.
- **Escalation tiers (use sparingly):** **Testcontainers** (real pooled Postgres) for the rare test that
  needs concurrency/locking/pool behavior PGlite's single connection can't model; a **Neon test-branch**
  (D2 branching, `O(1)` ~1s) as an optional pre-merge prod-parity gate. **Avoid pg-mem** — Drizzle
  `.returning()` is broken on it.

## 4. DI fakes (the seams)

Three injection seams, each a configurable fake with a safe default, in a `__tests__/helpers` module:

| Seam | Default | Overridable to | Notes |
|---|---|---|---|
| `LLMProvider` | fixed canned reply | any reply · **throws** | **records the prompt it received** so tests assert the preamble/memory block are present |
| `Moderator` | `screenInput`/`screenOutput` → `allow` | `crisis` · `block` · `escalated` · **throws** | drives the short-circuit + fail-closed tests |
| `MemoryConsolidator` | empty ops (NONE) | `ADD` / `UPDATE` ops | drives consolidation orchestration tests |

Deterministic and per-test configurable; the existing `setLLMProvider` pattern is the template.

## 5. Turn-orchestration contract tests (Tier 2)

Each asserts a §3 turn-model guarantee, via PGlite + the fakes:

1. **turnId idempotency** — same `turnId` twice → exactly **one** user row + **one** assistant row.
2. **Ordering** — user message persisted **before** generation; assistant **after**.
3. **No dangle** — generation throws → a **safe fallback** assistant row is still persisted.
4. **Crisis short-circuit** — crisis input → **LLM fake NOT called**; crisis reply persisted; `safety_event` logged.
5. **Blocked-input short-circuit** — `Moderator` block → **LLM fake NOT called**; `safety_event` logged.
6. **Output-flagged** — `screenOutput` block → draft suppressed, safe fallback persisted, `safety_event`.
7. **Fail-safe vs fail-closed asymmetry** — `LLMProvider` throws → **safe reply** (turn completes);
   `Moderator` throws → **fail-closed block** (suppress) + turn persisted with fallback. *(opposite directions)*
8. **Free-tier** — the `(limit+1)`-th message for a free user → 429 / blocked, **no generation**.
9. **Break reminder** — fires at the interval / message-count boundary.
10. **Memory injection** — retrieved memories appear in the **system prompt** the LLM fake recorded.

## 6. Deterministic unit tests (Tier 1)

Pure functions, no network: `tokenize` / Jaccard · memory scoring + recency + floor/identity-bypass +
deterministic tie-break · retrieval ranking · L0 crisis regex + encoding-normalize · per-category
threshold mapping · break-reminder logic · free-tier count (PGlite) · **prompt assembly** (preamble
present + first, memory fenced+datamarked, user message delimited).

## 7. Fixtures / factories

`createTestUser` / `createTestCompanion` / `seedMessages` helpers insert via Drizzle into the PGlite DB;
minimal seed per test; truncate between (§3).

## 8. Coverage & CI

- **Coverage:** 80% line/branch (house standard) on the server business logic — turn processor,
  moderation, memory, safety, generation assembly — via Vitest v8 coverage.
- **CI gate:** `typecheck` (`tsc --noEmit`) + lint + **Tier 1 & 2** (Vitest + PGlite) + coverage. `shared`
  builds **before** `server` (D11). **Evals (Tier 3) are excluded from CI** — they need real Groq/OpenAI
  keys + cost; they run pre-release/scheduled from `server/eval/`.

## 9. Prototype delta (for the coworker)

- **Replace** the prototype's standalone `tsx` `safety.test.ts` (since removed; it had a private
  `CRISIS_KEYWORDS`/`detectCrisis` copy) with Vitest tests against the **single** `Moderator`/safety module.
- **Add devDeps:** `vitest`, `@electric-sql/pglite`, `@vitest/coverage-v8` (+ `testcontainers` only if/when
  the concurrency tier is needed).
- **Add** the three DI fakes + the factories + a `test` script.

## 10. Deferred (not blocking)

- **Eval scoring numbers** (pass thresholds, gold-set sizes) → set against a baseline run (#5b).
- **Corpus authoring** (the synthetic cases per cluster) → #3; Jason owns the safety-critical labels.
