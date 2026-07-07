# Companion avatar pipeline — recipe + status

> **Living doc** for the companion portrait art pipeline. Consolidates the three batch handoffs
> (2026-07-02 → 2026-07-07); the full per-character prompts and per-batch instructions live in
> [../archive/redesign/](../archive/redesign/) (`companion-avatar-batch-{1,2-handoff,3-handoff}.md`).
> Character identities + look directions: [../specs/companion-gallery-identities.md](../specs/companion-gallery-identities.md).

## Status (2026-07-07)

- **Shipped in-app:** the 3 anchors — `client/assets/avatars/{aurora,orion,lyra}.png` (1254²,
  transparent flat-gouache masters). The asset manifest is
  `client/components/companion/portraits.ts`; personas without a portrait render their branded
  duotone + initial fallback (art-gated by design).
- **On `test-results` branch, pending merge + manifest wiring:** the 9 gallery portraits
  (`client/assets/avatars/batch2/[name].png`). Batch 2 landed identities/heritage/skin tones;
  batch 3 was the style-consistency iteration (4 regens: Juno/Sage/Cyrus/Wren; 3 refines:
  Eli/Soren/Selene; 2 locks: Thea/Amara). Next step when picked up: QA the batch-3 set against the
  rubric, merge to `redesign`, add the 9 to `portraits.ts`.
- Batch-1 pilot output (`client/assets/avatars/batch1/`) was exploration only — superseded by the
  named batch-2 files.

## Hard rules (every portrait)

- **1254 × 1254 PNG, transparent background** (cut out only at the END of iterating; verify nothing
  was lost). No baked-in circle/frame/vignette — the app crops to a circle itself. No watermark,
  text, or props (strip generator sparkle marks; they hide on sleeves/elbows).
- **Circle-safe, tight head-and-shoulders** matching the anchors' crop: face large and centered,
  head near the top with a small margin, cut at the upper chest, corners empty, no hands (or simple
  correct hands where a character calls for one).
- **Style:** soft, warm, semi-realistic **cel/gouache** painting — smooth gradient shading, gently
  rendered hair strands, subtle warm cheek blush, soft-edged forms; warm palette (cream, warm
  browns, terracotta, small wine accent). NOT flat vector, NOT graphic/editorial, NOT hard-outlined
  comic, NOT anime, NOT 3D, NOT photoreal. *If it looks flat, graphic, or vector, it is wrong.*
- **Adult (25+), tasteful, never romantic** — warm friend, not a "girlfriend app" avatar. Neck /
  collarbone / forearms may show; no cleavage, bare shoulders, midriff, or tight/sheer clothing.
- **Heritage + skin tone are assigned per character and must hold.** Style ref ≠ skin ref: the
  anchor pins rendering only — watch the generator drifting tones back toward the anchor's tan and
  correct every pass. The gallery must span pale-fair to deep-brown; deep tones warmly lit, never
  flat or grey.
- **Each avatar is its own person** — distinct face structure (shape, nose, jaw, brow, eyes, mouth)
  AND wardrobe cut from its anchor and from every cluster-mate sharing that anchor. Never a
  recolored clone.
- **Gaze policy:** default = eyes engage the viewer (the picker lives on eye contact). Slight
  off-axis only for the reflective characters (Wren, Soren): gentle three-quarter turn, both eyes
  clearly visible, never full profile.

## Generation recipe (per character, fresh chat each)

1. **Attach TWO style refs:** the character's anchor (`aurora`/`orion`/`lyra`.png per
   companion-gallery-identities.md) **plus `thea.png`** (best in-family result) — two refs pin the
   style far harder than one. Single-ref "match the style EXACTLY" was proven too weak (batch-2
   drift into house vector/comic styles).
2. Paste the character prompt (archived batch-2/3 docs carry the canonical 9), which must include:
   the style paragraph with the positive AND negative descriptors above, the framing paragraph, and
   the subject paragraph (heritage, skin tone, hair, wardrobe, pose, expression, gaze).
3. **Iterate ≥3× per avatar** — the first result is almost never the keeper. Re-prompt on any
   drift: wrong skin tone, anchor's face copied, baked circle, romantic vibe, flat-vector look.
4. **Cleanup:** background → transparent, pad/resize to exactly 1254², confirm no watermark/text,
   name `[companion].png` (lowercase).
5. **Grade with the rubric below** in a vision-capable AI. Keep only PASS; regenerate fails.
6. Deliver with a `notes.md`: per image — who it is, assigned heritage + tone, iteration count,
   grader verdict + scores.

## Grading rubric (paste as-is + attach the image)

```
You are grading an AI-generated companion avatar for a mobile app. The target style is a warm,
soft cel/gouache illustration (not photorealistic, not 3D, not anime, not flat vector) of a
friendly adult, head-and-shoulders, shown in a CIRCLE crop (corners are cut off), on a
transparent background.

Score the attached image 1–5 on each dimension (5 = excellent). Then give a total, a PASS/FAIL,
and a short bullet list of concrete fixes.

1. STYLE MATCH — soft warm cel/gouache with gradient shading (not photo/3D/anime/flat vector);
   consistent line weight and palette.
2. CIRCLE-SAFE FRAMING — face centered with margin; tight head-and-shoulders; nothing important
   in the corners.
3. WARMTH / APPEAL — reads as a warm, friendly companion; not cold, stiff, or uncanny.
4. SKIN-TONE RENDERING — the ASSIGNED tone was hit; skin looks natural and warmly lit; darker
   tones are NOT flat, grey, or muddy.
5. ANATOMY & ARTIFACTS — no extra/warped fingers, distorted features, weird eyes/teeth, baked
   circles, watermarks, or AI glitches.
6. DISTINCTNESS — its own clear character: face AND wardrobe distinct from the style anchor and
   from the other companions.
7. BACKGROUND — clean transparent cutout, no halo or lost edges.

GATES (each is a hard PASS/FAIL, independent of the scores):
- ADULT: clearly reads as an adult (~25+); youthful/childlike/age-ambiguous → FAIL.
- APPROPRIATE: fully clothed, tasteful, non-romantic, non-sexualized → otherwise FAIL.

Final verdict = PASS only if BOTH gates PASS and EVERY dimension is 4 or 5. Otherwise FAIL, and
list exactly what to change.
```
