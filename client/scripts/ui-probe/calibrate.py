#!/usr/bin/env python3
"""calibrate.py — resolve real coordinates for track_edges.py probes instead
of hand-picking pixel columns and reference colors by trial and error.

Two subcommands:

  find <hierarchy.json> <regex> [--screenshot img.png]
    Search a Maestro `hierarchy` dump for element(s) whose accessibilityText
    / text / title / value / hintText matches `regex`, and print their
    bounds in hierarchy points plus (if --screenshot given) in the
    screenshot's pixel coordinates, using the scale factor derived from
    screenshot size / hierarchy root size. Use this instead of guessing an
    element's x/y from eyeballing a screenshot.

  color <image.png> <x> <y>
    Print the RGB pixel color at (x, y) in `image.png`. Use this to
    auto-calibrate a probe's `ref` color from an actual frame instead of
    typing in a guessed hex value.

Usage:
  python3 calibrate.py find /tmp/hierarchy.json 'Message.*' --screenshot /tmp/shot.png
  python3 calibrate.py color /tmp/shot.png 700 2420
"""
import argparse
import json
import re
import sys
from pathlib import Path

from PIL import Image

TEXT_KEYS = ("accessibilityText", "text", "title", "value", "hintText")


def parse_bounds(s):
    m = re.match(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", s)
    if not m:
        return None
    x0, y0, x1, y1 = (int(v) for v in m.groups())
    return {"x0": x0, "y0": y0, "x1": x1, "y1": y1}


def walk(node, matches, pattern):
    if not isinstance(node, dict):
        return
    attrs = node.get("attributes", {})
    text = " ".join(attrs.get(k, "") for k in TEXT_KEYS)
    if text.strip() and pattern.search(text):
        bounds = parse_bounds(attrs.get("bounds", ""))
        if bounds:
            matches.append({"text": text.strip(), "bounds": bounds})
    for child in node.get("children", []) or []:
        walk(child, matches, pattern)


def root_bounds(node):
    attrs = node.get("attributes", {}) if isinstance(node, dict) else {}
    b = parse_bounds(attrs.get("bounds", ""))
    if b and b["x1"] > 0:
        return b
    for child in node.get("children", []) or []:
        b = root_bounds(child)
        if b:
            return b
    return None


def cmd_find(args):
    data = json.loads(Path(args.hierarchy).read_text())
    pattern = re.compile(args.regex)
    matches = []
    walk(data, matches, pattern)
    if not matches:
        print(f"no element matched /{args.regex}/", file=sys.stderr)
        sys.exit(1)

    scale = None
    if args.screenshot:
        im = Image.open(args.screenshot)
        rb = root_bounds(data)
        if rb:
            scale = im.size[0] / rb["x1"]

    for m in matches:
        b = m["bounds"]
        row = {"text": m["text"], "points": b}
        if scale:
            row["pixels"] = {k: round(v * scale) for k, v in b.items()}
            row["pixel_center_x"] = round((b["x0"] + b["x1"]) / 2 * scale)
            row["pixel_center_y"] = round((b["y0"] + b["y1"]) / 2 * scale)
        print(json.dumps(row))


def cmd_color(args):
    im = Image.open(args.image)
    print(json.dumps({"x": args.x, "y": args.y, "rgb": list(im.getpixel((args.x, args.y))[:3])}))


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    f = sub.add_parser("find")
    f.add_argument("hierarchy")
    f.add_argument("regex")
    f.add_argument("--screenshot", default=None)
    f.set_defaults(func=cmd_find)

    c = sub.add_parser("color")
    c.add_argument("image")
    c.add_argument("x", type=int)
    c.add_argument("y", type=int)
    c.set_defaults(func=cmd_color)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
