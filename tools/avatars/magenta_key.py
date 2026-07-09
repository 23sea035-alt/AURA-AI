#!/usr/bin/env python3
"""Key out a flat magenta (#FF00FF) background from an avatar and emit a clean
1024x1024 transparent PNG. Deterministic, no upscaling-blur.

Usage:
    python tools/avatars/magenta_key.py <in.png> <out.png> [--size 1024] [--no-align]

What it does:
  1. Removes magenta pixels that are connected to the image border (so an
     accidental magenta detail *inside* the subject, if any, survives).
  2. De-fringes: erodes the subject edge by 1px to kill the magenta halo that
     anti-aliasing leaves around hair.
  3. By default trims to the subject and bottom-aligns it on a square canvas
     (matches the anchors). Pass --no-align to just key + resize the square.
     NOTE: never upscales the subject beyond the source (avoids blur); it only
     ever shrinks to fit. Compose tight in the prompt, not here.

Requires: pillow, numpy, scipy.
"""
import argparse
import numpy as np
from PIL import Image
from scipy import ndimage


def key_magenta(a):
    """Set alpha=0 on border-connected magenta. a: HxWx4 uint8 (modified in place)."""
    rgb = a[:, :, :3].astype(int)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    # magenta = high red + high blue + low green
    magenta = (r > 150) & (b > 150) & (g < 120)
    lbl, _ = ndimage.label(magenta)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border))
    a[bg, 3] = 0
    return a, int(bg.sum())


def defringe(a, px=1):
    """Erode the opaque mask by px to remove the 1px magenta-tinted edge halo."""
    mask = a[:, :, 3] > 16
    eroded = ndimage.binary_erosion(mask, iterations=px)
    a[~eroded, 3] = 0
    return a


def bottom_align(a, size):
    """Trim to alpha bbox, shrink-to-fit if needed, bottom-align + h-center on size^2."""
    alpha = a[:, :, 3]
    ys, xs = np.where(alpha > 16)
    if len(ys) == 0:
        return np.zeros((size, size, 4), np.uint8)
    crop = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    ch, cw = crop.shape[:2]
    scale = min(1.0, size / ch, size / cw)  # only ever shrink, never upscale
    if scale < 1.0:
        crop = np.array(Image.fromarray(crop).resize(
            (max(1, round(cw * scale)), max(1, round(ch * scale))), Image.LANCZOS))
        ch, cw = crop.shape[:2]
    out = np.zeros((size, size, 4), np.uint8)
    x0 = (size - cw) // 2
    y0 = size - ch  # subject bottom on the bottom edge, like the anchors
    out[y0:y0 + ch, x0:x0 + cw] = crop
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--size", type=int, default=1024)
    ap.add_argument("--no-align", action="store_true",
                    help="just key + resize the square, don't trim/bottom-align")
    args = ap.parse_args()

    a = np.array(Image.open(args.src).convert("RGBA"))
    a, removed = key_magenta(a)
    a = defringe(a, 1)
    if args.no_align:
        out = np.array(Image.fromarray(a).resize((args.size, args.size), Image.LANCZOS))
    else:
        out = bottom_align(a, args.size)
    Image.fromarray(out).save(args.dst)
    print(f"{args.src} -> {args.dst} | keyed {removed:,} px | {args.size}x{args.size}")


if __name__ == "__main__":
    main()
