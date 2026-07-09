# Companion Avatars — Batch 4 (final regen pass)

> Consolidates every avatar prompt into one doc, in run order, with all the fixes we learned: **anchor-tight
> framing**, **magenta background** (clean keying), **neutral style references** (stop cloning the anchors'
> faces), and stronger **face/hair distinctness**. Supersedes the batch-2 and batch-3 prompt blocks.
> Output to `client/assets/avatars/` on `test-results`.

## Plan (per avatar)

| Avatar | Action | Reason |
|--------|--------|--------|
| **Eli** | 🔁 regen fresh | needs a distinctive haircut; face too generic / close to the other men |
| **Juno** | 🔁 regen fresh | face cloned Lyra (Lyra was the attached ref) |
| **Wren** | 🔁 regen fresh | face cloned Aurora + style drifted |
| **Cyrus** | 🔁 regen fresh | best art (batch3 soft-painterly) has comic-linework artifacts; no clean reliable version, so regenerate |
| **Amara** | ✏️ attach + tighten | art good; only needs anchor-tight framing |
| **Selene** | ✏️ attach + tighten | art good; only needs anchor-tight framing |
| **Soren** | ✏️ attach + tighten | art good; only needs anchor-tight framing |
| **Thea** | ✏️ attach + tighten | art good; only needs anchor-tight framing |
| **Sage** | ✅ keep | bald already distinct; regen only if new-Eli still feels close |

## Global rules (apply to every generation)

- **Generator = Gemini (Nano Banana), 1:1 SQUARE aspect ratio** (~1024² native). ChatGPT underperformed on
  these; use Gemini. Do NOT generate landscape/portrait, a wide image can't be squared without cropping
  to ~half height and upscaling (blur).
- **Size standard = 1024².** All 12 avatars are 1024×1024 (the anchors were downscaled from 1254 to match).
  Gemini's native square output is ~1024², so **nothing is ever upscaled** — no blur anywhere.
- **Framing = ANCHOR-TIGHT.** Match aurora/orion/lyra: the head sits near the TOP with a small margin, the
  body runs OFF the BOTTOM edge (no gap below the shoulders/chest), subject fills ~90-95% of the height. A
  close portrait, NOT zoomed out, NO empty space below the subject.
- **Background = flat magenta `#FF00FF`.** Solid, fully saturated, single even fill, no gradient, no shadow
  on the background. Nothing magenta/pink on the person or clothing. (ChatGPT won't do transparency; magenta
  keys out cleanly afterward.)
- **References = the neutral style pair `thea.png` + `amara.png`** (the two locked, artifact-free keepers)
  attached to EVERY chat — never the persona's look-alike anchor (that's what cloned Lyra/Aurora), and
  NOT Cyrus (his best iteration carries comic-linework artifacts, so he is not a reliable template). Use
  them for **art style only**.
- **No post-padding.** Keep the square Gemini returns; key the magenta (no resize needed if it's already
  ~1024²). Never add canvas / extend / pad (that caused the 1294 misalignment).
- **Output:** 1024×1024 PNG, transparent, named `[companion].png` (lowercase).
- **Distinctness:** each is a NEW person, different face shape/nose/jaw/brow/eyes/mouth from the references
  AND every other companion. Explicit no-clone rules are in each prompt below.

## Shared preamble (paste this, then the character's Subject block)

```
Create a companion avatar illustration. Match the art style of the two attached reference images EXACTLY (thea.png + amara.png are the canon look): a soft, warm, semi-realistic CEL / gouache painting with smooth gradient shading, gently rendered individual hair strands, a subtle warm cheek blush, soft-edged forms, and a small clean face, in a warm palette (cream, warm browns, terracotta, a small wine-red accent). This is NOT flat vector art, NOT graphic/editorial illustration, NOT hard-outlined comic art, NOT anime, NOT 3D, NOT photoreal. Use the references for ART STYLE ONLY — invent a NEW face that does not resemble either reference or any other person.
Framing: TIGHT head-and-shoulders portrait like a close-up. The head sits near the TOP of the frame with only a small margin, and the shoulders/upper chest run OFF the BOTTOM edge of the image — there must be NO empty gap below the subject. The subject fills about 90-95% of the height. Face centered horizontally and large. Do NOT zoom out, do NOT leave space under the shoulders, do NOT add a circle, frame, border, or vignette. No hands unless specified.
Background: a solid, flat, fully-saturated MAGENTA fill, hex #FF00FF, one even color across the whole background, no gradient and no shadow cast onto it. Nothing magenta or pink anywhere on the person or clothing.
No text, no watermark, no logo, no signature.
```

## Fresh regens (attach `thea.png` + `amara.png`)

**CYRUS**
```
Subject: an older adult man, clearly in his 50s-60s. Masculine presentation, Persian / Iranian heritage. Warm olive-to-deep skin, evenly lit, natural (NOT over-saturated or orange). Grey hair with a neat salt-and-pepper short beard. Tastefully dressed as a grounding elder friend: a textured, warm MUTED-BROWN cardigan over a simple grey henley with a small wine-red placket, open at the neck; nothing tight or suggestive. Pose: rooted, calm, gently upright, shoulders squared (no hands). Expression: warm, knowing, a soft wise half-smile, steady eyes looking toward the viewer. A grounding elder who offers perspective. Distinct face, unlike any reference. Render in soft cel/gouache with painterly shading — NOT comic linework.
```

