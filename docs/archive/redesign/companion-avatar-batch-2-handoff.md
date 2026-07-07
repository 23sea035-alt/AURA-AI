# Companion Avatars — Batch 2 Handoff (9 curated characters) — for Atheeq

> **Atheeq owns this task.** Self-contained handoff to generate the 9 curated-companion avatars, while
> the main session works the backend personality system. Everything you need is here or linked. This is
> **art only** — do **not** touch backend / persona code or wire anything into the app.
>
> **Where the work goes:** commit all output to the **`test-results`** branch, images saved in
> **`client/assets/avatars/batch2/`**. Ping the main session when done.

## Goal

Produce **9 companion portrait PNGs** for the curated gallery, one per locked character, in the exact
warm flat-gouache style of the 3 anchors. Deliver to `client/assets/avatars/batch2/` on the
`test-results` branch, with a `notes.md`.

**Naming: each file is named after its character, lowercase** — `sage.png`, `amara.png`, `eli.png`,
`selene.png`, `soren.png`, `juno.png`, `thea.png`, `cyrus.png`, `wren.png`. (NOT `batch2-01.png`.) The
`batch2-01 … batch2-09` labels below are only prompt IDs for your reference, not filenames.

## Source of truth

- **Identities + avatar direction:** [docs/specs/companion-gallery-identities.md](../specs/companion-gallery-identities.md)
  (the 9 characters, their look, and which anchor is the style ref).
- **Style north-star (open these, compare constantly):** `client/assets/avatars/aurora.png`,
  `orion.png`, `lyra.png`.
- **Prior batch + its lessons:** [companion-avatar-batch-1.md](./companion-avatar-batch-1.md) (original
  brief + grading rubric). Batch-1 files live in `client/assets/avatars/batch1/`.

## Hard rules (every image)

- Final: **1254 × 1254 PNG**, square.
- **Transparent background** (cut out the subject) — the 3 anchors are transparent cutouts. Leave the opaque cream background while iterating. At the very end of iterating on an avatar, remove the background (look up a tool to help you do it, and verify that nothing crucial to the image was lost before you submit the transparent background pngs).
- **No baked-in circle / vignette / frame** — the app crops to a circle itself. Batch-1's `01` baked a
  circle onto a white square; do NOT repeat it.
- **No watermark / text / signature / logo** (strip any generator watermark in cleanup).
- Circle-safe framing: face centered, generous margin, nothing important in corners; head-and-shoulders
  (upper body) only.
- Warm flat matte-gouache illustration, soft front light, warm palette (cream, warm browns, terracotta,
  small wine accent). NOT photoreal / 3D / anime.
- **Adult (25+)** — hard gate.
- **Tastefully dressed, not romantic** — everyday clothing MAY show the neck, collarbone, and forearms (a relaxed crew, scoop, henley, or open collar is fine). NO cleavage, bare shoulders, midriff, or tight / sheer / suggestive clothing. Every avatar must read as a **warm friend, never a "girlfriend" / romantic-companion** avatar.
- **Deliberate skin-tone + heritage diversity** — each character has an assigned heritage and skin tone (in its prompt below); hold to it. The gallery must span pale-fair to deep-brown, not cluster in one tan band.
- **Style ref ≠ skin ref.** The attached anchor sets the ART STYLE / rendering ONLY. Do NOT copy its skin tone, hair, or features. Several characters are deliberately far from their anchor's medium-tan (Soren pale, Sage + Thea deep, Wren + Juno light); watch for the generator drifting them back toward the anchor's tan and correct it every pass.
- **Each avatar is its own person, not a recolored clone.** Same art style, DIFFERENT individual: distinct face shape, nose, jaw, brow, eyes, and mouth from the anchor AND from every other character. This matters most inside the shared-anchor clusters — the 4 on `orion.png` (Sage, Eli, Soren, Cyrus) and the 3 on `aurora.png` (Selene, Thea, Wren) and 2 on `lyra.png` (Amara, Juno) must NOT read as siblings. Vary facial structure, not just skin/hair. **Wardrobe must also differ** in garment type / silhouette / collar from the anchor AND from cluster-mates (color overlap is fine — the shared palette is deliberately narrow, so differentiate by cut, not hue). Grader rubric §DISTINCTNESS enforces this; if two read as the same face, regenerate.

