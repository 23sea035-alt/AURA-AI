# Companion Avatars — Batch 3 (iteration pass) — for Atheeq

> **Follow-up to [companion-avatar-batch-2-handoff.md](./companion-avatar-batch-2-handoff.md).** Batch 2
> landed the identities, heritage, and skin tones well — but the set is **not stylistically consistent**
> with the 3 anchors (aurora/orion/lyra) or with each other. This pass fixes that. We are **not settling
> for "good"** — iterate hard until each regen genuinely matches the anchor look.
>
> **Same rules as batch 2** (1254² PNG, transparent at the very end, no baked circle, adult, tasteful-not-
> romantic, distinct person, heritage + skin tone held). Read that doc's Hard Rules first; this doc only
> adds the fixes. Work on **`test-results`**, images in **`client/assets/avatars/batch2/`** (overwrite the
> same filenames). Keep iterating ≥3× per avatar — more if it still isn't right.

## Status of the 9

| Companion | Status | Action |
|-----------|--------|--------|
| **Thea** | ✅ LOCK | keep. best style match. bg cutout only. |
| **Amara** | ✅ LOCK | keep. bg cutout only. |
| **Eli** | 🔧 REFINE | **strip the ✦ sparkle watermark near his LEFT elbow** (faint but present), then bg cutout. Otherwise good. |
| **Soren** | 🔧 REFINE | **strip the ✦ sparkle watermark on his LEFT sleeve** (very visible), then bg cutout. Otherwise good. |
| **Selene** | 🔧 REFINE | dial skin warmth/saturation down (reads too orange for fair-olive), then bg cutout. |
| **Juno** | ♻️ REGEN | looser top + tighter crop + style (see below). |
| **Sage** | ♻️ REGEN | style only — currently flat vector, needs anchor cel look. |
| **Cyrus** | ♻️ REGEN | style + skin over-saturated; no hands, rooted. |
| **Wren** | ♻️ REGEN | style + remove the green leaf prop. (Eyes are fine — both visible — keep the three-quarter side-glance.) |

So: **2 locks** (Thea, Amara — cutout only), **3 refines** (Eli, Soren, Selene), **4 regens** (Juno, Sage, Cyrus, Wren).

## The style lock (why batch 2 drifted, and how to stop it)

"Match the art style EXACTLY" was too weak — the generator fell back to its house styles (flat vector for
Sage/Wren/Cyrus, glossy comic for others). Three fixes, applied to every regen prompt below:

1. **Attach TWO refs to each chat:** the character's anchor (aurora/orion/lyra) **AND `thea.png`** (our
   best-matching batch-2 result). Two references pin the target far harder than one.
2. **Positive descriptors:** soft, warm, semi-realistic **cel / gouache** painting — smooth *gradient*
   shading, gently rendered individual hair strands, a subtle warm cheek blush, soft-edged forms, a small
   clean face.
3. **Negative descriptors:** NOT flat vector, NOT graphic/editorial, NOT hard-outlined comic, NOT anime,
   NOT 3D, NOT photoreal. **If the result looks flat, graphic, or vector, it is wrong — regenerate.**

## Gaze policy (applies to all regens + future art)

- **Default: eyes engage the viewer.** A companion picker lives on eye contact = warmth/connection, and
  all 3 anchors look at the viewer. Sage, Cyrus, Juno → **look toward the viewer.**
- **Slight off-axis allowed** only for the reflective characters (**Wren**, and Soren) — a gentle
  three-quarter turn with a soft side-glance, **both eyes clearly visible, never a full profile.** Wren's
  batch-2 gaze is already fine (both eyes visible) — keep it; the regen is for style + the leaf, not the eyes.

## Framing / scale lock

Match the anchors' crop so the gallery circles look uniform: **tight head-and-shoulders**, head near the
top with a small margin, cut at the **upper chest** — do NOT zoom out to show torso or bust. Keep the face
large and centered. This directly fixes Juno (too much torso) and the zoomed-out feel on a few others.

