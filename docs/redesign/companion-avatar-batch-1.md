# Companion Avatars — Task Batch 1 (pilot)

Hey! This is a small, self-contained art task. Goal: produce **6 companion portrait images** for the
app, in the same style as our 3 existing companions. This is a first batch so we can check the pipeline
and style before doing more — so quality and consistency matter more than speed.

You'll: (1) make 6 portraits, (2) grade each one with an AI using the rubric below, (3) hand them back.

---

## Step 0 — Look at the 3 originals first (your north star)

Open these three files. **Everything you make must look like it belongs next to them** — same
illustration style, same warmth, same framing, same background:

- `client/assets/avatars/aurora.png`
- `client/assets/avatars/orion.png`
- `client/assets/avatars/lyra.png`

Keep them open while you work and compare constantly.

---

## Step 1 — The hard rules (every image must follow these)

- **Size:** exactly **1254 × 1254 pixels**, square, **PNG** (same as the originals).
- **Circle-safe framing (important!):** in the app, these get **cropped into a circle** — the corners
  are cut off. So keep the **face centered with breathing room**, and never put anything important
  (hair tips, hands, text) in the corners. Match how the originals are framed.
- **Background:** match the originals' background exactly (open `aurora.png` to see it).
- **Upper body only:** head + shoulders/chest. No full body, no pants/shoes.
- **Style:** the same warm, flat illustration style as the 3 originals — not photorealistic, not 3D,
  not anime, not a different art style.

### Two non-negotiables (do not skip)
- ✅ **Every companion must clearly look like an adult** (think 25+). No youthful, childlike, or
  age-ambiguous faces — this is a hard rule, no exceptions.
- ✅ **Tasteful and fully clothed.** Warm, friendly, wholesome. Nothing sexualized.

---

## Step 2 — What to make (6 portraits)

Make **6 portraits total**. As a set, they must cover **all** of these (spread them however you like
across the 6):

- [ ] **At least 1** is a **restyle of an existing companion** (Aurora, Orion, or Lyra): keep the same
      face, but change the hair, the shirt, and the skin tone. *(This checks: can you keep a character
      but change details?)*
- [ ] **At least 2** are **brand-new, different people** — same art style, but clearly not just one of
      the originals with new hair. *(This is the important one.)*
- [ ] **Presentation spread:** across the 6, include at least one **masculine-presenting**, one
      **feminine-presenting**, and one **androgynous / neutral** look.
- [ ] **Skin-tone spread:** use **4–5 different skin tones** across the realistic range, and **include at
      least one deep/dark tone** — and make sure that one still looks warm and well-lit, not flat or
      grey. *(This is a known failure point, so test it here.)*
- [ ] **Hair spread:** include at least **one bald** (no hair) and **one long-haired** look.

You don't need to assign personalities or voices — just make the portraits. For each one, jot a
**one-line description** ("who is this?", e.g. *"warm, older man, short grey hair, deep skin, green
sweater"*).

---

## Step 3 — How to generate them (Nano Banana or any tool)

Any image tool is fine; Nano Banana (Gemini image) works well for keeping a consistent style. Workflow:

1. **Upload one of the 3 originals as a reference image** so the tool copies the style.
2. **Prompt** for: *"a warm flat-illustration companion portrait in the exact same style as the
   reference image — square, centered face, upper body, plain matching background, clearly an adult,
   fully clothed"* — then describe the person (hair, skin tone, shirt, vibe).
   - For a **restyle:** *"keep this exact person's face; change hair to ___, skin tone to ___, shirt to ___."*
   - For a **new person:** *"same art style as the reference, but a different person: ___."*
3. Generate a few, pick the best, and **export at 1254 × 1254 PNG**. Clean up any rough edges and make
   sure the background matches the originals.

Expect to iterate — the first result is rarely the keeper.

---

## Step 4 — Grade every image with an AI (required)

After you make each image, **copy-paste the rubric below into a vision-capable AI**
(ChatGPT, Claude, or Gemini) **and attach your generated image.** It will score it and tell you what to
fix. **Copy the rubric exactly as-is.**

> ### 📋 COPY-PASTE THIS (attach your image):
>
> ```
> You are grading an AI-generated companion avatar for a mobile app. The target style is a warm,
> FLAT ILLUSTRATION (not photorealistic, not 3D, not anime) of a friendly adult, head-and-shoulders,
> shown in a CIRCLE crop (corners are cut off), on a plain warm background.
>
> Score the attached image 1–5 on each dimension (5 = excellent). Then give a total, a PASS/FAIL, and
> a short bullet list of concrete fixes.
>
> 1. STYLE MATCH — warm flat-illustration look (not photo/3D/anime); consistent line weight and palette.
> 2. CIRCLE-SAFE FRAMING — face centered with margin; nothing important in the corners; upper-body only.
> 3. WARMTH / APPEAL — reads as a warm, friendly companion; not cold, stiff, or uncanny.
> 4. SKIN-TONE RENDERING — skin looks natural and warmly lit; darker tones are NOT flat, grey, or muddy.
> 5. ANATOMY & ARTIFACTS — no extra/warped fingers, distorted features, weird eyes/teeth, or AI glitches.
> 6. DISTINCTNESS — reads as its own clear character (unless it's an intentional restyle of an existing one).
> 7. BACKGROUND — plain and consistent with a warm avatar background.
>
> GATES (each is a hard PASS/FAIL, independent of the scores):
> - ADULT: the person clearly reads as an adult (~25+). If they look youthful, childlike, or
>   age-ambiguous → FAIL.
> - APPROPRIATE: fully clothed, tasteful, non-sexualized → otherwise FAIL.
>
> Final verdict = PASS only if BOTH gates PASS and EVERY dimension is 4 or 5. Otherwise FAIL, and list
> exactly what to change.
> ```

**If it FAILS** (a gate fails, or any score is below 4): fix or regenerate and grade again. **Only keep
images that PASS.** Save the AI's final scores/verdict for each keeper (paste them into your notes).

---

## Step 5 — Hand it back

- Put the 6 final PNGs in a new folder: **`client/assets/avatars/batch1/`**
- Name them `batch1-01.png` … `batch1-06.png`.
- Add a short **`client/assets/avatars/batch1/notes.md`** with, for each image:
  - the filename,
  - your one-line "who is this?" description,
  - the AI grader's final verdict + scores.

---

## ✅ Done checklist
- [ ] 6 portraits, each **1254 × 1254 PNG**, circle-safe, matching the originals' style + background.
- [ ] The **coverage list in Step 2** is fully satisfied (restyle + new faces + presentation spread +
      4–5 skin tones incl. a deep tone + bald + long hair).
- [ ] Every image **reads as a clear adult** and is **tasteful/clothed**.
- [ ] Every image **PASSED** the rubric (scores saved in `notes.md`).
- [ ] Files + `notes.md` delivered in `client/assets/avatars/batch1/`.

Thanks! Once this batch looks good, we'll know the pipeline works and can plan the rest.
