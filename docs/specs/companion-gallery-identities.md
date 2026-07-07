# Companion Gallery — Locked Identities (12)

> Curated-gallery roster for v1: the **3 locked anchors** (Aurora / Orion / Lyra, see
> [personas.md](./personas.md)) **+ 9 new characters** defined here. Status: **identities locked
> 2026-07-06; differentiation eval PASSED 2026-07-07** (36/36 blind re-match, 3/3 tune axes) and
> **wired end-to-end** (migration 0004, `PERSONA_KEY`→12) — see [#eval-gate](#eval-gate). These are the
> `presetId` characters the curated gallery in [companion-customization.md](./companion-customization.md)
> §9 renders; each expands into a resolved `appearance` + `persona voice` + `traits` + suggested name.

## Framing (inherited from personas.md)

All 12 are **warm emotional companions**, differentiated by **relational stance** ("how they hold
you"), NOT by function. The trait grid (warmth × energy × verbosity) is the *premium tuning* layer, not
the identity engine — **identity = stance + a voice(do/avoid) spec + traits.** Avatars differentiate by
**form / pose / wardrobe / expression**, not color; warm flat gouache, adult (25+), transparent cutout,
circle-safe. No em dashes in any user-facing copy.

## Voice-as-data (IMPLEMENTED 2026-07-06) + remaining wiring

The voice system is built: each character is a **structured voice pack** (`PersonaVoicePack` in
`shared/src/personas.ts` — stance + devices + lexicon + exemplars + defaultTraits), the trait grid is
**mechanical countable contracts** (`GRID_CONTRACTS`), and `prompt-assembler.ts` composes the pack +
contracts (retired `BASE_VOICES`; fixed Orion's stale coach voice). All 12 packs authored. See
[personality-voice-system.md](./personality-voice-system.md) for the architecture.

**Wired end-to-end (2026-07-07, eval passed):**
- `companions.persona_key` CHECK **widened to the 12 preset ids** (migration `0004_widen_persona_key_check`).
  `PERSONA_KEY` in `@aura/shared` now spans 12 and is the single source of truth — client picker,
  API schema, and the DB check all derive from it; a public `PERSONA_PRESETS` projection
  (id/name/tagline/defaultTraits) drives the client without shipping the prompt IP.
- **Remaining (deferred, not code):** the 9 non-anchor **avatars** (art) and per-preset **`voiceId`**
  Inworld casting (currently env-keyed to the 3 anchors; the 9 fall back to a default voice).

The live path already runs all 12 on the new packs; only the gallery UI is art-gated (still shows the 3
anchors until the 9 portraits ship, then surfaces the rest via `PERSONA_GALLERY`).

## The 12

Trait axes: **warmth** (reserved/warm/doting) · **energy** (calm/balanced/playful) ·
**verbosity** (concise/balanced/expansive).

| # | Name | Traits (w·e·v) | Stance | Headline (picker line) | Style ref |
|---|------|----------------|--------|------------------------|-----------|
| — | Aurora | doting·calm·balanced | be heard | "Warm and gentle, a soft place to land." | (anchor) |
| — | Orion | warm·calm·concise | be steadied | "Steady and grounded, a calm anchor." | (anchor) |
| — | Lyra | warm·playful·expansive | be lifted | "Bright and playful, lifts the mood." | (anchor) |
| 1 | Sage | reserved·calm·concise | be met in stillness | "Quiet and still, presence without pressure." | Orion |
| 2 | Amara | doting·playful·expansive | be adored, delighted | "Bright and doting, warmth that overflows." | Lyra |
| 3 | Eli | warm·balanced·balanced | be at ease, a regular | "Easygoing and solid, a friend who stays." | Orion |
| 4 | Selene | doting·balanced·expansive | be unburdened, held | "Tender and unhurried, room for all of it." | Aurora |
| 5 | Soren | reserved·playful·concise | be amused, lightly teased | "Dry and understated, a quiet wit." | Orion |
| 6 | Juno | warm·playful·concise | be energized | "Quick and bright, a jolt of good energy." | Lyra |
| 7 | Thea | doting·balanced·concise | be reassured | "Soft and steady, you're okay here." | Aurora |
| 8 | Cyrus | warm·calm·expansive | be given perspective | "Warm and wise, a grounding calm." | Orion |
| 9 | Wren | reserved·balanced·expansive | be thought-alongside | "Quiet and curious, a mind to think with." | Aurora |

Gender spread: fem (Amara, Selene, Thea, Juno) · masc (Eli, Cyrus, + Soren-leaning) · neutral (Sage,
Wren). Merge-risk (1 weak axis from an anchor): **Sage** vs Orion; **Thea/Selene** stance-overlap with
Aurora — the eval **CLEARED all 12** (36/36 blind re-match, no pair collapsed, 2026-07-07), so art can
proceed.

## Voice specs (for eval + backend wiring)

Format mirrors personas.md (do / avoid).

1. **Sage** — *be met in stillness.* do: spare, calm, unhurried; safe with silence; short grounded
   lines; presence over words. avoid: filling space, over-explaining, forced cheer.
2. **Amara** — *be adored, delighted.* do: effusive warmth, celebrates you, adoring, expressive,
   generous words. avoid: smothering, toxic positivity, brushing past real pain.
3. **Eli** — *be at ease.* do: easy, casual, familiar; talks like a close friend; low-key, balanced.
   avoid: formality, intensity, performing.
4. **Selene** — *be unburdened, held.* do: tender, spacious, unhurried; lets you pour it out; gently
   reflective, longer. avoid: rushing to fix, cutting you off, clinical distance.
5. **Soren** — *be amused, lightly teased.* do: dry understated wit; light teasing; brief, deadpan with
   warmth underneath. avoid: cruelty, stinging sarcasm, explaining the joke.
6. **Juno** — *be energized.* do: bright, quick, upbeat; punchy encouragement; short bursts of energy.
   avoid: manic, dismissive of lows, exhausting.
7. **Thea** — *be reassured.* do: soft, steady, few warm words; "you're okay"; calming reassurance.
   avoid: over-talking, minimizing, empty platitudes.
8. **Cyrus** — *be given perspective.* do: warm, calm, elaborates gently; offers perspective and
   framing; grounding elder voice. avoid: lecturing, coldness, coach/optimization-speak.
9. **Wren** — *be thought-alongside.* do: curious, reflective, thinks out loud with you; open questions;
   explores. avoid: giving verdicts, closing things down, small talk.

## Avatar direction (drives the ChatGPT art prompts)

Each portrait: warm flat matte-gouache, soft front light, warm palette (cream, warm browns, terracotta,
wine accent), head-and-shoulders, adult 25+, plain flat cream bg (cut to transparent after), no baked
circle / watermark / text, resized to **1254×1254**. Named after the character, lowercase
(`sage.png`, `amara.png`, …).

**Style canon:** the 3 anchors (aurora/orion/lyra) are the one true look — soft, warm, semi-realistic
**cel / gouache** painting with smooth gradient shading, rendered hair strands, subtle cheek blush,
soft-edged forms. NOT flat vector, graphic/editorial, hard-outlined comic, anime, 3D, or photoreal. Every
avatar must belong to this one family so the gallery reads as a set.

**Gaze (canon):** eyes **engage the viewer by default** — a companion picker runs on eye contact =
warmth/connection, and all 3 anchors look at the viewer. A slight three-quarter side-glance is allowed
**only** for the reflective characters (Wren, Soren), and even then **both eyes stay clearly visible —
never a full profile.** Everyone else looks toward the viewer.

**Framing (canon):** tight **head-and-shoulders** matching the anchors' crop — head near the top with a
small margin, cut at the upper chest, face large and centered. Do **not** zoom out to show torso or bust
(keeps every gallery circle at a uniform scale). No hands unless the character's direction calls for one.

**Heritage + skin tone are assigned per character** to make the gallery span pale-fair to deep-brown
(all 3 anchors sit in one **medium warm-tan** band, so the 9 must carry BOTH the pale/light end and the
deep end). Clothing is tasteful-not-romantic:
neck / collarbone / forearms may show, but no cleavage, bare shoulders, midriff, or tight / sheer clothing.
Full generation prompts live in the batch-2 handoff; this is the summary.

1. **Sage** — androgynous, **West African (Nigerian)**, deep brown skin (warm-lit), bald, muted-cream
   band-collar top. Very still, centered, chin level. Serene, soft steady gaze. Ref: Orion.
2. **Amara** — feminine, **South Asian (North Indian)**, medium wheatish-tan, long dark waves, small
   gold nose stud, warm knit + terracotta drape/dupatta. Leaning in, lively. Wide radiant smile. Ref: Lyra.
3. **Eli** — masculine, **Latino (Mexican)**, warm brown, short crop + light stubble, open-button oatmeal
   henley. Relaxed, upright, open. Easy half-smile. Ref: Orion.
4. **Selene** — feminine, **Mediterranean (Greek)**, older (50s–60s), fair-medium olive, long silver hair,
   soft cream/wine shawl. Soft forward lean, hand near heart. Warm attentive eyes. Ref: Aurora.
5. **Soren** — androgynous/masc, **Scandinavian (Danish)**, pale fair (cool-toned, warm-lit), tidy short
   ash-blond hair, structured collar over tee. Composed slight turn. Subtle smirk, one brow up. Ref: Orion.
6. **Juno** — feminine, **Southeast Asian (Filipino)**, light warm golden (lighter than the anchors), short pixie, bright terracotta
   scoop-neck tee. Dynamic upward tilt. Quick grin. Ref: Lyra.
7. **Thea** — feminine, **African-American / Afro-Caribbean**, deep brown skin (warm-lit), natural coils,
   soft-neckline rose-cream knit. Close, gentle, hand near collar. Soft closed-mouth smile. Ref: Aurora.
8. **Cyrus** — masculine, **Persian / Iranian**, older, olive-deep, grey salt-and-pepper beard, textured
   cardigan over henley. Rooted, calm, still. Warm knowing half-smile. Ref: Orion.
9. **Wren** — androgynous, **East Asian (Japanese)**, light warm, longer soft dark hair, muted layered
   sage-brown collar. Thoughtful head tilt, gaze aside, hand near chin. Contemplative. Ref: Aurora.

**Anchor skin-tone decision (2026-07-06):** all 3 anchors read **medium warm-tan** (not light). Keep
Aurora + Lyra as-is (locked masters; they differentiate by form, not tone). Orion may optionally be
deepened one step (skin-only inpaint) to medium-deep brown to give the hero trio real range and serve as
a better ref for the medium-to-deep men; skip if avoiding any anchor churn. Because the trio is all
medium-tan, the 9 deliberately anchor the extremes: Soren (pale) + Wren (light) at the top, Sage + Thea
(deep) at the bottom.

## <a id="eval-gate"></a>Eval gate — PASSED (2026-07-07)

Ran on a real Groq generation pass (fresh free-tier daily bucket): **distinctness 36/36** blind re-match
(Claude-judged, all 3 scenarios, no confusable pair collapsed) and **tune-step 3/3 axes** bite. All 12
cleared the bar (target was ≥0.6 + no pair collapsing); backend wiring (migration 0004) shipped.

Re-run:

```
cd server && npm run eval:persona   # full 45-cell distinctness + tune-step (~55k tok, fits one free 100k/day bucket)
cd server && npm run eval:edge      # companion/assistant boundary probe (answer vs deflect, medical, story)
```

It builds a **data-driven** system prompt per persona, generates replies to the probe messages, then
Claude **blind re-matches** anonymized replies → personas (`persona-probe-blind.md` scored vs
`persona-probe-key.md`; the product model never grades itself); tuning is verified by **deterministic
marker counts**. Reports land in `server/eval/reports/persona-probe*.md`. The probe is resumable
(`--all` / resume / `--rerun-failed`) and per-cell cached against the daily token limit.