## The 4 regen prompts (attach the named anchor + `thea.png` to each chat)

**batch3 · JUNO — attach `lyra.png` + `thea.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference images EXACTLY — the anchor and thea.png are the canon look: a soft, warm, semi-realistic CEL / gouache painting with smooth gradient shading, gently rendered individual hair strands, a subtle warm cheek blush, soft-edged forms, and a small clean face, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). This is NOT flat vector art, NOT graphic/editorial illustration, NOT hard-outlined comic art, NOT anime, NOT 3D, NOT photoreal. If it looks flat, graphic, or vector, it is WRONG — add soft painterly gradient shading.
Framing: TIGHT head-and-shoulders portrait matching the anchors' crop — head near the top with a small margin, cut at the upper chest. Do NOT zoom out to show the torso or chest. Face centered and large, generous margin, corners empty (it will be cropped to a circle later). No circle, frame, border, vignette, or baked-in crop. No hands. Plain flat even cream background (cut to transparent only at the very end). No text, watermark, logo, signature, or props.
Subject: an adult woman, clearly 25+. Feminine presentation, Southeast Asian (Filipino) heritage. Light warm golden skin, a touch lighter than the tan anchors, brightly and softly lit. Short, lively dark pixie crop (no auburn or warm highlights). Tastefully dressed as a bright friend, not a romantic companion: a bright, relaxed, LOOSE-FITTING crew or soft tee in warm terracotta with a modest round neckline — loose and casual, NOT tight or form-fitting, no bust emphasis. Pose: upbeat, a slight upward lift and asymmetric tilt, energetic but shoulders relaxed. Expression: quick bright grin, sparkling lively eyes looking toward the viewer. A jolt of warm, upbeat energy. Same art style as the references, but a clearly different person from them, never a recolored copy of a reference's face.
```

**batch3 · SAGE — attach `orion.png` + `thea.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference images EXACTLY — the anchor and thea.png are the canon look: a soft, warm, semi-realistic CEL / gouache painting with smooth gradient shading, gently rendered individual hair strands, a subtle warm cheek blush, soft-edged forms, and a small clean face, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). This is NOT flat vector art, NOT graphic/editorial illustration, NOT hard-outlined comic art, NOT anime, NOT 3D, NOT photoreal. If it looks flat, graphic, or vector, it is WRONG — add soft painterly gradient shading.
Framing: TIGHT head-and-shoulders portrait matching the anchors' crop — head near the top with a small margin, cut at the upper chest. Face centered and large, generous margin, corners empty (it will be cropped to a circle later). No circle, frame, border, vignette, or baked-in crop. No hands. Plain flat even cream background (cut to transparent only at the very end). No text, watermark, logo, signature, or props.
Subject: an adult, clearly 25+. Androgynous / gender-neutral presentation, West African (Nigerian) heritage. Deep, rich brown skin, warmly and evenly lit (never flat or grey). Bald / clean-shaven head, clean calm features. Tastefully dressed as a grounding friend, not a romantic companion: a plain muted-cream top with a simple band / mandarin collar; the neck may show, but no bare shoulders, cleavage, or tight or sheer clothing. Pose: very still, centered, shoulders squared, chin level, calm and contained. Expression: serene, gently closed mouth, soft steady eyes looking toward the viewer. A quiet, grounding presence. Same art style as the references, but a clearly different person from them, never a recolored copy of a reference's face.
```