## Pipeline (ChatGPT, one character per fresh chat)

ChatGPT image gen will not natively give transparent bg, exact 1254px, or guaranteed no-watermark — so
every generation needs the cleanup below.

1. Open a new chat. **Attach the character's style-ref anchor photo** (listed per prompt).
2. Paste that character's prompt (below). **Iterate at least 3 times per avatar** — generate, look
   critically, regenerate with corrections, and only keep one once it genuinely looks good. The first
   result is almost never the keeper; do NOT settle early. Re-prompt on any drift (wrong skin tone,
   anchor's face copied, baked circle, romantic vibe, etc.).
3. **Cleanup (every image):** (a) remove background → transparent PNG, (b) pad/resize to exactly
   **1254 × 1254**, (c) confirm no watermark/text/border, (d) name it after the character, lowercase —
   `sage.png`, `amara.png`, etc.
4. **Grade** with the rubric in [companion-avatar-batch-1.md](./companion-avatar-batch-1.md) Step 4
   (paste rubric + attach image into a vision AI). Keep only PASS images; regenerate fails (this is part
   of the 3+ iterations, not a substitute for them).
5. **Commit** the passing PNG to `client/assets/avatars/batch2/` on the **`test-results`** branch.

## Run order

All 9 are cleared to generate now (identities locked). Suggested order — distinct-and-easy first:
**Amara, Eli, Soren, Juno, Cyrus, Wren**, then **Sage, Thea, Selene**. (The last three sit close to an
anchor in *personality*, but their **look** is fully specified and independent, so art is safe.)

## The 9 prompts (attach the named anchor photo to each chat)

**batch2-01 · SAGE — attach `orion.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference image EXACTLY: a warm, flat, matte gouache / soft paper-texture illustration with simplified flat shading and soft front lighting, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). NOT photorealistic, NOT 3D, NOT anime.
Framing: head-and-shoulders portrait, upper body only, no hands, no full body. Face centered with generous margin. It will be cropped into a circle later, so keep the corners empty and nothing important near the edges. Do NOT draw a circle, frame, border, vignette, or any baked-in crop. Plain, flat, even cream background (no heavy texture) so it can be cut out cleanly. No text, no watermark, no logo, no signature.
Subject: an adult, clearly 25+. Androgynous / gender-neutral presentation, West African (Nigerian) heritage. Deep, rich brown skin, warmly and evenly lit (never flat or grey). Bald / clean-shaven head, clean calm features. Tastefully dressed as a grounding friend, not a romantic companion: a plain muted-cream top with a simple band / mandarin collar; the neck may show, but no bare shoulders, cleavage, or tight or sheer clothing. Pose: very still, centered, shoulders squared, chin level, calm and contained. Expression: serene, soft steady gaze, gently closed mouth. A quiet, grounding presence. Same art style as the reference, but a clearly different person: give a different face (shape, nose, jaw, brow, eyes, mouth) and a different outfit from the reference and from the other companions, never a recolored copy of the reference's face.
```

**batch2-02 · AMARA — attach `lyra.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference image EXACTLY: a warm, flat, matte gouache / soft paper-texture illustration with simplified flat shading and soft front lighting, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). NOT photorealistic, NOT 3D, NOT anime.
Framing: head-and-shoulders portrait, upper body only, no hands, no full body. Face centered with generous margin. It will be cropped into a circle later, so keep the corners empty and nothing important near the edges. Do NOT draw a circle, frame, border, vignette, or any baked-in crop. Plain, flat, even cream background (no heavy texture) so it can be cut out cleanly. No text, no watermark, no logo, no signature.
Subject: an adult woman, clearly 25+. Feminine presentation, South Asian (North Indian) heritage. Warm medium wheatish-tan skin, softly lit. Long, thick, flowing dark wavy hair in natural black-brown (no auburn or warm highlights); a small tasteful gold nose stud and simple gold ear studs. Tastefully dressed as a warm friend, not a romantic companion: a layered warm knit with a terracotta drape or dupatta over one shoulder, with a relaxed modest neckline (neck and collarbone may show), but no cleavage, bare shoulders, or tight or sheer clothing. Pose: leaning in slightly, lively and open, a warm turn of the shoulders. Expression: wide, open, radiant smile, bright affectionate eyes. Effusive, doting, joyful warmth. Same art style as the reference, but a clearly different person: give a different face (shape, nose, jaw, brow, eyes, mouth) and a different outfit from the reference and from the other companions, never a recolored copy of the reference's face.
```

**batch2-03 · ELI — attach `orion.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference image EXACTLY: a warm, flat, matte gouache / soft paper-texture illustration with simplified flat shading and soft front lighting, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). NOT photorealistic, NOT 3D, NOT anime.
Framing: head-and-shoulders portrait, upper body only, no hands, no full body. Face centered with generous margin. It will be cropped into a circle later, so keep the corners empty and nothing important near the edges. Do NOT draw a circle, frame, border, vignette, or any baked-in crop. Plain, flat, even cream background (no heavy texture) so it can be cut out cleanly. No text, no watermark, no logo, no signature.
Subject: an adult man, clearly 25+. Masculine presentation, Latino (Mexican) heritage. Warm brown skin, evenly lit. Short natural cropped black hair, light stubble (no auburn or warm highlights). Tastefully dressed as an easy everyday friend: a simple relaxed henley or crew in warm oatmeal with the top button open so a little of the collarbone shows; nothing tight or suggestive. Pose: relaxed, upright, open and approachable. Expression: easy, natural half-smile, friendly steady eyes. The reliable everyday friend who always shows up. Same art style as the reference, but a clearly different person: give a different face (shape, nose, jaw, brow, eyes, mouth) and a different outfit from the reference and from the other companions, never a recolored copy of the reference's face.
```

**batch2-04 · SELENE — attach `aurora.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference image EXACTLY: a warm, flat, matte gouache / soft paper-texture illustration with simplified flat shading and soft front lighting, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). NOT photorealistic, NOT 3D, NOT anime.
Framing: head-and-shoulders portrait, upper body only. If hands are shown keep them simple and correct. Face centered with generous margin. It will be cropped into a circle later, so keep the corners empty and nothing important near the edges. Do NOT draw a circle, frame, border, vignette, or any baked-in crop. Plain, flat, even cream background (no heavy texture) so it can be cut out cleanly. No text, no watermark, no logo, no signature.
Subject: an older adult woman, clearly in her 50s-60s. Feminine presentation, Mediterranean (Greek) heritage. Fair-to-medium warm olive skin with soft natural lines of age, gently lit. Long silver-grey hair, softly styled. Tastefully dressed as a tender friend, not a romantic companion: a soft draped shawl or wrap in cream with a wine-red accent over a simple top; neck and collarbone may show, but no cleavage, bare shoulders, or tight or sheer clothing. Pose: soft and enveloping, a slight forward lean, one hand resting near the heart. Expression: warm, attentive, deeply gentle eyes. A tender, unhurried presence who holds the heavy things. Same art style as the reference, but a clearly different person: give a different face (shape, nose, jaw, brow, eyes, mouth) and a different outfit from the reference and from the other companions, never a recolored copy of the reference's face.
```

**batch2-05 · SOREN — attach `orion.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference image EXACTLY: a warm, flat, matte gouache / soft paper-texture illustration with simplified flat shading and soft front lighting, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). NOT photorealistic, NOT 3D, NOT anime.
Framing: head-and-shoulders portrait, upper body only, no hands, no full body. Face centered with generous margin. It will be cropped into a circle later, so keep the corners empty and nothing important near the edges. Do NOT draw a circle, frame, border, vignette, or any baked-in crop. Plain, flat, even cream background (no heavy texture) so it can be cut out cleanly. No text, no watermark, no logo, no signature.
Subject: an adult, clearly 25+. Androgynous, masculine-leaning presentation, Scandinavian (Danish) heritage. Pale, fair, cool-toned skin kept warm by the soft lighting (light, not tan or olive). Tidy short ash-blond / light-brown hair; clear light eyes (blue or grey). Tastefully dressed as a dry, understated friend: a structured collared jacket in muted warm brown over a plain tee, collar open at the neck; nothing tight or suggestive. Pose: composed, a slight turn, one shoulder forward, cool and self-possessed. Expression: subtle knowing smirk, one brow lightly raised, dry and understated. Quiet wit held just beneath the surface. Same art style as the reference, but a clearly different person: give a different face (shape, nose, jaw, brow, eyes, mouth) and a different outfit from the reference and from the other companions, never a recolored copy of the reference's face.
```

**batch2-06 · JUNO — attach `lyra.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference image EXACTLY: a warm, flat, matte gouache / soft paper-texture illustration with simplified flat shading and soft front lighting, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). NOT photorealistic, NOT 3D, NOT anime.
Framing: head-and-shoulders portrait, upper body only, no hands, no full body. Face centered with generous margin. It will be cropped into a circle later, so keep the corners empty and nothing important near the edges. Do NOT draw a circle, frame, border, vignette, or any baked-in crop. Plain, flat, even cream background (no heavy texture) so it can be cut out cleanly. No text, no watermark, no logo, no signature.
Subject: an adult woman, clearly 25+. Feminine presentation, Southeast Asian (Filipino) heritage. Light warm golden skin, a touch lighter than the tan anchors, brightly and softly lit. Short, lively dark pixie crop (no auburn or warm highlights). Tastefully dressed as a bright friend, not a romantic companion: a bright relaxed crew or soft tee in warm terracotta with a modest scoop neckline (neck and collarbone may show), but no cleavage, bare shoulders, or tight clothing. Pose: dynamic, a slight upward lift and asymmetric tilt, energetic. Expression: quick bright grin, sparkling lively eyes. A jolt of warm, upbeat energy. Same art style as the reference, but a clearly different person: give a different face (shape, nose, jaw, brow, eyes, mouth) and a different outfit from the reference and from the other companions, never a recolored copy of the reference's face.
```

**batch2-07 · THEA — attach `aurora.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference image EXACTLY: a warm, flat, matte gouache / soft paper-texture illustration with simplified flat shading and soft front lighting, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). NOT photorealistic, NOT 3D, NOT anime.
Framing: head-and-shoulders portrait, upper body only. If hands are shown keep them simple and correct. Face centered with generous margin. It will be cropped into a circle later, so keep the corners empty and nothing important near the edges. Do NOT draw a circle, frame, border, vignette, or any baked-in crop. Plain, flat, even cream background (no heavy texture) so it can be cut out cleanly. No text, no watermark, no logo, no signature.
Subject: an adult woman, clearly 25+. Feminine presentation, African-American / Afro-Caribbean heritage. Deep, rich brown skin, warmly and evenly lit (never flat or grey). Natural dark coils or curls, medium length (no auburn or warm highlights). Tastefully dressed as a comforting friend, not a romantic companion: a cozy soft knit in warm rose-cream with a soft wide neckline (neck and collarbone may show), but no cleavage, bare shoulders, or tight or sheer clothing. Pose: close and gentle, one hand resting near the collar. Expression: soft, warm, closed-mouth smile, kind reassuring eyes. Steady, comforting, "you're okay here." Same art style as the reference, but a clearly different person: give a different face (shape, nose, jaw, brow, eyes, mouth) and a different outfit from the reference and from the other companions, never a recolored copy of the reference's face.
```

**batch2-08 · CYRUS — attach `orion.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference image EXACTLY: a warm, flat, matte gouache / soft paper-texture illustration with simplified flat shading and soft front lighting, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). NOT photorealistic, NOT 3D, NOT anime.
Framing: head-and-shoulders portrait, upper body only, no hands, no full body. Face centered with generous margin. It will be cropped into a circle later, so keep the corners empty and nothing important near the edges. Do NOT draw a circle, frame, border, vignette, or any baked-in crop. Plain, flat, even cream background (no heavy texture) so it can be cut out cleanly. No text, no watermark, no logo, no signature.
Subject: an older adult man, clearly in his 50s-60s. Masculine presentation, Persian / Iranian heritage. Warm olive-to-deep skin, evenly lit. Grey hair with a neat salt-and-pepper short beard. Tastefully dressed as a grounding elder friend: a textured warm cardigan in muted brown over a simple henley or tee, open at the neck; nothing tight or suggestive. Pose: rooted, calm, still, gently upright. Expression: warm, knowing, steady eyes, a soft wise half-smile. A grounding elder who offers perspective. Same art style as the reference, but a clearly different person: give a different face (shape, nose, jaw, brow, eyes, mouth) and a different outfit from the reference and from the other companions, never a recolored copy of the reference's face.
```

**batch2-09 · WREN — attach `aurora.png`**
```
Create a companion avatar illustration. Match the art style of the attached reference image EXACTLY: a warm, flat, matte gouache / soft paper-texture illustration with simplified flat shading and soft front lighting, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). NOT photorealistic, NOT 3D, NOT anime.
Framing: head-and-shoulders portrait, upper body only. If hands are shown keep them simple and correct. Face centered with generous margin. It will be cropped into a circle later, so keep the corners empty and nothing important near the edges. Do NOT draw a circle, frame, border, vignette, or any baked-in crop. Plain, flat, even cream background (no heavy texture) so it can be cut out cleanly. No text, no watermark, no logo, no signature.
Subject: an adult, clearly 25+. Androgynous / gender-neutral presentation, East Asian (Japanese) heritage. Light warm skin, softly lit. Longer, soft, loosely tucked dark hair in natural black-brown (no auburn or warm highlights). Tastefully dressed as a thoughtful friend: a muted layered top with a soft collar in warm sage-brown; the neck may show, but nothing tight, bare, or suggestive. Pose: thoughtful, slight head tilt, gaze drifting gently to the side, one hand near the chin. Expression: quiet, curious, contemplative. A reflective mind that thinks alongside you. Same art style as the reference, but a clearly different person: give a different face (shape, nose, jaw, brow, eyes, mouth) and a different outfit from the reference and from the other companions, never a recolored copy of the reference's face.
```

## Deliverables (on the `test-results` branch)

- `client/assets/avatars/batch2/{sage,amara,eli,selene,soren,juno,thea,cyrus,wren}.png`
  (1254², transparent, cleaned; named per character, lowercase).
- `client/assets/avatars/batch2/notes.md` — per image: filename, the one-line "who is this",
  **assigned heritage + skin tone** (so QA can confirm the tone was hit), **how many iterations it took**,
  the grader's verdict + scores. (Mirror batch1's notes.md format.)
- Do not wire into code or the asset manifest — the main session owns backend/manifest wiring.

## Definition of done

All 9 PASS the rubric, transparent bg, no baked circle, no watermark, correct size, named
`[companion].png`, each iterated **at least 3×** until it looks good, notes.md delivered, committed to
`client/assets/avatars/batch2/` on **`test-results`**. At the very end of iterating on an avatar, remove the background (look up a tool to help you do it, and verify that nothing crucial to the image was lost before you submit the transparent background pngs). Push your test-results branch to origin, then inform Jason that you are done.
