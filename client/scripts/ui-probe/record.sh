#!/usr/bin/env bash
#
# record.sh — record the booted iOS Simulator while a Maestro flow runs, then
# extract PNG frames via ffmpeg (frame-accurate decode of every real encoded
# frame, unlike a fixed-timestamp AVFoundation request which silently drops
# frames whose timestamp doesn't land on an actual keyframe).
#
# The Maestro flow runs in the FOREGROUND (blocking) rather than backgrounded
# behind a guessed sleep — Maestro's own startup latency is variable (2-8s),
# so racing it against a fixed sleep was the main source of "recording ended
# before the triggered action's effect landed" in earlier ad-hoc attempts.
# Blocking on it means the action is guaranteed to have happened by the time
# we move to the trailing buffer + stop.
#
# Usage:
#   record.sh <label> <maestro-flow.yaml> [pre-buffer-s] [post-buffer-s] [fps]
#
# Output:
#   /tmp/ui-probe-<label>.mp4
#   /tmp/ui-probe-<label>/frame-NNNN.png  (frame N ≈ N/fps seconds)
set -euo pipefail

LABEL="${1:?usage: record.sh <label> <maestro-flow.yaml> [pre-buffer-s] [post-buffer-s] [fps]}"
FLOW="${2:?usage: record.sh <label> <maestro-flow.yaml> [pre-buffer-s] [post-buffer-s] [fps]}"
PRE="${3:-2}"
POST="${4:-2}"
FPS="${5:-30}"

VIDEO="/tmp/ui-probe-$LABEL.mp4"
OUTDIR="/tmp/ui-probe-$LABEL"

UDID=$(xcrun simctl list devices booted | grep -oE "[0-9A-F-]{36}" | head -1)
if [ -z "${UDID:-}" ]; then echo "no booted simulator" >&2; exit 1; fi
if ! command -v maestro >/dev/null 2>&1; then echo "maestro not on PATH (JAVA_HOME set?)" >&2; exit 1; fi
if ! command -v ffmpeg >/dev/null 2>&1; then echo "ffmpeg not installed (brew install ffmpeg)" >&2; exit 1; fi

rm -f "$VIDEO"; rm -rf "$OUTDIR"; mkdir -p "$OUTDIR"

echo "recording $UDID -> $VIDEO" >&2
xcrun simctl io "$UDID" recordVideo --codec=h264 --force "$VIDEO" &
REC_PID=$!
sleep "$PRE"

echo "running flow: $FLOW" >&2
maestro --udid "$UDID" test "$FLOW"

sleep "$POST"
kill -INT "$REC_PID" 2>/dev/null || true
wait "$REC_PID" 2>/dev/null || true
sleep 0.5

echo "extracting frames @${FPS}fps -> $OUTDIR" >&2
ffmpeg -loglevel error -i "$VIDEO" -vf "fps=$FPS" "$OUTDIR/frame-%04d.png"
COUNT=$(ls "$OUTDIR"/frame-*.png 2>/dev/null | wc -l | tr -d ' ')
echo "$OUTDIR ($COUNT frames, frame N ~= N/${FPS}s)"