**batch3 · CYRUS — attach `orion.png` + `thea.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference images EXACTLY — the anchor and thea.png are the canon look: a soft, warm, semi-realistic CEL / gouache painting with smooth gradient shading, gently rendered individual hair strands, a subtle warm cheek blush, soft-edged forms, and a small clean face, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). This is NOT flat vector art, NOT graphic/editorial illustration, NOT hard-outlined comic art, NOT anime, NOT 3D, NOT photoreal. If it looks flat, graphic, or vector, it is WRONG — add soft painterly gradient shading.
Framing: TIGHT head-and-shoulders portrait matching the anchors' crop — head near the top with a small margin, cut at the upper chest. Face centered and large, generous margin, corners empty (it will be cropped to a circle later). No circle, frame, border, vignette, or baked-in crop. No hands. Plain flat even cream background (cut to transparent only at the very end). No text, watermark, logo, signature, or props.
Subject: an older adult man, clearly in his 50s-60s. Masculine presentation, Persian / Iranian heritage. Warm olive-to-deep skin, evenly lit, natural (NOT over-saturated or orange). Grey hair with a neat salt-and-pepper short beard. Tastefully dressed as a grounding elder friend: a textured warm cardigan in muted brown over a simple henley or tee, open at the neck; nothing tight or suggestive. Pose: rooted, calm, still, gently upright, shoulders squared (no hands). Expression: warm, knowing, a soft wise half-smile, steady eyes looking toward the viewer. A grounding elder who offers perspective. Same art style as the references, but a clearly different person from them, never a recolored copy of a reference's face.
```

**batch3 · WREN — attach `aurora.png` + `thea.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference images EXACTLY — the anchor and thea.png are the canon look: a soft, warm, semi-realistic CEL / gouache painting with smooth gradient shading, gently rendered individual hair strands, a subtle warm cheek blush, soft-edged forms, and a small clean face, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). This is NOT flat vector art, NOT graphic/editorial illustration, NOT hard-outlined comic art, NOT anime, NOT 3D, NOT photoreal. If it looks flat, graphic, or vector, it is WRONG — add soft painterly gradient shading.
Framing: TIGHT head-and-shoulders portrait matching the anchors' crop — head near the top with a small margin, cut at the upper chest. Face centered and large, generous margin, corners empty (it will be cropped to a circle later). No circle, frame, border, vignette, or baked-in crop. Plain flat even cream background (cut to transparent only at the very end). No text, watermark, logo, signature, or props — and NO leaf, plant, flower, or object in the hands.
Subject: an adult, clearly 25+. Androgynous / gender-neutral presentation, East Asian (Japanese) heritage. Light warm skin, softly lit. Longer, soft, loosely tucked dark hair in natural black-brown (no auburn or warm highlights). Tastefully dressed as a thoughtful friend: a muted layered top with a soft collar in warm sage-brown; the neck may show, but nothing tight, bare, or suggestive. Pose: thoughtful and contemplative — a gentle three-quarter turn with the eyes glancing softly to the side; BOTH eyes clearly visible, NOT a full profile. A hand may rest lightly near the chin but must be empty (no objects). Expression: quiet, curious, contemplative. A reflective mind that thinks alongside you. Same art style as the references, but a clearly different person from them, never a recolored copy of a reference's face.
```

## Cleanup / refine checklist (non-regen)

- **Thea, Amara** (locks): background → transparent only.
- **Eli:** strip the ✦ sparkle watermark near his **left elbow** (faint), then background → transparent.
- **Soren:** strip the ✦ sparkle watermark on his **left sleeve** (very visible), then background →
  transparent.
- **Selene:** reduce skin warmth/saturation (too orange for fair-olive) — a targeted edit if it stays
  clean, otherwise a light regen — then background → transparent.
- All of the above: confirm crop/scale roughly matches the anchors; re-crop if one is noticeably zoomed
  out.

## Definition of done

4 regens (Juno, Sage, Cyrus, Wren) read as the **same soft cel/gouache family as the anchors** (not
flat/vector), leaf gone, Juno's top loose + crop tight, gazes per the policy; Eli + Soren watermark-free;
Selene skin de-saturated; all 9 cut to transparent, at 1254², named `[companion].png`, on `test-results`.
Update `notes.md` (iterations + which were regenerated). Then ping the main session.
