#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# voice-probe — speak into the iOS simulator's microphone and record what
# the app plays back, from the command line. Built for testing the live
# voice pipeline (client mic → server STT → LLM → TTS → client speaker)
# without a human at the mic.
#
# How it works: the simulator uses the Mac's DEFAULT audio input/output
# devices. BlackHole (a virtual loopback driver) lets us make "the mic"
# a device we can play files into, and "the speaker" a device we can
# record from.
#
#   setup                     check/install tools (BlackHole needs an admin
#                             password once — run this yourself, not headless)
#   status                    show devices + current defaults
#   mic-on | mic-off          route the Mac default INPUT via BlackHole
#                             (sim relaunch recommended after switching)
#   speak "text" [voice]      synthesize with macOS `say` and play it into
#                             the sim's mic (requires mic-on)
#   speak-file file.wav       play an existing recording into the sim's mic
#   record out.wav secs       capture the app's audio output for N seconds
#                             (routes default OUTPUT to BlackHole during the
#                             capture, restores after)
#   converse "text" out.wav [reply-secs]
#                             speak a line, then immediately record the
#                             companion's reply for review
#   restore                   put both defaults back to real hardware
#
# Typical live-mode session:
#   ./voice-probe.sh setup && ./voice-probe.sh mic-on
#   (relaunch the sim app, start a voice call)
#   ./voice-probe.sh converse "Hey, how are you today?" reply1.wav 20
#   open reply1.wav   # listen to the companion's TTS answer
#   ./voice-probe.sh restore
#
# Caveats (each learned the hard way elsewhere — trust these):
#   • While recording, output IS BlackHole: you won't hear the app live;
#     review the wav. (A Multi-Output Device in Audio MIDI Setup fixes
#     that if you want live monitoring — manual, one-time.)
#   • If input AND output are both BlackHole at the same moment, the app
#     hears its own TTS (loopback echo → accidental barge-in). converse
#     sequences the phases to avoid overlap after the speak finishes.
#   • The sim binds audio devices lazily; if the app doesn't pick up mic
#     audio after mic-on, terminate + relaunch the app (not the whole sim).
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

BH="BlackHole 2ch"
STATE_DIR="${TMPDIR:-/tmp}/voice-probe"
mkdir -p "$STATE_DIR"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing: $1 — run: $2" >&2
    exit 1
  }
}

current() { SwitchAudioSource -c -t "$1"; }

save_default() { current "$1" >"$STATE_DIR/prev-$1"; }

restore_default() {
  local kind="$1" prev
  [[ -f "$STATE_DIR/prev-$kind" ]] || return 0
  prev="$(cat "$STATE_DIR/prev-$kind")"
  [[ "$prev" == "$BH" ]] && return 0
  SwitchAudioSource -s "$prev" -t "$kind" >/dev/null
  echo "$kind → $prev"
}

cmd="${1:-help}"
case "$cmd" in
  setup)
    echo "── tools ──"
    command -v SwitchAudioSource >/dev/null || brew install switchaudio-osx
    command -v ffmpeg >/dev/null || brew install ffmpeg
    if ! SwitchAudioSource -a -t input | grep -q "$BH"; then
      echo "BlackHole not found. Installing (needs your admin password):"
      brew install blackhole-2ch
      echo "If devices don't appear: sudo killall coreaudiod (then re-run status)"
    fi
    echo "── ok ──"
    "$0" status
    ;;

  status)
    need SwitchAudioSource "brew install switchaudio-osx"
    echo "inputs:";  SwitchAudioSource -a -t input  | sed 's/^/  /'
    echo "outputs:"; SwitchAudioSource -a -t output | sed 's/^/  /'
    echo "default input:  $(current input)"
    echo "default output: $(current output)"
    ;;

  mic-on)
    need SwitchAudioSource "brew install switchaudio-osx"
    save_default input
    SwitchAudioSource -s "$BH" -t input >/dev/null
    echo "default input → $BH (relaunch the app in the sim if it was mid-call)"
    ;;

  mic-off)
    need SwitchAudioSource "brew install switchaudio-osx"
    restore_default input
    ;;

  speak|speak-file)
    need SwitchAudioSource "brew install switchaudio-osx"
    [[ "$(current input)" == "$BH" ]] || { echo "run mic-on first" >&2; exit 1; }
    if [[ "$cmd" == "speak" ]]; then
      text="${2:?usage: speak \"text\" [voice]}"
      clip="$STATE_DIR/line.aiff"
      say -v "${3:-Samantha}" -o "$clip" "$text"
    else
      clip="${2:?usage: speak-file file.wav}"
    fi
    # Play into BlackHole's output side = the sim's mic hears it. afplay has
    # no device flag, so default output hops to BlackHole for the clip.
    save_default output
    SwitchAudioSource -s "$BH" -t output >/dev/null
    afplay "$clip"
    sleep 0.3   # let the tail land before flipping output back
    restore_default output >/dev/null
    echo "spoke: ${text:-$clip}"
    ;;

  record)
    need SwitchAudioSource "brew install switchaudio-osx"
    need ffmpeg "brew install ffmpeg"
    out="${2:?usage: record out.wav seconds}"
    secs="${3:?usage: record out.wav seconds}"
    save_default output
    SwitchAudioSource -s "$BH" -t output >/dev/null
    echo "recording ${secs}s → $out (app audio is silent to your ears meanwhile)"
    ffmpeg -hide_banner -loglevel error -f avfoundation -i ":$BH" -t "$secs" -y "$out"
    restore_default output >/dev/null
    echo "saved: $out"
    ;;

  converse)
    text="${2:?usage: converse \"text\" out.wav [reply-secs]}"
    out="${3:?usage: converse \"text\" out.wav [reply-secs]}"
    secs="${4:-20}"
    "$0" speak "$text"
    "$0" record "$out" "$secs"
    ;;

  restore)
    need SwitchAudioSource "brew install switchaudio-osx"
    restore_default input
    restore_default output
    echo "defaults restored"
    ;;

  *)
    sed -n '3,45p' "$0"
    ;;
esac