**ELI**
```
Subject: an adult man, clearly 25+. Masculine presentation, Latino (Mexican) heritage. Warm brown skin, evenly lit. A DISTINCTIVE haircut — a textured, slightly wavy medium crop with a natural side part (NOT a plain short buzz), dark hair, with light stubble. Tastefully dressed as an easy everyday friend: a relaxed henley or crew in warm oatmeal, top button open so a little collarbone shows; nothing tight or suggestive. Expression: easy, natural half-smile, friendly eyes looking toward the viewer. The reliable everyday friend who always shows up. Give him a clearly DIFFERENT face and hair from bald Sage and from Orion's tousled dark hair — his hairstyle in particular must read as his own.
```

**JUNO**
```
Subject: an adult woman, clearly 25+. Feminine presentation, Southeast Asian (Filipino) heritage. Light warm golden skin, a touch lighter than the tan anchors, brightly and softly lit. Short, lively dark pixie crop (no auburn or warm highlights). Tastefully dressed as a bright friend, not a romantic companion: a relaxed, loose-fitting crew or soft tee in warm terracotta with a modest round neckline — loose, not tight, no bust emphasis. Expression: quick bright grin, sparkling lively eyes looking toward the viewer. A jolt of warm, upbeat energy. IMPORTANT: give her a fresh, distinct face that does NOT resemble Lyra (the bright, long-haired anchor) — different face shape, eyes, and smile.
```

**WREN**
```
Subject: an adult, clearly 25+. Androgynous / gender-neutral presentation, East Asian (Japanese) heritage. Light warm skin, softly lit. Longer, soft, loosely tucked dark hair in natural black-brown (no auburn or warm highlights). Tastefully dressed as a thoughtful friend: a muted layered top with a soft collar in warm sage-brown; nothing tight, bare, or suggestive. Pose: contemplative, a gentle three-quarter turn with the eyes glancing softly to the side, both eyes clearly visible (not a full profile). A hand may rest lightly near the chin but must be empty. Expression: quiet, curious, reserved — a calm, closed-mouth look, NOT a warm open smile. IMPORTANT: give a distinct face that does NOT resemble Aurora — different face shape and expression.
```

**SAGE** (only if needed — bald already differentiates; regen if new-Eli still reads close)
```
Subject: an adult, clearly 25+. Androgynous / gender-neutral presentation, West African (Nigerian) heritage. Deep, rich brown skin, warmly and evenly lit (never flat or grey). Bald / clean-shaven head, clean calm features. Tastefully dressed as a grounding friend: a plain muted-cream top with a simple band / mandarin collar; the neck may show, no bare shoulders or tight/sheer clothing. Pose: very still, centered, shoulders squared, chin level. Expression: serene, gently closed mouth, soft steady eyes toward the viewer. A quiet, grounding presence. Distinct face, unlike any reference.
```

## Attach + tighten (keep the person, fix framing only)

For **Amara, Selene, Soren, Thea**: the art is good, they're just framed too loose. In a fresh chat, attach
**the current `[name].png`** and paste:

```
Redraw this exact character — same face, hair, skin tone, wardrobe, pose, expression, and art style — but recompose it to a TIGHT head-and-shoulders portrait: head near the TOP of the frame, shoulders/upper chest running OFF the BOTTOM edge with NO gap below, subject filling ~90-95% of the height (a close portrait, not zoomed out). Put it on a solid flat magenta #FF00FF background. Do not change the person or the style, only the framing and background.
```

Reference (what each should still look like, in case it drifts):
- **Amara** — South Asian (Indian), medium wheatish-tan, long dark waves, gold nose stud, terracotta drape, radiant smile.
- **Selene** — Mediterranean (Greek) elder, fair-olive, long silver hair, cream/wine drape, hand near heart.
- **Soren** — Scandinavian (Danish), pale fair, ash-blond, light eyes, structured brown jacket over tee, dry smirk.
- **Thea** — African-American/Afro-Caribbean, deep brown, natural coils, rose-cream knit, soft reassuring smile.

If attach + tighten drifts the face or style worse than the current version, **keep the current one** — a good
face at 80% beats a drifted one at 95%.

## Keep as-is
- **Sage** — keep unless it clashes with the new Eli.

## Post-processing (per image)

1. Generate in **Gemini, 1:1 square**, on magenta; iterate ≥3× until the face + framing are right (don't settle).
2. **Key out the magenta** with the tool (deterministic, no blur):
   ```
   python tools/avatars/magenta_key.py <in.png> client/assets/avatars/<name>.png
   ```
   It removes the `#FF00FF` background (border-connected, with a 1px de-fringe) and outputs 1024² (default).
   Manual fallback: paint.net → Magic Wand on the magenta → delete → export 1024².
3. Confirm: transparent bg, no magenta fringe on hair edges, 1024², correct name.

## Run order
Fresh first: **Cyrus, Eli, Juno, Wren**. Then attach+tighten: **Amara, Selene, Soren, Thea**. Then decide **Sage**.

## Definition of done
All 9 read as one soft cel/gouache family, anchor-tight framing (subject fills the frame, no bottom gap),
distinct faces (no Lyra/Aurora clones, Eli's cut distinct from Sage/Orion), transparent, 1024², named
`[companion].png`, on `test-results`. Update `notes.md`. Ping the main session.
