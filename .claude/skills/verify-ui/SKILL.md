---
name: verify-ui
description: Drive the iOS Simulator to make and verify frontend UI/animation changes on Aura's Expo RN client — reach any screen via a throwaway account, record + inspect motion with the ui-probe tooling, and never trust a fix until it's been checked against a freshly-relaunched build. Invoked as /verify-ui <what to check> (e.g. /verify-ui "onboarding carousel slide 2 entrance"). Distilled from the onboarding-carousel remediation session, which burned real time on fast-refresh giving false confidence.
---

# Verify UI

A process for making a frontend change on the Aura Expo RN client (`client/`) and actually
confirming it in the iOS Simulator, rather than reasoning about the code and hoping. Built from
the onboarding-carousel remediation session, where three consecutive "confirmed fixes" for the
same bug each turned out to be checked against a stale Metro bundle — the underlying architecture
had to change before the bug actually went away, and that only became clear once verification
stopped trusting fast-refresh.

## Owner defaults (decided — don't re-ask each run)

1. **Device:** iPhone 16e simulator. Confirm one is booted: `xcrun simctl list devices booted`.
2. **Bundle id:** `com.aura.ai.companion`.
3. **Maestro needs `JAVA_HOME` exported** — it's not on PATH by default in this shell:
   ```bash
   export JAVA_HOME=/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home
   export PATH="$JAVA_HOME/bin:$PATH"
   ```
   If `openjdk` isn't at that path on a given machine, `brew --prefix openjdk`.
4. **Reaching a post-auth screen:** sign up a fresh throwaway account —
   `client/scripts/ui-probe/flows/signup-throwaway.yaml` (needs `-e EMAIL=... -e PASSWORD=...`,
   see Tooling). Each account can only pass through onboarding once, so mint a new email per
   verification pass (`<what-youre-checking>@example.com` is fine — readable in logs later).
5. **THE RULE THAT MATTERS MOST: full relaunch before trusting anything you see.** Metro
   fast-refresh can silently stop applying edits (it did, mid-session, for ~50 minutes) while
   still looking alive — no error, no stale-bundle warning. Before treating any observed behavior
   as evidence (a bug repro OR "the fix worked"), do:
   ```bash
   xcrun simctl terminate booted com.aura.ai.companion
   xcrun simctl launch booted com.aura.ai.companion
   ```
   then re-navigate (re-signup if the screen is post-auth) and re-capture. This costs ~10 seconds
   and is the difference between real evidence and a plausible-looking illusion. Do this every
   time, not just when something feels off — the whole failure mode is that it doesn't feel off.
6. **Analysis venv:** `/private/tmp/pillowvenv` has Pillow + numpy for pixel-level work. If it's
   gone (fresh machine, `/tmp` got wiped): `python3 -m venv /tmp/pillowvenv && /tmp/pillowvenv/bin/pip install pillow numpy`.

## Tooling (`client/scripts/ui-probe/`)

- **`record.sh <label> <flow.yaml> [pre-buffer-s] [post-buffer-s] [fps]`** — records the booted
  sim while a Maestro flow runs, then extracts every frame via ffmpeg. Writes
  `/tmp/ui-probe-<label>.mp4` + `/tmp/ui-probe-<label>/frame-NNNN.png`. **Frame numbering starts
  at `frame-0001.png`, not `0000`** — `t = (N-1)/fps`. Getting this off by one mislabels exactly
  the frame you're trying to pin down (bit us once already).
- **`contact_sheet.py <frame_dir> --fps N [--every N] [--cols N] [--rows N]`** — tiles frames into
  labeled grid images (`t=SS.Ss`, frame number) so a whole recording fits in 1-3 images instead of
  reading dozens of individual frames one at a time. **Always do this first pass before reading
  individual frames.** Use `--every 5`+ to scan a long recording cheaply, then re-run with
  `--every 1` over a narrow `--start-frame`/`--max-frames` window once you've spotted the
  interesting region.
- **`track_edges.py <frame_dir> --fps N --probes probes.json`** — numeric fallback for when the
  contact sheet shows something *ambiguous* (a suspected snap/overshoot you can't quite call by
  eye): tracks a named pixel-column edge per frame and flags frame-to-frame discontinuities
  automatically. Don't reach for this by default — it's for confirming/quantifying a specific
  suspicion, not a first-pass tool.
- **`calibrate.py find <hierarchy.json> <regex> [--screenshot img.png]`** / **`calibrate.py color
  <image.png> <x> <y>`** — resolve real tap coordinates / reference colors instead of guessing
  them from eyeballing a screenshot.
- **`flows/`** — reusable Maestro flows: `tap-left-zone.yaml` / `tap-right-zone.yaml` (50/50
  tap-zone screens), `swipe-forward.yaml` / `swipe-back.yaml` (generic horizontal swipe),
  `signup-throwaway.yaml` (parameterized fresh-account signup, see above). Add a flow here
  instead of `/tmp` when it's something you'd plausibly reuse across sessions; keep one-off
  probes in `/tmp`.

## Workflow

1. **Reach the screen.** Throwaway signup (post-auth screens) or ask the user to navigate there if
   it's simpler/session-specific state you can't easily reproduce.
2. **Make the code change.**
3. **Relaunch — see Owner default #5.** Not optional, not just "when something seems off."
4. **Capture:**
   - Static look (layout, a color, a clipping edge) → one `xcrun simctl io booted screenshot`.
   - Motion/timing/animation → `record.sh` → `contact_sheet.py` for the first pass. Only drop to
     reading individual frames, or to `track_edges.py`, once the contact sheet has narrowed down
     *where* to look closer.
5. **Analyze.** Read the image(s). When a suspected artifact is subtle (a faint color band, a soft
   clip), a quick ad-hoc PIL/numpy pixel scan (crop the region, compare against a known-background
   sample) turns "I think I see something" into a confirmed pixel range — worth doing before
   proposing a root cause, and essential before claiming one is *fixed*.
6. **Iterate.** Fix → step 3 again → step 4/5 again. A fix isn't confirmed until it's been checked
   post-relaunch — re-verifying against a bundle you haven't relaunched proves nothing.
7. **Clean up.** `/tmp/ui-probe-*`, ad-hoc screenshots, and one-off flow YAMLs are scratch — remove
   them once a change is verified. Debug scaffolding added *inside the app* to aid verification
   (a temporary on-screen counter, a stray `console.log`) must be removed before the fix is
   considered done — grep for it before calling anything finished.

## Guardrails

- Throwaway accounts are disposable (`*@example.com`, any password ≥8 chars) — no cleanup needed,
  mint a new one per pass rather than reusing one that's already been through onboarding.
- `cd client && npx tsc --noEmit -p .` clean is necessary but not sufficient — it doesn't catch a
  visual regression or a re-rendered-but-wrong animation. Simulator verification is what this
  skill exists for.
- Don't commit or push unless the user asks (standing rule — see root `CLAUDE.md`).
- If a fix requires touching the same bug for a third time, stop and question the architecture
  before attempting a fourth patch — that was the actual signal to rebuild rather than re-patch
  the carousel this session.
