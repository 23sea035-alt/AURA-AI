# Personality Voice System (as-built)

> The architecture that makes 12 companions actually distinct and premium tuning actually bite.
> Implemented 2026-07-06 in `@aura/shared` + the prompt assembler; source of truth is the code, this
> doc explains the why. Related: [personas.md](./personas.md) (canon), [companion-gallery-identities.md](./companion-gallery-identities.md)
> (the 12), [companion-customization.md](./companion-customization.md) (phasing/monetization).

## Why this exists

An eval (`server/src/eval/runner-persona-probe.ts`) showed the old design — a hardcoded 3-key
`BASE_VOICES` enum + adjective trait snippets ("be openly warm") — produced **near-identical replies**
across personas (~23% blind re-match, barely above the 8% chance line) and **dead tuning** (moving a
warmth slider changed nothing visible). Two root causes: adjectives get swamped by the model's default
"helpful, warm assistant" attractor, and the middle trait level is indistinguishable from its
neighbours. The fix is two layers.

## Two layers: identity (pack) + delivery (grid)

**Layer 1 — the voice pack** carries *identity* and is always injected. `PersonaVoicePack` in
`shared/src/personas.ts`:

```
{ id, name,
  tagline,       // public picker line ("Warm and gentle, a soft place to land") — client-safe
  stance,        // the relational job: "you help the user feel heard"
  devices[],     // concrete behavioral MOVES ("name the feeling before anything else")
  lexicon,       // diction ("soft address like 'love' fits her")
  exemplars[],   // 1-2 SHORT few-shot turns — show, don't tell (strongest length+style lever)
  defaultTraits, // this character's default grid point
  backchannels?, // brief reaction tokens ("oh", "mm") used sparingly — warmth in one syllable
  voiceId? }     // Inworld casting (placeholder until voices are cast)
```

Identity differentiates by **form** (rhythm, device, diction), not by stance-adjectives — because all
12 share the "warm companion" semantic space, so *how* they talk is what separates them (Sage's spare
2-liners, Amara's endearment flood, Soren's one wry metaphor, Cyrus's "here's what I notice", Wren's
"I wonder"). This is the lever the eval proved works.

**Layer 2 — the trait grid** (`GRID_CONTRACTS`) is *delivery* tuning, expressed as **mechanical,
countable contracts**, not adjectives — because the model reliably obeys countable rules where it
ignores tone words:

| Axis | reserved / warm / **doting** · calm / balanced / playful · concise / balanced / expansive |
|------|-------|
| warmth | 0 endearments / ~1 warm line / ≥1 endearment + explicit care |
| energy | 0 exclamations, no jokes / ≤1 exclamation / ≥1 playful move |
| verbosity | ~1 sentence, no follow-up question / 1–3 sentences / a little more room when it fits, never an essay |

The pack is fixed (identity); the grid moves the dials. `assemblePrompt` composes: safety preamble +
`[Persona: name]` + stance + devices + lexicon + exemplars + the 3 selected grid contracts + output
constraints.

**Warmth axis renamed `affectionate` → `doting`** — "affectionate" was overloaded with the moderation
"suggestive/affectionate register" and read romantic, wrong for a wellness companion. `doting` is
non-romantic high-warmth. (The moderation register prose was intentionally left as-is.)

## Additive, not combinatorial

You do NOT author devices per grid permutation. 12 packs + **9** grid contracts (3 per axis) compose
into all 12 × 27 states. QA and authoring cost is additive.

## Speech (Inworld) — same data, three tracks

The pack is designed to drive spoken voice too (`inworld-tts-2` already supports the controls):
1. **Text → words:** generated text is spoken, so devices/lexicon/verbosity carry into speech for free.
2. **`voiceId` casting (timbre):** a separate per-preset field (informed by age/presentation/energy).
   Currently env-keyed to the 3 anchors (`INWORLD_VOICE_ID_*`); must become preset data when the
   gallery ships.
3. **Grid → prosody:** energy/warmth can drive `speakingRate` + `styleTag`, making tuning *audible* —
   the lever that makes premium tuning feel real in voice mode.

## Phasing

- **v1.0 free:** pick 1 of 12 (3 anchors + 9 gallery) + rename. No editing, no tuning.
- **v1.0 premium:** grid personality tuning (the mechanical contracts) + higher cap + locked companions.
- **v1.1:** appearance editor (on the 3 layered base faces only; the 12 gallery portraits stay
  pick-only flat) + deeper device/stance knobs + premium voices + audible prosody.

The structured pack is the shared backbone: v1.0 ships it fixed; v1.1 exposes `devices`/`stance` as
editable knobs. Nothing is re-authored.

## Status (as-built 2026-07-07)

**Done + green (553 tests pass):** `@aura/shared` manifest (packs + contracts + `getPersonaPack` /
`gridContractLines`); `prompt-assembler` composes packs (retired `BASE_VOICES`, fixed Orion's stale
"coach" voice to the steady-anchor canon); `doting` rename across shared/server/client/eval;
`eval:persona` tune-step delta + resumable per-cell cache; `eval:edge` companion/assistant-boundary probe.

**Eval PASSED (2026-07-07, real Groq run on a fresh free-tier daily bucket):** distinctness **36/36**
blind re-match (Claude-judged, all 3 scenarios, no confusable pair collapsed); tune-step **3/3 axes**
bite (warmth endearments 0/0/2, energy exclamations 0/0/1, verbosity sentences 1/2/2 with concise
question-count 0). Did **not** need the paid tier — the full 45-cell run (~55k tokens) fits one free
100k/day bucket; the probe is resumable if a bucket is mid-depleted.

**Response-shaping (research-backed, commit `fbc729d`):** replies were ~4x human length (fleet 57 words);
cut to **26 words/reply** via short in-persona exemplars + a turn-matching preamble + reworded verbosity
contracts + sparing backchannels — without losing distinctness (proven by the 36/36 re-match). Full cited
report: `docs/research/companion-response-shaping.md`.

**Companion/assistant boundary (commit `fbc729d`, `eval:edge`):** answer direct questions / story /
options instead of deflecting to feelings; conditioned the Aurora/Wren "ask a question" devices on the
turn; widened the medical guard to supplements / efficacy / dosage → route to a professional.

**12-gallery wired end-to-end (commit `455630a`):** `PERSONA_KEY` → the 12 ids (single source of truth in
`@aura/shared`); `PERSONA_PACKS` typed `Record<PersonaKey,...>`; public `PERSONA_PRESETS`
(id/name/tagline/defaultTraits) for the client; grid-validated `Create/UpdateCompanionSchema`;
**migration 0004** widens the DB CHECK to 12; create route seeds preset defaults; client re-exports.

**Resolved since 2026-07-06:** verbosity-vs-device tension FIXED (concise now yields ~1 sentence, no
question); crisis-line 988 false-positive FIXED (`deterministic.ts` downgraded the broad distress pattern
so L2-omni adjudicates instead of the preamble forcing a hotline).

**Still open (not code — deferred by design):**
1. **9 gallery avatars** (art-gated): onboarding + the create base-picker show the 3 anchors (they have
   portraits); the 12 surface via `PERSONA_GALLERY` once the 9 portraits land.
2. **`voiceId` casting for the 9:** `voice-session.ts` casts only the 3 anchors (env-keyed
   `INWORLD_VOICE_ID_*`); the 9 fall back to a warm default prosody + the adapter's default voice until
   Inworld voices are assigned.
