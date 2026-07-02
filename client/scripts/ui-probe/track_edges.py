#!/usr/bin/env python3
"""track_edges.py — turn a directory of extracted video frames into numeric
position-vs-time data for named UI edges, instead of eyeballing screenshots.

Each probe scans a fixed pixel column over a y-range and locates one edge per
frame using one of two modes:
  - first_deviation: first y (scanning downward from y0) whose color differs
    from `ref` by more than `tol`. Good for a clean bg -> other-region jump
    (e.g. cream app background -> gray keyboard).
  - closest: the y in [y0, y1] whose color is nearest to `ref`. Good for
    locking onto a specific border/stroke color when the bg on both sides of
    it is similar (e.g. a composer's rounded-rect outline).
  - first_match: first y (scanning downward from y0) whose color IS within
    `tol` of `ref`. Good when another element (e.g. a card) sits between y0
    and the target region and would false-positive under first_deviation —
    target the region's own distinct color instead of "not background".

All modes accept `min_run` (default 3): a candidate y must hold for that many
consecutive rows to count, so a single anti-aliased border/shadow pixel that
coincidentally falls within `tol` of `ref` can't be mistaken for the start of
a whole region.

Usage:
  python3 track_edges.py <frame_dir> --fps 60 --probes probes.json [--out out.json]

probes.json: a list of objects, each:
  {"name": str, "x": int, "y0": int, "y1": int, "ref": [r,g,b], "tol": number,
   "mode": "first_deviation" | "closest"}

Output (also printed): per-frame table of probe y-values, the frame-to-frame
delta for each probe, and any frame flagged as a discontinuity (a delta whose
magnitude is more than `spike_factor`x the median nonzero delta magnitude
across the whole sequence) — the numeric signature of a snap/overshoot.
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image


def dist(a, b):
    return sum((a[i] - b[i]) ** 2 for i in range(3)) ** 0.5


def find_edge(im, probe):
    x, y0, y1, ref, tol, mode, min_run = (
        probe["x"],
        probe["y0"],
        probe["y1"],
        probe["ref"],
        probe.get("tol", 10),
        probe.get("mode", "first_deviation"),
        probe.get("min_run", 3),
    )
    if mode == "first_deviation":
        run = 0
        for y in range(y0, y1):
            if dist(im.getpixel((x, y)), ref) > tol:
                run += 1
                if run >= min_run:
                    return y - min_run + 1
            else:
                run = 0
        return None
    elif mode == "closest":
        best_y, best_d = None, float("inf")
        for y in range(y0, y1):
            d = dist(im.getpixel((x, y)), ref)
            if d < best_d:
                best_d, best_y = d, y
        return best_y
    elif mode == "first_match":
        run = 0
        for y in range(y0, y1):
            if dist(im.getpixel((x, y)), ref) <= tol:
                run += 1
                if run >= min_run:
                    return y - min_run + 1
            else:
                run = 0
        return None
    else:
        raise ValueError(f"unknown mode {mode}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("frame_dir")
    ap.add_argument("--fps", type=float, required=True)
    ap.add_argument("--probes", required=True, help="path to probes JSON")
    ap.add_argument("--out", default=None, help="path to write JSON results")
    ap.add_argument("--spike-factor", type=float, default=4.0)
    args = ap.parse_args()

    probes = json.loads(Path(args.probes).read_text())
    frames = sorted(Path(args.frame_dir).glob("frame-*.png"))
    if not frames:
        print(f"no frames found in {args.frame_dir}", file=sys.stderr)
        sys.exit(1)

    rows = []
    for idx, fp in enumerate(frames):
        im = Image.open(fp)
        row = {"frame": idx, "t": round(idx / args.fps, 4)}
        for p in probes:
            row[p["name"]] = find_edge(im, p)
        rows.append(row)

    # derived: frame-to-frame deltas + gap between first two probes (if exactly named)
    names = [p["name"] for p in probes]
    deltas = {n: [] for n in names}
    for n in names:
        prev = None
        for row in rows:
            v = row[n]
            d = None if (prev is None or v is None) else v - prev
            deltas[n].append(d)
            if v is not None:
                prev = v
        row_key = f"d_{n}"
        for row, d in zip(rows, deltas[n]):
            row[row_key] = d

    flags = []
    for n in names:
        vals = [abs(d) for d in deltas[n] if d not in (None, 0)]
        if not vals:
            continue
        vals.sort()
        median = vals[len(vals) // 2]
        threshold = max(median * args.spike_factor, 6)
        for row, d in zip(rows, deltas[n]):
            if d is not None and abs(d) > threshold:
                flags.append(
                    {
                        "probe": n,
                        "frame": row["frame"],
                        "t": row["t"],
                        "delta": d,
                        "median_delta": median,
                        "threshold": threshold,
                    }
                )

    result = {"probes": probes, "rows": rows, "flags": flags}
    out_text = json.dumps(result, indent=2)
    if args.out:
        Path(args.out).write_text(out_text)
        print(f"wrote {args.out} ({len(rows)} frames, {len(flags)} flags)")
    if flags:
        print(f"\n{len(flags)} discontinuity flag(s):")
        for f in flags:
            print(
                f"  probe={f['probe']} frame={f['frame']} t={f['t']}s "
                f"delta={f['delta']} (median |delta|={f['median_delta']:.1f}, "
                f"threshold={f['threshold']:.1f})"
            )
    else:
        print("\nno discontinuity flags — all frame-to-frame deltas were within "
              f"{args.spike_factor}x the median for their probe.")


if __name__ == "__main__":
    main()
