# Companion Customization — Design & Phasing

> Design record for pivoting from "3 fixed personas" to **customizable companions**. Status: **agreed
> direction, pre-implementation.** Backend serves both phases with no migration between them. Numbers in
> the v1 library table are **confirmed**; items tagged `[DECIDE]` are open.

## 1. The decision in one paragraph

Companions become **customizable**, but customization is a **content-pipeline problem, not a runtime-ML
problem**. Users primarily **pick from a curated gallery of distinct characters** (each a hand-chosen
look + personality + voice); an **optional appearance editor** (hair / skin tone / shirt) is layered on
top for those who want it. All art is a **curated library authored offline** (Nano Banana + cleanup),
so runtime is just selection/compositing — **free, instant, on-brand, and with zero per-image
moderation**. The 3 approved anchors (**Aurora / Orion / Lyra**) are **kept** as the style DNA, the base
faces, and the seed characters of the gallery.

## 2. Why not runtime image generation

Competitors split into two camps: **parametric/component builders** (Replika's avatar creator,
Kindroid's 47-parameter "Codex") and **generative photoreal** (Candy AI, SweetDream, Kindroid selfies).
Photoreal generation (InstantID/LoRA/Flux, or per-user Nano Banana) is powerful but **wrong for Aura**:

- It produces near-photographic faces that **clash with the warm flat-illustration aesthetic** — our
  differentiator.
- **Per-image cost** (~$0.02–0.05), **latency** (~4s), and **mandatory image moderation** (Apple UGC).
- **Reproducibility/consistency** burden across a companion's lifetime.

Curated components avoid all four. Nano Banana is used **as an offline authoring accelerator** (its
character-consistency feature is ideal for producing a *consistent* asset library from the anchors),
**not** as a runtime dependency.

## 3. Model

- **Primary UX — curated character gallery.** Each character = a chosen appearance permutation +
  personality (trait defaults) + voice + suggested name. This *is* "distinct personalities based on axis
  permutations" — design picks the good permutations; users just pick a character. Onboarding stays
  "meet a companion" (matches the redesign).
- **Optional — appearance editor.** Tweak hair / skin tone / shirt on a chosen base. Opt-in, so it never
  gates onboarding. This is the "customizability" layer, and it's what defers to v1.1.
- **Personality is decoupled from appearance.** Presets bundle them for convenience, but personality
  tuning is its own (premium) axis (already in the paywall). `persona_key` remains the personality
  archetype that drives the system prompt + default voice.

## 4. Architecture — layered compositing + skin-as-tint (why QA is additive)

The load-bearing insight: **QA cost is additive, not multiplicative**, because the axes are independent
layers rather than pre-rendered combinations.

- **Skin tone = a runtime tint** on the skin layer (a color parameter, not an asset). No multiplication.
- **Hair + shirt = transparent-PNG overlays** that must align on each base face.
- QA = **each layer once per base face** + a few tint spot-checks — *not* every combination.

> 3 base faces × (10 hair + 6 shirt) = **~48 layer placements** to verify + skin-tint checks ≈ **~55 QA
> items**, yielding **3 × 8 × 10 × 6 = 1,440 distinct looks**. The equivalent pre-rendered matrix would be
> **1,440 images to author and test** — which is the complexity we are explicitly avoiding.

## 5. v1 library (confirmed)

| Axis | Mechanism | Free | Premium |
|---|---|---|---|
| **Base face / pose** | pre-rendered (from the 3 anchors) | 3 (Aurora / Orion / Lyra) | more later (art cost) |
| **Skin tone** | runtime **tint** | full realistic spectrum (~8) | + fantasy set (3–4) |
| **Hairstyle** | overlay asset | ~6 of 10 (bald incl. as "none") | all 10 + 2–3 exclusives |
| **Shirt** | overlay asset | ~4 of 6 | all 6 + 2 exclusives |
| **Personality** | traits / system-prompt | preset defaults | tuning (already premium) |
| **Voice** | Inworld `voice_id` | preset voice | premium voices |
| **Companion cap** | count of owned companions | **5** | **20** |

## 6. Skin-tone policy

- **Realistic, inclusive spectrum is the free baseline** (representation + the "warm, real, emotionally
  present" positioning). Delivered as a **tint** so it's ~free to offer.
- **Non-human tones** (green/blue/lavender) are a **small, separate premium set** — a "fun" flourish,
  kept out of the realistic range and never the default.
- **Art-direction requirement:** every tone must render *warmly*. The common failure is darker tones
  getting flat/poor shading — make this an explicit QA gate.

## 7. Monetization shift (reconcile before launch)

Free now gets creation + customization (capped), so premium levers move to: **cap (5 → 20), premium
hairstyles / shirts / fantasy skins, premium voices, personality tuning.** Reconcile with the paywall
copy (`client/constants/content/paywall.ts`) and [voice-pricing-economics.md](voice-pricing-economics.md).
`[DECIDE]` final premium-option boundary.

## 8. Backend design (serves both phases; no migration between them)

- **Schema (`companions`):** add
  - `appearance jsonb` — the **resolved** spec `{ baseFaceId, skinTone, hairId, shirtId }`. A gallery
    preset simply expands into this shape, so **v1 (pick a preset) and v1.1 (edit the fields) use the
    same column** — no migration.
  - `voice_id text` — per-companion Inworld voice override (default from the persona/preset).
  - Keep `persona_key` (personality archetype) + its CHECK.
- **Asset manifest** (`@aura/shared`, static): the single source of truth listing base faces, hairstyles,
  shirts, skin tones, and gallery presets — each with an `id`, an asset ref, and a `premium` flag. Client
  renders gallery/pickers from it; server **validates** `appearance` against it (ids exist + premium
  gating vs the user's tier).
- **Entitlement:** `MAX_COMPANIONS_FREE = 5`, `MAX_COMPANIONS_PREMIUM = 20` (`@aura/shared`), enforced on
  `POST /companions` (count of owned companions — `[DECIDE]` whether archived count toward the cap; lean
  **yes**, archived still owned). Per-option premium gating on create/update.
- **Presets/gallery:** a manifest section (curated characters → resolved `appearance` + default
  `persona_key`/traits + `voice_id` + suggested name).
- **Moderation:** curated components need **no image moderation**; only custom **names** (already handled).

## 9. Phasing

### v1 — curated gallery (pick-only)
- **Scope:** ~24–28 pre-rendered character portraits (a curated set of permutations, not a matrix) from
  the 3 anchors; user picks a character (`presetId` → stored as resolved `appearance`); per-companion
  voice; creation caps (5 / 20). **No live editor, no runtime compositor, no tint rig.**
- **Effort:** art **~1–2 wks** (bounded portrait set) · client gallery **~2–4 days** · backend **~2–3 days**
  → **~2–3 weeks, art-dominated.**
- **Why this slice:** delivers the differentiator (personalized companions, real variety, creation caps)
  without the two things that add weeks — the layered/tint **art rig** and the RN **Skia compositor**.

### v1.1 — live appearance editor (fast-follow)
- **Scope:** layered hair/shirt overlays + skin-tint rig + an RN compositor (`react-native-skia`) + the
  builder UI. Unlocks per-axis editing on top of any base.
- **Effort:** **~3–4 weeks** (art rig + compositor are the long poles).
- **Reuse:** the v1 backend schema/manifest already support it — **nothing is thrown away**; v1.1 is
  additive art + client.

## 10. Risks & compression levers

**Risks:** (1) **art-pipeline learning curve** — widest estimate; Nano Banana gives consistent *drafts*
fast, but transparent-PNG cleanup + alignment is manual. (2) **RN live compositing** (v1.1 only) — Skia
tint+layer work; the v1 gallery sidesteps it. (3) **skin-tone representation QA** — non-negotiable art time.

**Compression levers (if even v1 is tight):** fewer gallery characters (12 not 28); 3–4 **baked** skin
tones instead of the full tint spectrum (defers the tint rig to v1.1); reuse the 3 anchor bodies with
hair/skin swaps only.

## 11. Open decisions (`[DECIDE]`)
1. Final **premium-option boundary** (cap-only vs + exclusive looks/voices) → reconcile paywall/pricing.
2. Do **archived** companions count toward the creation cap? (lean yes)
3. v1 gallery size (24–28 vs a compressed 12).
4. Fantasy skin set — in v1 or hold for v1.1?

---

## Appendix A — Art production brief (delegable)

This section is a self-contained brief so art can be produced **independently** (e.g. by a coworker)
against the 3 approved anchors. Produce assets to this spec so they drop straight into the manifest.

**Inputs provided:** the 3 approved anchor illustrations (Aurora / Orion / Lyra) — these are the **style
reference and the base faces/poses**. All new assets must match their warm flat-illustration style,
palette, line weight, and soft front-lighting.

**Tooling:** Nano Banana (Gemini 2.5 Flash Image) is recommended for *drafting* consistent variations
(feed an anchor as the reference; use its character-consistency to hold the face/pose while changing hair
or shirt). Any tool is fine — **the deliverable spec is what matters, not the tool.** Expect **manual
cleanup** (background removal to transparency, edge cleanup, alignment) after generation.

**Canonical framing (all assets):**
- Square canvas, upper-body portrait, **head + shoulders in a fixed position** across every asset so
  overlays register. `[DECIDE final px]` (e.g. 1024×1024).
- Consistent camera/angle and soft front light. No pants/footwear (out of scope).

**Deliverables by phase:**

- **v1 (gallery, pick-only) — the delegable slice, needed first:**
  - **~24–28 full character portraits** = curated permutations built from the 3 anchors (vary hair /
    skin / shirt to taste), each a complete flat image on the app background. Naming: `char_<slug>.png`.
    For each, note the intended personality + a voice suggestion so it can be wired to a preset.
  - Simpler skill: **no layer separation or tinting required** for v1 — just finished portraits.

- **v1.1 (editor) — layered assets, can be produced in parallel but not blocking v1:**
  - **Base faces** (3): authored with a **separate flat skin layer + a shading/line layer** (multiply)
    so skin can be **recolored by tint** cleanly. `base_<anchor>.png` (+ layer sources).
  - **Hair overlays** (10, incl. a "bald"/none = no asset): transparent PNGs aligned to the canonical
    framing, readable on all base faces. `hair_01..hair_10.png` (+ mark premium ones).
  - **Shirt overlays** (6): transparent PNGs, same framing. `shirt_01..shirt_06.png` (+ premium).
  - **Skin-tone spec:** the realistic tint spectrum (~8) as color tokens/swatches + QA renders on each
    base proving warm shading across all tones. Fantasy tones (3–4) as a separate premium set.

**Pilot first (strongly recommended):** before producing the full set, do a **1-base pilot** — one base
face, 2 hairstyles, 2 shirts, the full skin-tint range — and review for style/consistency/alignment.
Validate the pipeline on ~6 assets before scaling to the whole library. This catches framing/registration
and skin-shading issues while they're cheap to fix.

**Definition of done (per asset):** matches anchor style; correct canonical framing/registration;
transparent where specified; named per convention; premium flag noted; (v1.1) skin layer separated for
tinting.
