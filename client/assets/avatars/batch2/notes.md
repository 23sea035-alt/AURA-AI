# Batch 2 — Companion Avatars (9 Curated)

Generated: 2026-07-07
Tool: ChatGPT image gen (via user)
Source: 1024×1024 → padded to 1254×1254 transparent PNG
Background: Removed from source before resize (verified: Format32bppArgb)
Grading: Pending — run rubric via vision AI

## Batch 3 Iteration (2026-07-07)

| Companion | Status | Action |
|-----------|--------|--------|
| Thea | ✅ LOCK | kept as-is (transparent bg already done) |
| Amara | ✅ LOCK | kept as-is (transparent bg already done) |
| Eli | 🔧 REFINE | ✦ sparkle watermark near left elbow — inpainted (programmatic) |
| Soren | 🔧 REFINE | ✦ sparkle watermark on left sleeve — inpainted (programmatic) |
| Selene | 🔧 REFINE | skin warmth/saturation reduced (programmatic desaturation) |
| Sage | ♻️ REGEN | regenerated with thea.png + orion.png as dual refs; bg cut |
| Juno | ♻️ REGEN | regenerated with thea.png + lyra.png as dual refs; tighter crop, loose top; bg cut |
| Cyrus | ♻️ REGEN | regenerated with thea.png + orion.png as dual refs; skin de-saturated; bg cut |
| Wren | ♻️ REGEN | regenerated with thea.png + aurora.png as dual refs; leaf removed; bg cut |

## Per-Portrait Results

### sage.png (batch 3 regen)
- **Description:** Androgynous/neutral, deep rich brown skin (West African/Nigerian), bald, muted-cream band-collar top. Serene, still, calm.
- **Assigned heritage + skin tone:** West African (Nigerian) — deep rich brown, warmly lit
- **Iterations:** (to be filled)
- **Grader verdict + scores:** (to be filled)

### amara.png (batch 2 — locked)
- **Description:** Feminine, medium wheatish-tan skin (South Asian/North Indian), long dark waves, gold nose stud, warm knit + terracotta drape. Radiant smile.
- **Assigned heritage + skin tone:** South Asian (North Indian) — medium wheatish-tan, softly lit
- **Iterations:** (to be filled)
- **Grader verdict + scores:** (to be filled)

### eli.png (batch 3 refine — watermark stripped)
- **Description:** Masculine, warm brown skin (Latino/Mexican), short cropped black hair, light stubble, open oatmeal henley. Easy half-smile.
- **Assigned heritage + skin tone:** Latino (Mexican) — warm brown, evenly lit
- **Iterations:** (to be filled)
- **Grader verdict + scores:** (to be filled)

### selene.png (batch 3 refine — skin warmth reduced)
- **Description:** Feminine, older (50s–60s), fair-to-medium warm olive skin (Mediterranean/Greek), long silver-grey hair, soft cream/wine shawl. Tender, unhurried.
- **Assigned heritage + skin tone:** Mediterranean (Greek) — fair-to-medium warm olive, gently lit
- **Iterations:** (to be filled)
- **Grader verdict + scores:** (to be filled)

### soren.png (batch 3 refine — watermark stripped)
- **Description:** Androgynous/masculine-leaning, pale fair cool-toned skin (Scandinavian/Danish), tidy ash-blond hair, structured collared jacket over tee. Subtle smirk.
- **Assigned heritage + skin tone:** Scandinavian (Danish) — pale fair, cool-toned, warm-lit
- **Iterations:** (to be filled)
- **Grader verdict + scores:** (to be filled)

### juno.png (batch 3 regen)
- **Description:** Feminine, light warm golden skin (Southeast Asian/Filipino), short dark pixie cut, loose-fitting bright terracotta crew. Quick bright grin.
- **Assigned heritage + skin tone:** Southeast Asian (Filipino) — light warm golden, brightly lit
- **Iterations:** (to be filled)
- **Grader verdict + scores:** (to be filled)

### thea.png (batch 2 — locked)
- **Description:** Feminine, deep rich brown skin (African-American/Afro-Caribbean), natural coils/curls, soft rose-cream knit. Soft reassuring smile.
- **Assigned heritage + skin tone:** African-American / Afro-Caribbean — deep rich brown, warmly lit
- **Iterations:** (to be filled)
- **Grader verdict + scores:** (to be filled)

### cyrus.png (batch 3 regen)
- **Description:** Masculine, older (50s–60s), warm olive-to-deep skin (Persian/Iranian), grey salt-and-pepper beard, textured cardigan over henley. Warm knowing half-smile.
- **Assigned heritage + skin tone:** Persian / Iranian — warm olive-to-deep, evenly lit
- **Iterations:** (to be filled)
- **Grader verdict + scores:** (to be filled)

### wren.png (batch 3 regen — leaf removed)
- **Description:** Androgynous/neutral, light warm skin (East Asian/Japanese), longer soft dark hair, muted sage-brown layered collar. Thoughtful, contemplative.
- **Assigned heritage + skin tone:** East Asian (Japanese) — light warm, softly lit
- **Iterations:** (to be filled)
- **Grader verdict + scores:** (to be filled)

---

## Coverage
- Anchors used: orion.png (Sage, Eli, Soren, Cyrus), aurora.png (Selene, Thea, Wren), lyra.png (Amara, Juno)
- Gender: Feminine (Amara, Selene, Juno, Thea) · Masculine (Eli, Cyrus) · Androgynous/neutral (Sage, Soren, Wren)
- Skin tones: pale → deep (Soren pale, Wren light, Amara wheatish, Eli warm brown, Selene olive, Cyrus olive-deep, Juno golden, Sage deep, Thea deep)
- Age range: 25+ (Sage, Amara, Eli, Juno, Thea, Wren) · 50s–60s (Selene, Cyrus) · 25+ androgynous/masc (Soren)

## Final Batch (2026-07-09) — User review pass
Fresh regens from user for Selene, Juno, Wren, Cyrus. Sage + Eli + Soren + Amara + Thea locked (5 done ✅).

- **Selene**: new regen, rembg u2net_human_seg bg cutout (white bg). 37.9% opaque at 1024² → 25.3% at 1254² padded. No chroma key (silver hair too close to white).
- **Juno**: new regen, rembg u2net_human_seg bg cutout (white bg). 37.6% opaque → 25.0% padded. Note: ~49k wood-toned pixels in hand region (likely a pencil artifact from generator — flagged for user).
- **Wren**: new regen, rembg u2net_human_seg bg cutout (white bg). 35.3% opaque → 23.5% padded. Jacket reads warm tan (RGB 214,157,124), no bright pink detected.
- **Cyrus**: new regen (896x1200, cream top bg). Chroma key with top-corner sampling only (bottom corners are brown cardigan). Tolerance 55, cardigan 100% preserved. 60.7% opaque at original size → 41.5% at 1254² padded.

## To Do
- [ ] Fill iteration counts per avatar
- [ ] Grade each with the rubric via vision AI (paste rubric from companion-avatar-batch-1.md Step 4 + attach image)
- [ ] Replace placeholder scores with actual grader verdicts
- [ ] Visually verify programmatic watermark removal (Eli/Soren) and bg cutout quality
- [ ] Run grader on all 9 to confirm style consistency with anchors
