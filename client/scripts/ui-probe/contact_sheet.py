#!/usr/bin/env python3
"""contact_sheet.py — tile a directory of extracted frames (from record.sh) into
labeled grid images ("t=SS.Ss" burned under each thumbnail), for a token-efficient
first pass over a whole recording instead of Read-ing dozens of individual frames.

Ported from ../Amibroke's tools/contact-sheet.swift (AVFoundation, samples a video
directly) — this version instead tiles the PNGs record.sh already extracted, so it
needs no extra dependency beyond Pillow (already used by track_edges.py/calibrate.py).

Frame-number → timestamp: record.sh's ffmpeg extraction names frames starting at
frame-0001.png (NOT frame-0000.png). t = (N-1) / fps, where N is the number in the
filename — get this wrong and every label is off by one frame (bit us once already
mid-session: a diff spike we attributed to "frame 349/350" turned out to actually be
350/351).

Usage:
  python3 contact_sheet.py <frame_dir> --fps 60 [--cols 6] [--rows 4] [--thumb-width 200]
    [--start-frame N] [--max-frames N] [--every N] [--out-prefix sheet]

  <frame_dir>     directory of frame-NNNN.png files (record.sh's OUTDIR)
  --fps           the fps record.sh extracted at (must match, or labels lie)
  --cols/--rows   grid size per sheet (default 6x4 = 24 frames/sheet)
  --thumb-width   thumbnail width in px (default 200; height keeps aspect ratio)
  --start-frame   first frame NUMBER (the NNNN in frame-NNNN.png) to include (default 1)
  --max-frames    stop after this many source frames considered (default: all)
  --every         sample every Nth frame instead of all of them (default 1 = every frame;
                  use e.g. 5 to scan a long recording cheaply, then re-run with --every 1
                  over a narrow --start-frame/--max-frames window for the fine motion)
  --out-prefix    output files are written to <frame_dir>/<out-prefix>-NNN.png

Output: prints how many sheets were written and their paths.
"""
import argparse
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    "/System/Library/Fonts/Menlo.ttc",
    "/System/Library/Fonts/Supplemental/Courier New.ttf",
]


def load_font(size):
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def frame_number(path):
    m = re.search(r"frame-(\d+)\.png$", path.name)
    if not m:
        return None
    return int(m.group(1))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("frame_dir")
    ap.add_argument("--fps", type=float, required=True)
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--rows", type=int, default=4)
    ap.add_argument("--thumb-width", type=int, default=200)
    ap.add_argument("--start-frame", type=int, default=1)
    ap.add_argument("--max-frames", type=int, default=None)
    ap.add_argument("--every", type=int, default=1)
    ap.add_argument("--out-prefix", default="sheet")
    args = ap.parse_args()

    frame_dir = Path(args.frame_dir)
    all_frames = sorted(frame_dir.glob("frame-*.png"), key=lambda p: frame_number(p) or 0)
    if not all_frames:
        print(f"no frame-*.png files in {frame_dir}", file=sys.stderr)
        sys.exit(1)

    frames = [p for p in all_frames if (frame_number(p) or 0) >= args.start_frame]
    if args.max_frames is not None:
        frames = frames[: args.max_frames]
    frames = frames[:: args.every]
    if not frames:
        print("no frames left after --start-frame/--max-frames/--every filtering", file=sys.stderr)
        sys.exit(1)

    with Image.open(frames[0]) as im0:
        w0, h0 = im0.size
    thumb_w = args.thumb_width
    thumb_h = round(thumb_w * h0 / w0)
    pad = 6
    label_h = 18
    cell_w = thumb_w + pad
    cell_h = thumb_h + label_h + pad
    per_sheet = args.cols * args.rows
    sheet_w = args.cols * cell_w + pad
    sheet_h = args.rows * cell_h + pad
    font = load_font(13)

    written = []
    for sheet_idx in range(0, len(frames), per_sheet):
        chunk = frames[sheet_idx : sheet_idx + per_sheet]
        sheet = Image.new("RGB", (sheet_w, sheet_h), (20, 20, 20))
        draw = ImageDraw.Draw(sheet)
        for i, fp in enumerate(chunk):
            col, row = i % args.cols, i // args.cols
            x = pad + col * cell_w
            y = pad + row * cell_h
            with Image.open(fp) as im:
                thumb = im.convert("RGB").resize((thumb_w, thumb_h), Image.LANCZOS)
            sheet.paste(thumb, (x, y))
            n = frame_number(fp) or 0
            t = (n - 1) / args.fps
            draw.text((x + 2, y + thumb_h + 2), f"t={t:.2f}s f{n}", fill=(80, 220, 100), font=font)
        out_path = frame_dir / f"{args.out_prefix}-{sheet_idx // per_sheet:03d}.png"
        sheet.save(out_path)
        written.append(out_path)

    print(f"{frame_dir.name}: {len(frames)} frames -> {len(written)} sheet(s) @ grid {args.cols}x{args.rows}")
    for p in written:
        print(f"  {p}")


if __name__ == "__main__":
    main()
