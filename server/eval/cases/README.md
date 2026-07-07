# Aura AI — Eval corpus (`server/eval/cases/`)

Synthetic, hand-authored eval cases for the chat-pipeline eval harness. This is the **source of
truth to keep** (alongside `../verdicts/`); per-run reports under `../reports/` are regenerable and
gitignored. See [eval-report-layout.md](../../../docs/testing/eval-report-layout.md) §0 for the directory
contract and [eval-safety-rubric.md](../../../docs/testing/eval-safety-rubric.md) for the safety tier.

> **Status — initial validated batch (schema-lock).** This is the small per-call-type batch authored
> first to lock the JSON shapes and get the safety labels reviewed *before* scaling to a full corpus.
> Do **not** scale to hundreds until the safety labels below are signed off. (Per the build approach:
> "author a small validated batch per call type first… then scale. Don't author hundreds blind.")

## Non-negotiable constraints

- **SYNTHETIC ONLY — no real user data / PII.** Conversations are sensitive personal data under the
  privacy policy; every case here is hand-authored fiction.
- **Self-harm / crisis cases are clinical, non-graphic, non-instructional.** They illustrate the
  *label*, never a method or means.
- **`sexual/minors` cases never render sexual content.** The case describes the *request shape* (the
  thing the pipeline must block) — the label is what the corpus needs, not harmful text.

## Directory layout

```
cases/
  moderation/      label-matching data (confusion matrix); NOT prose-judged
    labeled.json      set 1 — labeled safe/unsafe per omni category
    jailbreak.json    set 2 — adversarial / injection taxonomies (rephrased)   ⚠ SAFETY-REVIEW
    output-side.json  set 3 — clean input → unsafe draft (exercises L3)
    over-block.json   set 4 — benign content naive keywords would flag
  consolidation/   structured op-proposal cases (new-fact/dedup/contradiction/skip-flagged)
    consolidation.json
  generation/      persona × trait × scenario; includes safety-rubric §5 exemplars
    generation.json
  retrieval/       deterministic scoring fixtures (tier-1 unit data, gates CI)
    retrieval.json
```

Each file is a small wrapper object — `{ callType, corpusSet?, description, safetyReview, cases: [...] }`
— so the per-file `safetyReview` flag and the per-case annotations travel with the data. Harness reads
`.cases`. Core case fields match the report-layout cards exactly; optional annotation fields
(`safetyCritical`, `note`, `naiveFlagCategory`) are additive and never change the judged shape.

## Schema per call type

**moderation** (card §5.2) — label-matching, no prose judge:
```jsonc
{ "id", "corpusSet": "labeled|jailbreak|output-side|over-block",
  "category",                 // omni category UNDER TEST (header tag; e.g. self-harm, sexual/minors, injection)
  "input",                    // user message screened
  "draftReply?",              // output-side only: the unsafe draft the model produced (the L3 pair)
  "expected": { "action": "allow|crisis|block", "category": "<ground-truth omni cat|null>", "layer": "L0|L1|L2|L3|safeguard|null" },
  "safetyCritical?": true, "note?": "...", "naiveFlagCategory?": "..." }
```
- `category` (top-level) = the category *under test*; `expected.category` = the *ground-truth* label
  (null on a clean `allow`). They differ on over-block cases (under-test self-harm → expected none).
- `action` is the terminal `Moderator` action (moderation-pipeline §9): `safe-fallback` outcomes
  collapse into `block`; `crisis` is the SB 243 PASS-and-continue path, **never** a block.

**consolidation** (card §5.1):
```jsonc
{ "id", "scenario": "new-fact|dedup|contradiction|skip-flagged",
  "turn": { "user", "assistant" },
  "existingMemories": [ { "id", "category", "importance", "content" } ],   // the dedup set
  "expectedOps": [ { "op": "ADD", "content", "category", "highSalience?" }
                 | { "op": "UPDATE", "id", "content" } ],                  // [] == NONE
  "safetyCritical?": true, "note?": "..." }
```
Importance is **derived from category** (memory-pipeline §2.5), never in the op.

**generation** (card §2):
```jsonc
{ "id", "persona": "aurora|orion|lyra",
  "traits": { "warmth": "reserved|warm|doting", "energy": "calm|balanced|playful", "verbosity": "concise|balanced|expansive" },
  "scenario": "cold|warm-no-mem|warm-with-mem|mem-none-relevant|crisis-adjacent|...",
  "memoryBlock?": ["..."],    // exact lines injected, or omit for cold start
  "history?": [ { "role": "user|assistant", "content" } ],
  "userMessage",
  "rubricFocus": ["safety-hold|persona-adherence|trait-fidelity|continuity|on-topic|self_harm_crisis|injection_resistance|preamble_hold|sexual|violence_illicit|boundary_deflection"],
  "expectedOutcome?": "allow|crisis-path|block",   // for safety-tier cases
  "safetyCritical?": true, "note?": "..." }
```

**retrieval** (deterministic unit data, memory-pipeline §5):
```jsonc
{ "id", "description",
  "storedMemories": [ { "id", "content", "keywords": ["..."], "category", "importance", "createdAt", "lastRecalledAt?" } ],
  "query",
  "now",                       // fixed clock for deterministic recency
  "expectedTopN": ["<memory id>", ...] }   // ordered; [] == graceful empty
```

## ⚠ Safety-review queue — Jason owns these labels; freeze only after sign-off

Jason owns the safety-tier rubric + corpus (eval-report-layout §0, eval-safety-rubric §0). The
coworker does **not** author or freeze safety labels. The following carry `safetyCritical: true` and
need explicit sign-off before promotion into the regression gate:

| File | Cases | Why safety-critical |
|---|---|---|
| `moderation/jailbreak.json` | all | jailbreak/adversarial labels (rephrased public taxonomies) |
| `moderation/labeled.json` | `sexual/minors`, `self-harm*`, `illicit/violent` cases | zero-tolerance + crisis-route + hard-block labels |
| `moderation/output-side.json` | `self-harm` draft | output-side self-harm = suppress (NOT crisis) — easy to mislabel |
| `consolidation/consolidation.json` | `skip-flagged` cases + the allergy boundary (`con-009`) | crisis/health skip-rule (storing it re-injects harm) |
| `generation/generation.json` | corner / crisis / sexual-minors / injection exemplars | safety-hold at the most-permissive corner |

Non-safety cases (the `allow`/over-block/persona/dedup/retrieval data) and the easy-tier rubric can be
shared/scaled by the coworker without sign-off.
