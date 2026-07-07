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
  stance,        // the relational job: "you help the user feel heard"
  devices[],     // concrete behavioral MOVES ("name the feeling before anything else")
  lexicon,       // diction ("soft address like 'love' fits her")
  exemplars[],   // 1-2 few-shot turns — show, don't tell (strongest adherence lever)
  defaultTraits, // this character's default grid point
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
| verbosity | 1–2 sentences, no question / 2–3 sentences / 3–4 sentences |

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

- **v1.0 free:** pick 1 of 15 (3 anchors + 12 gallery) + rename. No editing, no tuning.
- **v1.0 premium:** grid personality tuning (the mechanical contracts) + higher cap + locked companions.
- **v1.1:** appearance editor (on the 3 layered base faces only; the 12 gallery portraits stay
  pick-only flat) + deeper device/stance knobs + premium voices + audible prosody.

The structured pack is the shared backbone: v1.0 ships it fixed; v1.1 exposes `devices`/`stance` as
editable knobs. Nothing is re-authored.

## Status (as-built 2026-07-06)

**Done + green (542 tests pass):** `@aura/shared` manifest (packs + contracts + `getPersonaPack` /
`gridContractLines`); `prompt-assembler` composes packs (retired `BASE_VOICES`, fixed Orion's stale
"coach" voice to the steady-anchor canon); `doting` rename propagated across shared/server/client/eval;
`eval:persona` extended with the tune-step delta test.

**Verified qualitatively:** with real packs, replies are visibly distinct (Aurora "sweet one/love" +
question; Orion short/grounded/no-endearment; Sage spare; Amara endearment-flood; Soren dry; etc.), and
the warmth/energy contracts bite (reserved drops endearments; playful adds an image).

**Open / not done here:**
1. **Automated eval gate is blocked** by Groq free-tier token limits (the probe rate-limited to error
   cells; harness prints a `RATE-LIMITED` warning and is correct). Re-run on the **paid Groq tier** (a
   known v1 go-live gate) to get the real distinctness + tune-step numbers and gate ≥60% / orderable steps.
2. **Verbosity-vs-device tension:** on a question-asking persona (Aurora), the `concise` "no follow-up
   question" contract loses to the always-on "ask a soft question" device + exemplars. Either make
   `concise` explicitly cancel a trailing question, or scope the device out at the concise level.
3. **Backend wiring (gated on the eval):** the `companions.persona_key` CHECK is still `in
   ('aurora','orion','lyra')` — expanding to the 12 preset ids + carrying the pack/`voiceId` on the
   gallery preset (per customization §8) is a migration, deliberately deferred until the eval passes.
4. **Crisis-line false-positive** (separate moderation ticket): the safety preamble injects 988 on
   plain venting ("i'm drained") for some personas — over-triggering; calibrate.
