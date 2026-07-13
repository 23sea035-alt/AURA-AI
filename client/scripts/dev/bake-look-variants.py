#!/usr/bin/env python3
"""Bake per-persona "look" variants: recolor ONLY the apparel of a portrait, not the whole image.

SUPERSEDED (2026-07-13): the shipped look variants in assets/avatars/looks/ are now generated with
Gemini 2.5 Flash Image ("Nano Banana"), which recolours the garment semantically and cleanly — see
docs/specs/look-variant-prompts.md for the prompts + post-processing. This colour-mask bake is kept
for reference only (it couldn't separate garments that share a colour with skin/hair). Do not use it
to regenerate the shipped assets.

The old look system applied a whole-image brightness/saturation filter — it tinted the face, hair,
and background along with the outfit, and read as unreliable. This bakes proper outfit recolors:
segment the garment, then tint by that garment's luminance so the fabric's folds, cuff ribbing, and
shading carry through (a real recolored garment, not a flat fill). Luminance tint is hue-agnostic,
so it recolors a saturated rust shirt as cleanly as a cream cardigan. Output is a plain PNG per
(persona, look) so the app renders a bare <Image> with no runtime filters.

    python3 client/scripts/dev/bake-look-variants.py aurora orion ...      # bake
    python3 client/scripts/dev/bake-look-variants.py --qa aurora orion ... # only write mask overlays

Segmentation is color+position based and per-persona tunable (PERSONA_PARAMS). The garment is the
opaque region below the head that is NOT skin and NOT hair; the v/s bands, y band, and skin/hair
exclusions pick the specific garment. ALWAYS eyeball the *.maskQA.png (magenta = mask edge) before
trusting a persona's mask. Colors are the Warm Sanctuary set (chosen to read against the cream app
bg, #F4ECE0 — a cream garment blends in and leaves a "floating head").

Requires: pillow, numpy, scipy  (e.g. the /tmp/pillowvenv used by the ui-probe tooling).
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
CLIENT = os.path.abspath(os.path.join(HERE, "..", ".."))
AVATARS = os.path.join(CLIENT, "assets", "avatars")
OUT_DIR = os.path.join(AVATARS, "looks")
QA_DIR = os.path.join(HERE, "look-qa")  # gitignored scratch

# Warm Sanctuary outfit colors — muted, app-aligned, each with presence against the cream bg.
LOOK_TARGETS = {
    "sage": (0x6F, 0x81, 0x68),  # muted green
    "rose": (0x9E, 0x5A, 0x63),  # dusty wine-rose (softer than the pure accent)
    "dusk": (0x5E, 0x6E, 0x82),  # muted slate — the cool counterpoint
}

# Per-persona segmentation knobs. The garment = opaque & inside [y_min,y_max] & [v_min,v_max] value
# & [s_min,s_max] saturation, minus skin (warm-hue band) if exclude_skin. Then keep components above
# min_area_frac, erode off skin edges, feather the seam. Saturated-warm garments (rust/orange) share
# skin's hue, so they set exclude_skin=False and separate by saturation/value instead.
BASE = dict(v_min=0.0, v_max=1.0, s_min=0.0, s_max=1.0, h_min=0.0, h_max=1.0, y_min=0.45, y_max=1.0,
            exclude_skin=True, min_area_frac=0.004, erode_div=400, feather_div=300,
            # extra_bands: list of {h_min,h_max,s_min,s_max,v_min,v_max,y_min,y_max} OR'd into the mask,
            # for a garment with a second colour region (e.g. an under-layer). A band with h_min > h_max
            # wraps around red (hue >= h_min OR hue <= h_max).
            extra_bands=())


def P(**kw):
    return {**BASE, **kw}


PERSONA_PARAMS = {
    # light cream/ivory garments — bright, low-saturation
    "aurora": P(v_min=0.72, s_max=0.55, y_min=0.50),
    # lyra: cream cardigan. exclude_skin off (its warm hue was eating the cardigan); red hair is out
    # by s_max, real skin by position. Lower v_min catches the shadowed arm/torso seam fold.
    "lyra":   P(exclude_skin=False, v_min=0.55, s_max=0.42, y_min=0.55, erode_div=700, min_area_frac=0.0012),
    # selene: cream wrap (low v_min catches its shadows) + a dark maroon under-layer folded in via an
    # extra band (red hue, wraps around 0) so it recolours with the outfit instead of showing as a dot.
    "selene": P(v_min=0.68, s_max=0.30, y_min=0.60,
                extra_bands=({"h_min": 0.93, "h_max": 0.05, "s_min": 0.40, "s_max": 0.78,
                              "v_min": 0.22, "v_max": 0.56, "y_min": 0.70, "y_max": 1.0},)),
    # warm garments that share skin's hue — separate by VALUE (garment far from skin brightness),
    # exclude_skin off. Dark-skinned personas: garment is far lighter than their dark skin.
    "sage":   P(exclude_skin=False, v_min=0.78, s_min=0.30, s_max=0.62, y_min=0.58),
    # thea: blush sweater over DARK skin, so v_min can go low to catch seam/fold shadows without
    # touching skin; minimal erosion + small min_area keep the thin placket seam and edges filled.
    "thea":   P(exclude_skin=False, v_min=0.58, s_min=0.20, s_max=0.55, y_min=0.60, erode_div=1400, min_area_frac=0.0015),
    # light-skinned personas with mid-tone warm garments: cap value below skin brightness
    "eli":    P(exclude_skin=False, v_min=0.58, v_max=0.92, s_max=0.38, y_min=0.60),
    # soren: olive blazer. Lower y_min to catch the upturned collar; the cream tee + bright neck skin
    # are excluded by s_min (both low-saturation). Slightly higher v_max for the lit collar.
    "soren":  P(exclude_skin=False, v_min=0.42, v_max=0.74, s_min=0.38, s_max=0.62, y_min=0.55),
    "cyrus":  P(exclude_skin=False, v_min=0.42, v_max=0.72, s_min=0.38, s_max=0.60, y_min=0.64),
    # wren: detailed olive jacket with a warm edge-binding trim. The green+warm bands cover body and
    # trim; the jacket only borders dark hair + background (both excluded by colour), so erosion is
    # minimised to keep the thin lapel/placket/pocket trim from being eaten.
    "wren":   P(exclude_skin=False, h_min=0.05, h_max=0.26, v_min=0.28, v_max=0.80, s_min=0.14, s_max=0.62, y_min=0.55, erode_div=1500),
    # saturated-warm garments (rust/orange) — high saturation separates from skin
    "orion":  P(exclude_skin=False, s_min=0.48, v_min=0.35, v_max=0.82, y_min=0.58),
    # amara: rust shawl. Neck/chest skin was leaking in as a false "turtleneck" — the shawl is redder
    # (hue < 0.06) than skin and mid-value, so a hue cap + value cap drop the bright, oranger neck.
    "amara":  P(exclude_skin=False, h_max=0.06, s_min=0.48, v_min=0.45, v_max=0.80, y_min=0.66),
    # juno: rust sweater, tight headshot. Lower y_min catches both shoulders; sweater is more
    # saturated and redder than the neck/jaw skin, so s_min + a hue cap keep skin out.
    "juno":   P(exclude_skin=False, h_max=0.05, s_min=0.56, v_min=0.45, v_max=0.92, y_min=0.73),
}

OUTPUT_RES = 512  # avatars display <=140px; 512 is safely oversampled and ~245 KB/variant


def hsv(rgb):
    mx = rgb.max(-1); mn = rgb.min(-1); d = mx - mn
    v = mx
    s = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    h = np.zeros_like(v)
    nz = d > 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    hr = ((g - b) / np.maximum(d, 1e-6)) % 6
    hg = (b - r) / np.maximum(d, 1e-6) + 2
    hb = (r - g) / np.maximum(d, 1e-6) + 4
    h = np.select([mx == r, mx == g], [hr, hg], hb) / 6.0
    h = np.where(nz, h, 0)
    return h, s, v


def hue_in(hue, h_min, h_max):
    # h_min > h_max means the band wraps around red (hue >= h_min OR hue <= h_max).
    if h_min > h_max:
        return (hue >= h_min) | (hue <= h_max)
    return (hue >= h_min) & (hue <= h_max)


def garment_mask(rgb, alpha, p):
    h_, w_ = alpha.shape
    hue, sat, val = hsv(rgb)
    yy = np.linspace(0, 1, h_)[:, None] * np.ones((1, w_))
    opaque = alpha > 0.5
    m = opaque.copy()
    m &= (yy >= p["y_min"]) & (yy <= p["y_max"])
    m &= (val >= p["v_min"]) & (val <= p["v_max"])
    m &= (sat >= p["s_min"]) & (sat <= p["s_max"])
    if p["h_min"] > 0.0 or p["h_max"] < 1.0:
        m &= hue_in(hue, p["h_min"], p["h_max"])
    if p["exclude_skin"]:
        skin = (hue > 0.015) & (hue < 0.12) & (sat > 0.28) & (sat < 0.80) & (val > 0.40)
        m &= ~skin
    # Fold in any extra colour region of the same garment (e.g. an under-layer).
    for b in p["extra_bands"]:
        band = opaque & (yy >= b["y_min"]) & (yy <= b["y_max"])
        band &= (val >= b["v_min"]) & (val <= b["v_max"])
        band &= (sat >= b["s_min"]) & (sat <= b["s_max"])
        band &= hue_in(hue, b["h_min"], b["h_max"])
        m |= band
    m = ndimage.binary_fill_holes(m)
    lbl, n = ndimage.label(m)
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s > w_ * h_ * p["min_area_frac"]]
    m = np.isin(lbl, keep)
    m = ndimage.binary_erosion(m, iterations=max(1, w_ // p["erode_div"]))
    soft = ndimage.gaussian_filter(m.astype(float), sigma=w_ / p["feather_div"])
    return m, soft


def process(persona, qa_only=False):
    src = os.path.join(AVATARS, f"{persona}.png")
    if not os.path.exists(src):
        print(f"  ! no portrait at {src}")
        return
    p = PERSONA_PARAMS.get(persona, BASE)
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(float)
    rgb = a[..., :3] / 255.0
    alpha = a[..., 3] / 255.0
    m, soft = garment_mask(rgb, alpha, p)
    if soft.sum() < 100:
        print(f"  ! {persona}: mask nearly empty ({100*m.mean():.2f}%) — retune params")
        return

    os.makedirs(QA_DIR, exist_ok=True)
    qa = a.copy()
    edge = m ^ ndimage.binary_erosion(m, iterations=3)
    qa[edge] = [255, 0, 255, 255]
    Image.fromarray(qa.astype("uint8")).save(os.path.join(QA_DIR, f"{persona}.maskQA.png"))
    print(f"  {persona}: coverage {100*m.mean():.1f}%  (QA -> scripts/dev/look-qa/{persona}.maskQA.png)")
    if qa_only:
        return

    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    lmean = (lum * soft).sum() / max(soft.sum(), 1)
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, target in LOOK_TARGETS.items():
        t = np.array(target) / 255.0
        tinted = np.clip((lum / max(lmean, 1e-3))[..., None] * t[None, None, :], 0, 1)
        out = np.clip(rgb * (1 - soft[..., None]) + tinted * soft[..., None], 0, 1)
        res = a.copy()
        res[..., :3] = out * 255
        img = Image.fromarray(res.astype("uint8"), "RGBA").resize((OUTPUT_RES, OUTPUT_RES))
        img.save(os.path.join(OUT_DIR, f"{persona}-{name}.png"), optimize=True)


if __name__ == "__main__":
    args = sys.argv[1:]
    qa_only = "--qa" in args
    personas = [a for a in args if not a.startswith("-")]
    if not personas:
        sys.exit("usage: bake-look-variants.py [--qa] <persona> [persona ...]")
    for persona in personas:
        process(persona, qa_only=qa_only)
