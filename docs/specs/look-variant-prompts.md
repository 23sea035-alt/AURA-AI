# Persona outfit-variant prompts — Gemini 2.5 Flash Image ("Nano Banana")

Copy-paste prompts to generate the three "look" outfit recolors (sage / rose / dusk) for each of the
12 personas. Supersedes the color-mask bake pipeline (`client/scripts/dev/bake-look-variants.py`),
which couldn't cleanly separate garments that share a color with skin/hair. The image model recolors
the garment *semantically*, so seams, plackets, and trim come out right.

## Workflow

1. Open **Google AI Studio** (aistudio.google.com) and select **Gemini 2.5 Flash Image** (Nano Banana).
2. Upload the persona's base master from `client/assets/avatars/<persona>.png`.
3. Paste the prompt for the color you want, run, and download the result as PNG.
4. Name it `<persona>-<color>.png` (e.g. `thea-rose.png`) and hand it back / drop it in the repo.

Each prompt is self-contained — the target color is baked in. Run all three per persona against the
same base image.

## What I do after you deliver each image

- **Re-cut transparency** from the original master (a recolor doesn't move the silhouette), so the
  app gets a clean cutout even if Gemini returns an opaque background.
- **Color-match to the exact token** (`#6F8168` sage · `#9E5A63` rose · `#5E6E82` dusk) if Gemini's
  hue drifts, so all 12 personas stay consistent with the palette.
- **Face-drift safety net**: if the face shifts at all, composite the original face/hair back over the
  AI garment (garment from AI, identity from the master) — zero identity risk.

## Target colors

| Look | Hex | Description used in the prompts |
|------|-----|--------------------------------|
| sage | `#6F8168` | muted sage green |
| rose | `#9E5A63` | dusty muted wine-rose (mauve) |
| dusk | `#5E6E82` | muted slate blue |

---

## thea — base: `client/assets/avatars/thea.png`

**sage** — ✅ validated, no need to rerun.

**rose**
```
Edit this illustrated character portrait. Change only the color of the blush-pink long-sleeve knit sweater she is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that garment's exact shape, folds, wrinkles, knit texture, ribbed collar and cuffs, and seams, and its light-and-shadow shading — only the hue changes, as if the identical sweater were dyed dusty rose. Do not change anything else: keep her face, skin tone, facial features, expression, hair, hands, jewelry, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the sweater recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the blush-pink long-sleeve knit sweater she is wearing to a muted slate blue (approximately hex #5E6E82). Keep that garment's exact shape, folds, wrinkles, knit texture, ribbed collar and cuffs, and seams, and its light-and-shadow shading — only the hue changes, as if the identical sweater were dyed slate blue. Do not change anything else: keep her face, skin tone, facial features, expression, hair, hands, jewelry, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the sweater recolored.
```

---

## aurora — base: `client/assets/avatars/aurora.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the cream ivory knit cardigan she is wearing to a muted sage green (approximately hex #6F8168). Keep that cardigan's exact shape, folds, wrinkles, knit texture, ribbed cuffs, and seams, and its light-and-shadow shading — only the hue changes, as if the identical cardigan were dyed sage green. Keep the rust terracotta scarf visible at her chest its original rust color as an accent — do not recolor it. Do not change anything else: keep her face, skin tone, facial features, expression, hair, hands, jewelry, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the cardigan recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the cream ivory knit cardigan she is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that cardigan's exact shape, folds, wrinkles, knit texture, ribbed cuffs, and seams, and its light-and-shadow shading — only the hue changes, as if the identical cardigan were dyed dusty rose. Keep the rust terracotta scarf visible at her chest its original rust color as an accent — do not recolor it. Do not change anything else: keep her face, skin tone, facial features, expression, hair, hands, jewelry, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the cardigan recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the cream ivory knit cardigan she is wearing to a muted slate blue (approximately hex #5E6E82). Keep that cardigan's exact shape, folds, wrinkles, knit texture, ribbed cuffs, and seams, and its light-and-shadow shading — only the hue changes, as if the identical cardigan were dyed slate blue. Keep the rust terracotta scarf visible at her chest its original rust color as an accent — do not recolor it. Do not change anything else: keep her face, skin tone, facial features, expression, hair, hands, jewelry, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the cardigan recolored.
```

---

## orion — base: `client/assets/avatars/orion.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the rust terracotta button-up overshirt he is wearing to a muted sage green (approximately hex #6F8168). Keep that overshirt's exact shape, folds, wrinkles, fabric texture, collar, buttons, pocket, and seams, and its light-and-shadow shading — only the hue changes, as if the identical overshirt were dyed sage green. Keep the cream henley shirt visible underneath its original cream color — do not recolor it. Do not change anything else: keep his face, skin tone, facial features, expression, hair, beard, hands, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the overshirt recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the rust terracotta button-up overshirt he is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that overshirt's exact shape, folds, wrinkles, fabric texture, collar, buttons, pocket, and seams, and its light-and-shadow shading — only the hue changes, as if the identical overshirt were dyed dusty rose. Keep the cream henley shirt visible underneath its original cream color — do not recolor it. Do not change anything else: keep his face, skin tone, facial features, expression, hair, beard, hands, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the overshirt recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the rust terracotta button-up overshirt he is wearing to a muted slate blue (approximately hex #5E6E82). Keep that overshirt's exact shape, folds, wrinkles, fabric texture, collar, buttons, pocket, and seams, and its light-and-shadow shading — only the hue changes, as if the identical overshirt were dyed slate blue. Keep the cream henley shirt visible underneath its original cream color — do not recolor it. Do not change anything else: keep his face, skin tone, facial features, expression, hair, beard, hands, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the overshirt recolored.
```

---

## lyra — base: `client/assets/avatars/lyra.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the cream ivory knit cardigan she is wearing to a muted sage green (approximately hex #6F8168). Keep that cardigan's exact shape, folds, wrinkles, knit texture, and seams, and its light-and-shadow shading — only the hue changes, as if the identical cardigan were dyed sage green. Keep the rust terracotta top visible underneath its original rust color as an accent — do not recolor it. Do not change anything else: keep her face, skin tone, freckles, facial features, expression, red hair, hands, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the cardigan recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the cream ivory knit cardigan she is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that cardigan's exact shape, folds, wrinkles, knit texture, and seams, and its light-and-shadow shading — only the hue changes, as if the identical cardigan were dyed dusty rose. Keep the rust terracotta top visible underneath its original rust color as an accent — do not recolor it. Do not change anything else: keep her face, skin tone, freckles, facial features, expression, red hair, hands, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the cardigan recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the cream ivory knit cardigan she is wearing to a muted slate blue (approximately hex #5E6E82). Keep that cardigan's exact shape, folds, wrinkles, knit texture, and seams, and its light-and-shadow shading — only the hue changes, as if the identical cardigan were dyed slate blue. Keep the rust terracotta top visible underneath its original rust color as an accent — do not recolor it. Do not change anything else: keep her face, skin tone, freckles, facial features, expression, red hair, hands, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the cardigan recolored.
```

---

## sage — base: `client/assets/avatars/sage.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the tan camel mandarin-collar shirt he is wearing to a muted sage green (approximately hex #6F8168). Keep that shirt's exact shape, folds, wrinkles, fabric texture, mandarin collar, placket, and seams, and its light-and-shadow shading — only the hue changes, as if the identical shirt were dyed sage green. Do not change anything else: keep his face, skin tone, facial features, expression, head, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the shirt recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the tan camel mandarin-collar shirt he is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that shirt's exact shape, folds, wrinkles, fabric texture, mandarin collar, placket, and seams, and its light-and-shadow shading — only the hue changes, as if the identical shirt were dyed dusty rose. Do not change anything else: keep his face, skin tone, facial features, expression, head, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the shirt recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the tan camel mandarin-collar shirt he is wearing to a muted slate blue (approximately hex #5E6E82). Keep that shirt's exact shape, folds, wrinkles, fabric texture, mandarin collar, placket, and seams, and its light-and-shadow shading — only the hue changes, as if the identical shirt were dyed slate blue. Do not change anything else: keep his face, skin tone, facial features, expression, head, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the shirt recolored.
```

---

## amara — base: `client/assets/avatars/amara.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the rust terracotta draped shawl she is wearing across her shoulder and chest to a muted sage green (approximately hex #6F8168). Keep that shawl's exact shape, drape, folds, wrinkles, fabric texture, and its light-and-shadow shading — only the hue changes, as if the identical shawl were dyed sage green. Her neck and upper chest are bare skin, not clothing — do not recolor any skin; only the fabric shawl changes color. Do not change anything else: keep her face, skin tone, facial features, expression, black hair, earrings, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the shawl recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the rust terracotta draped shawl she is wearing across her shoulder and chest to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that shawl's exact shape, drape, folds, wrinkles, fabric texture, and its light-and-shadow shading — only the hue changes, as if the identical shawl were dyed dusty rose. Her neck and upper chest are bare skin, not clothing — do not recolor any skin; only the fabric shawl changes color. Do not change anything else: keep her face, skin tone, facial features, expression, black hair, earrings, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the shawl recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the rust terracotta draped shawl she is wearing across her shoulder and chest to a muted slate blue (approximately hex #5E6E82). Keep that shawl's exact shape, drape, folds, wrinkles, fabric texture, and its light-and-shadow shading — only the hue changes, as if the identical shawl were dyed slate blue. Her neck and upper chest are bare skin, not clothing — do not recolor any skin; only the fabric shawl changes color. Do not change anything else: keep her face, skin tone, facial features, expression, black hair, earrings, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the shawl recolored.
```

---

## eli — base: `client/assets/avatars/eli.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the beige taupe henley shirt he is wearing to a muted sage green (approximately hex #6F8168). Keep that henley's exact shape, folds, wrinkles, fabric texture, buttoned placket, collar, and seams, and its light-and-shadow shading — only the hue changes, as if the identical henley were dyed sage green. Do not change anything else: keep his face, skin tone, facial features, expression, dark wavy hair, stubble, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the henley recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the beige taupe henley shirt he is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that henley's exact shape, folds, wrinkles, fabric texture, buttoned placket, collar, and seams, and its light-and-shadow shading — only the hue changes, as if the identical henley were dyed dusty rose. Do not change anything else: keep his face, skin tone, facial features, expression, dark wavy hair, stubble, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the henley recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the beige taupe henley shirt he is wearing to a muted slate blue (approximately hex #5E6E82). Keep that henley's exact shape, folds, wrinkles, fabric texture, buttoned placket, collar, and seams, and its light-and-shadow shading — only the hue changes, as if the identical henley were dyed slate blue. Do not change anything else: keep his face, skin tone, facial features, expression, dark wavy hair, stubble, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the henley recolored.
```

---

## selene — base: `client/assets/avatars/selene.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the cream ivory draped wrap top she is wearing to a muted sage green (approximately hex #6F8168). Keep that wrap's exact shape, drape, folds, wrinkles, fabric texture, and its light-and-shadow shading — only the hue changes, as if the identical wrap were dyed sage green. Also recolor the small dark maroon garment layer visible at her lower-left shoulder to the same sage green, so the whole outfit reads as one color. Keep her grey silver hair its original color — do not recolor hair. Do not change anything else: keep her face, skin tone, facial features, expression, hand, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the outfit recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the cream ivory draped wrap top she is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that wrap's exact shape, drape, folds, wrinkles, fabric texture, and its light-and-shadow shading — only the hue changes, as if the identical wrap were dyed dusty rose. Also recolor the small dark maroon garment layer visible at her lower-left shoulder to the same dusty rose, so the whole outfit reads as one color. Keep her grey silver hair its original color — do not recolor hair. Do not change anything else: keep her face, skin tone, facial features, expression, hand, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the outfit recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the cream ivory draped wrap top she is wearing to a muted slate blue (approximately hex #5E6E82). Keep that wrap's exact shape, drape, folds, wrinkles, fabric texture, and its light-and-shadow shading — only the hue changes, as if the identical wrap were dyed slate blue. Also recolor the small dark maroon garment layer visible at her lower-left shoulder to the same slate blue, so the whole outfit reads as one color. Keep her grey silver hair its original color — do not recolor hair. Do not change anything else: keep her face, skin tone, facial features, expression, hand, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the outfit recolored.
```

---

## soren — base: `client/assets/avatars/soren.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the olive khaki blazer he is wearing to a muted sage green (approximately hex #6F8168). Keep that blazer's exact shape, folds, wrinkles, fabric texture, collar, lapels, and seams, and its light-and-shadow shading — only the hue changes, as if the identical blazer were dyed sage green. Keep the cream t-shirt visible underneath its original cream color — do not recolor it. Do not change anything else: keep his face, skin tone, facial features, expression, blond hair, hand, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the blazer recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the olive khaki blazer he is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that blazer's exact shape, folds, wrinkles, fabric texture, collar, lapels, and seams, and its light-and-shadow shading — only the hue changes, as if the identical blazer were dyed dusty rose. Keep the cream t-shirt visible underneath its original cream color — do not recolor it. Do not change anything else: keep his face, skin tone, facial features, expression, blond hair, hand, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the blazer recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the olive khaki blazer he is wearing to a muted slate blue (approximately hex #5E6E82). Keep that blazer's exact shape, folds, wrinkles, fabric texture, collar, lapels, and seams, and its light-and-shadow shading — only the hue changes, as if the identical blazer were dyed slate blue. Keep the cream t-shirt visible underneath its original cream color — do not recolor it. Do not change anything else: keep his face, skin tone, facial features, expression, blond hair, hand, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the blazer recolored.
```

---

## juno — base: `client/assets/avatars/juno.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the rust orange crew-neck sweater she is wearing to a muted sage green (approximately hex #6F8168). Keep that sweater's exact shape, folds, wrinkles, knit texture, ribbed crew neckline, and seams, and its light-and-shadow shading — only the hue changes, as if the identical sweater were dyed sage green. Do not change anything else: keep her face, skin tone, facial features, expression, short black hair, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the sweater recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the rust orange crew-neck sweater she is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that sweater's exact shape, folds, wrinkles, knit texture, ribbed crew neckline, and seams, and its light-and-shadow shading — only the hue changes, as if the identical sweater were dyed dusty rose. Do not change anything else: keep her face, skin tone, facial features, expression, short black hair, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the sweater recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the rust orange crew-neck sweater she is wearing to a muted slate blue (approximately hex #5E6E82). Keep that sweater's exact shape, folds, wrinkles, knit texture, ribbed crew neckline, and seams, and its light-and-shadow shading — only the hue changes, as if the identical sweater were dyed slate blue. Do not change anything else: keep her face, skin tone, facial features, expression, short black hair, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the sweater recolored.
```

---

## cyrus — base: `client/assets/avatars/cyrus.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the tan camel cardigan he is wearing to a muted sage green (approximately hex #6F8168). Keep that cardigan's exact shape, folds, wrinkles, knit texture, collar, and seams, and its light-and-shadow shading — only the hue changes, as if the identical cardigan were dyed sage green. Keep the grey henley shirt visible underneath its original grey color — do not recolor it. Do not change anything else: keep his face, skin tone, facial features, expression, grey hair, grey beard, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the cardigan recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the tan camel cardigan he is wearing to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that cardigan's exact shape, folds, wrinkles, knit texture, collar, and seams, and its light-and-shadow shading — only the hue changes, as if the identical cardigan were dyed dusty rose. Keep the grey henley shirt visible underneath its original grey color — do not recolor it. Do not change anything else: keep his face, skin tone, facial features, expression, grey hair, grey beard, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the cardigan recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the tan camel cardigan he is wearing to a muted slate blue (approximately hex #5E6E82). Keep that cardigan's exact shape, folds, wrinkles, knit texture, collar, and seams, and its light-and-shadow shading — only the hue changes, as if the identical cardigan were dyed slate blue. Keep the grey henley shirt visible underneath its original grey color — do not recolor it. Do not change anything else: keep his face, skin tone, facial features, expression, grey hair, grey beard, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the cardigan recolored.
```

---

## wren — base: `client/assets/avatars/wren.png`

**sage**
```
Edit this illustrated character portrait. Change only the color of the olive khaki utility jacket she is wearing, including its collar, lapels, pockets, buttons, and stitched seams, to a muted sage green (approximately hex #6F8168). Keep that jacket's exact shape, folds, wrinkles, fabric texture, and all its detailing and its light-and-shadow shading — only the hue changes, as if the identical jacket were dyed sage green. Do not change anything else: keep her face, skin tone, facial features, expression, long dark hair, necklace, hand, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the jacket recolored.
```

**rose**
```
Edit this illustrated character portrait. Change only the color of the olive khaki utility jacket she is wearing, including its collar, lapels, pockets, buttons, and stitched seams, to a dusty muted wine-rose mauve (approximately hex #9E5A63). Keep that jacket's exact shape, folds, wrinkles, fabric texture, and all its detailing and its light-and-shadow shading — only the hue changes, as if the identical jacket were dyed dusty rose. Do not change anything else: keep her face, skin tone, facial features, expression, long dark hair, necklace, hand, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the jacket recolored.
```

**dusk**
```
Edit this illustrated character portrait. Change only the color of the olive khaki utility jacket she is wearing, including its collar, lapels, pockets, buttons, and stitched seams, to a muted slate blue (approximately hex #5E6E82). Keep that jacket's exact shape, folds, wrinkles, fabric texture, and all its detailing and its light-and-shadow shading — only the hue changes, as if the identical jacket were dyed slate blue. Do not change anything else: keep her face, skin tone, facial features, expression, long dark hair, necklace, hand, and pose exactly identical, and keep the background fully transparent. Preserve the exact illustration style, line work, brush texture, the colors of everything else, proportions, framing, and resolution. Do not add, remove, restyle, or repaint any other detail. Return the same portrait with only the jacket recolored.
```
