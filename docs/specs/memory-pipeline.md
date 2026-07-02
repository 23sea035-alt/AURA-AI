# Aura AI — Memory Pipeline (consolidation + retrieval)

**Status:** Build spec · **Scope:** the per-companion memory subsystem — how facts are written (async
LLM consolidation) and read (keyword retrieval). Implements [v1-architecture.md](v1-architecture.md) **D12**.
**Last updated:** 2026-06-30

> Per-companion long-term memory makes a stateless Groq model feel continuous. **Reads** score stored
> memories against the user message and inject the top-5 into the **system prompt**. **Writes** run as an
> **async post-turn LLM consolidation pass** (off the turn's critical path) that extracts durable facts,
> dedups, and lightly handles contradictions. This doc is the build spec for both halves; all tunable
> values live in `@aura/shared`.

> **As-built reconcile (2026-07-02).** Consolidation now receives **the user message + the companion's
> reply** (the reply is context to resolve references like "yeah, that one"; the extractor still pulls
> facts about the *user* only) — this closes the prior user-message-only gap and matches the eval's input.
> The following spec points were **not** implemented and are accepted as-built (eval-validated), so treat
> the spec below as design intent, not as-built, for these: **importance is model-chosen** (clamped 0–1),
> not derived from a category map, and there is **no `highSalience` bump**; the consolidation contract is a
> **plain JSON array** parsed with a keyword fallback, not a forced tool-call; the dedup candidate set is
> the **20 most-recent** existing memories (not 50 ordered by importance); and a failed pass **retries up to
> 3×** (not "one retry"). Retrieval (scoring, floor, recency-decay) matches the spec.

---

## 1. Data flow

```
TURN (critical path)
  user message ──► retrieval: score all (user,companion) memories ──► inject top-5 into SYSTEM prompt
                                                                       set last_recalled_at on the 5

POST-TURN (async, off critical path)
  (user msg + assistant reply) ──► consolidation: extract / dedup / contradiction ──► ADD / UPDATE ops
                                                                                        validate → write
```

Storage: the `memories` table (`v1-schema.md` §5), one set per `(user_id, companion_id)`. Relevant
columns: `keywords text[]`, `category`, `importance real`, `last_recalled_at`, `created_at`, `updated_at`.
The **`memories` table needs no new columns** for this design; the "remembers" cache (§2.8) does add
three `companions.remember_*` columns.

---

## 2. Consolidation (writes)

### 2.1 When & how it runs
- **Every turn**, async fire-and-forget, **off the critical path** (zero added turn latency).
- On failure: **one retry, then drop + log.** The turn already succeeded, so there is no user impact.
- **Idempotent via dedup** — a re-run sees its own prior `ADD` and returns nothing.

### 2.2 Inputs
- **Context = current turn only** (the user message + the assistant reply). The user message carries the
  facts; the reply disambiguates references ("yes I do" → what?).
- **Dedup set = all existing `(user,companion)` memories, capped at `MEMORY_DEDUP_CANDIDATE_CAP` (50) by
  importance desc.** The cap is a safety bound rarely hit at v1.0 scale; the >50 case is a future
  rolling-summarization concern (deferred, architecture §8).

### 2.3 Tool-call contract
Decision #2 (tool-call) — the model is forced to call one tool per pass:

```jsonc
consolidate_memory({
  ops: [
    { op: "ADD",    content: string, category: MEMORY_CATEGORY, highSalience?: boolean },
    { op: "UPDATE", id: number, content: string }   // overwrite in place (D12: no soft-delete in v1.0)
  ]
})
// empty ops array = NONE (nothing durable). No DELETE op in v1.0.
```

> **"No DELETE" is a *consolidation-contract* rule** — the LLM pass may not delete. It does **not**
> apply to the user-facing memory-management API (`GET /api/companions/:companionId/memories`,
> `PATCH /api/memories/:id`, `DELETE /api/memories/:id`), where a user **may** edit or delete their own
> memories explicitly. The two paths are distinct: model-driven writes are additive/overwrite-only;
> user-driven deletes are honored.

> **`UPDATE id` is a short integer handle, not the DB UUID.** `memories.id` is a `uuid` (v1-schema §5),
> but the consolidation pass is shown the dedup set with each memory under a small integer handle (the
> `#id` rendered in the eval cards); the model returns that handle, and the server maps it back to the
> row's `uuid` before writing — so the 8B never emits (or hallucinates) a UUID. The §2.6 validation
> rejects any handle that wasn't in the set the pass was shown.

### 2.4 Prompt responsibilities
- **Extract only durable, user-asserted facts** — not ephemera ("I'm tired today").
- **Dedup semantically** — if a fact is already represented (even reworded), omit it.
- **Light contradiction handling** — distinguish *replaces* (job / location / relationship-status →
  `UPDATE`) from *additive* (a second pet, another hobby → `ADD`). This is the subtle line the
  consolidation eval polices.
- **Safety skip rule (hard):** **never memorize crisis / self-harm / safety-flagged content** — it would
  be re-injected into future prompts, which is actively harmful. For **health**: store only **neutral,
  stable facts** ("allergic to peanuts"); **skip diagnoses / conditions** ("has anxiety"). *(Working rule;
  pending final product/privacy sign-off — see [eval-safety-rubric.md](../testing/eval-safety-rubric.md) §6.)*
- Stay within the category enum; keep `content` a concise, normalized statement ("works at Apple").

### 2.5 Importance (category-driven, not model-chosen)
Importance is **derived from `category`** via a constant map — the model never picks a raw number (removes
a noisy degree of freedom from the eval):

| category | importance |
|---|---|
| `identity`, `relationship` | 0.90 |
| `work`, `location` | 0.70 |
| `attribute`, `preference` | 0.60 |
| `general` | 0.40 |
| *(any)* + `highSalience` | **0.95** |

`highSalience` is a model-emitted flag, used **sparingly**, only for safety/health-critical stable facts
(e.g. allergies) — it bumps importance to the identity tier. `keywords` are derived **server-side** from
`content` via `extractKeywords` (tokenize + stopword strip), not by the model.

### 2.6 Validation (server-side, fail-safe)
Every op is validated before write: `category ∈ enum`; `UPDATE id` must reference a real memory for this
`(user,companion)` (**reject hallucinated ids**); `content` length-bounded; importance clamped to `[0,1]`.
**Invalid ops are dropped + logged — never allowed to corrupt the store.**

### 2.7 DI seam (item F)
Behind a `MemoryConsolidator` interface (mirrors the existing `LLMProvider` seam) so contract tests inject
a deterministic fake: `consolidate(turn, existingMemories) → ops[]`.

### 2.8 "Remembers" cache (Home card)
After consolidation writes its ops, a follow-on **Groq pass surfaces one memory and generates a
short follow-up question** about it, written to the `companions.remember_*` columns
(`remember_memory_id`, `remember_question`, `remember_generated_at`). The Home "remembers" card reads
this cache **read-only** — it never recomputes on render. Code: `server/src/services/memory/remember.ts`.

---

## 3. Retrieval (reads)

### 3.1 Candidate set
**Pull all `(user,companion)` memories** — *no* top-50-by-importance prefilter (that had a relevance blind
spot: a highly-relevant low-importance fact past the cutoff was invisible). The per-companion store is
small at v1.0 scale; the `(user_id, companion_id)` index supports it.

### 3.2 Scoring
```
score   = 0.7·Jaccard(queryTokens, memory.keywords) + 0.3·importance + 0.15·recency
recency = exp(−Δdays / MEMORY_RECENCY_HALFLIFE_DAYS)     // Δ = days since (last_recalled_at ?? created_at)
```
- Jaccard over the stopword-stripped query tokens vs. the stored keyword set.
- Recency is **usage-recency** — `last_recalled_at` updates on every recall, so frequently-used facts
  self-reinforce and stay surfaced. **Net-new vs. the prototype**, which computes only `Jaccard×0.7 +
  importance×0.3` and never applies recency.
- Weights and half-life are tunable constants, tuned against the retrieval eval set.

### 3.3 Floor + identity bypass (decision #1)
```
eligible if  Jaccard > MEMORY_RELEVANCE_FLOOR (0.08)   OR   importance ≥ MEMORY_IDENTITY_BAR (0.85)
rank eligible by score → take top-5 (MEMORY_RETRIEVAL_TOP_N)
tie-break: score → importance → id   (stable / deterministic — required for testability)
```
- The floor is on the **relevance component (Jaccard)**, not the blended score — so a high-importance but
  irrelevant fact can't sneak in on importance alone.
- `IDENTITY_BAR = 0.85` → identity/relationship (0.90) and `highSalience` (0.95) facts **always ride
  along** (the user's name, key relationships) even with zero lexical overlap; work/location (0.70) and
  below must earn a slot via relevance.
- **Identity-crowding (v1.0):** bypass grants *eligibility*, not a reserved slot — ranking still decides
  the 5. Add reserved slots only if evals show identity facts crowding out relevant ones.

### 3.4 Injection
Top-5 injected into the **system prompt**, never the user message (keeps user text pure data — the same
prompt-injection separation as moderation, D12). On recall, set `last_recalled_at = now()` for the
injected memories.

### 3.5 Known limitation (accepted, not a bug)
Pure keyword Jaccard misses semantic-only matches ("dog named Rex" stored, query "how's my puppy?" →
score 0). This is the inherent v1.0 limit; real embeddings are deferred (architecture §8). The eval
asserts this **misses gracefully** (returns nothing, no crash), not that it returns something wrong.

---

## 4. Constants (all in `@aura/shared`)

| Constant | Value | Tunable? |
|---|---|---|
| `MEMORY_IMPORTANCE_BY_CATEGORY` | map in §2.5 | yes |
| `MEMORY_HIGH_SALIENCE_IMPORTANCE` | 0.95 | yes |
| `MEMORY_SCORE_WEIGHTS` | `{ jaccard: 0.7, importance: 0.3, recency: 0.15 }` | yes |
| `MEMORY_RECENCY_HALFLIFE_DAYS` | 30 | yes |
| `MEMORY_RELEVANCE_FLOOR` (ε) | 0.08 | yes |
| `MEMORY_IDENTITY_BAR` | 0.85 | yes |
| `MEMORY_RETRIEVAL_TOP_N` | 5 | prompt-budget bound |
| `MEMORY_DEDUP_CANDIDATE_CAP` | 50 | yes |

---

## 5. Eval approach (item B)

**Consolidation eval (LLM-judged + human spot-check):** extraction precision/recall (durable facts captured,
ephemera ignored), dedup correctness, contradiction → correct `UPDATE` (not spurious overwrite of an
unrelated fact), **skip-rule adherence** (no crisis/flagged stored; health rule honored), category/importance
correctness. Report card = turn → existing memories → proposed ops in plain language
([eval-report-layout.md](../testing/eval-report-layout.md) §5 stub).

**Retrieval eval (deterministic — tier-1 unit tests, gates CI):** the scoring is a pure function of inputs,
so it's unit-testable. Cases: lexical-overlap beats importance-only; recency boosts an equally-relevant
fresher memory; identity surfaces on weak overlap (bypass); cold → empty; all-irrelevant → empty (floor);
>N relevant → exactly N; ties broken deterministically; malformed legacy `keywords` → score 0, no throw;
the semantic-only miss (§3.5) returns nothing gracefully.

---

## 6. Prototype delta (for the coworker)

Current code is in [memory.ts](../../server/src/services/memory.ts) / [chat.ts](../../server/src/routes/chat.ts). The v1.0 build:
- **Replaces** regex `extractFacts` + naive `storeMemory` (which dedups nothing → store fills with noise)
  with the **LLM consolidation pass** + dedup.
- **Adds the recency term** (current `retrieveMemories` never applies it).
- **Adds the floor + identity bypass** (current injects top-5 regardless of score).
- **Changes the candidate set** from top-50-by-importance to **pull-all**.
- **Makes the sort deterministic** (current `.sort` isn't stable across the tie-break keys).
- Adds the `MemoryConsolidator` DI seam for testability.
