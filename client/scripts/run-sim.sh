#!/usr/bin/env bash
#
# run-sim.sh — Build & launch the Aura app on an iOS Simulator.
#
# Why this exists: under Xcode 26 + Expo SDK 54, `expo run:ios` can mis-resolve
# the build destination to a physical/Mac target and fail with
# "No code signing certificates are available to use." This builds the
# *iphonesimulator* SDK directly — which needs no code signing — and
# installs/launches via simctl, sidestepping Expo's device picker entirely.
# (Ported from the Amibroke repo's tools/run-sim.sh, adapted for Aura's pnpm
# monorepo: the app lives in client/, so ios/ is generated at client/ios/.)
#
# Usage (from anywhere):
#   pnpm run ios:sim                          # iPhone 16e (default — small-screen design driver)
#   bash client/scripts/run-sim.sh "iPhone 17 Pro"   # any installed simulator, by name
#
# Metro: started in the background automatically if nothing is on :8081.
set -euo pipefail

# Operate from the client root (this script lives in client/scripts/).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$CLIENT_DIR"

SIM_NAME="${1:-iPhone 16e}"

# Bundle id is read from app.json so it stays in sync with the Expo config.
BUNDLE_ID=$(node -e "process.stdout.write(require('./app.json').expo.ios.bundleIdentifier)")

# 1. Resolve the simulator UDID (the name itself contains parens, so match the
#    line and pull the 36-char UUID rather than splitting on '(').
UDID=$(xcrun simctl list devices available | grep -F "$SIM_NAME (" | grep -oE "[0-9A-Fa-f-]{36}" | head -1)
if [ -z "${UDID:-}" ]; then
  echo "❌ Simulator '$SIM_NAME' not found. Run: xcrun simctl list devices available"
  exit 1
fi

# 2. Prebuild the native iOS project if it doesn't exist yet (managed workflow).
if [ ! -d ios ] || ! ls ios/*.xcworkspace >/dev/null 2>&1; then
  echo "No ios/ workspace found — running expo prebuild (iOS) …"
  pnpm exec expo prebuild -p ios
fi

# 3. Auto-detect the generated workspace + scheme (Expo derives these from the
#    app name, so don't hardcode them).
WORKSPACE=$(ls -d ios/*.xcworkspace 2>/dev/null | head -1)
if [ -z "${WORKSPACE:-}" ]; then
  echo "❌ No .xcworkspace under ios/ after prebuild. Check 'pnpm exec expo prebuild -p ios' output."
  exit 1
fi
SCHEME="$(basename "$WORKSPACE" .xcworkspace)"
APP_PATH="ios/build/Build/Products/Debug-iphonesimulator/${SCHEME}.app"

# 4. Boot the sim (and open Simulator.app) if it isn't already booted.
if ! xcrun simctl list devices | grep -F "$UDID" | grep -q "Booted"; then
  echo "Booting $SIM_NAME …"
  xcrun simctl boot "$UDID"
  open -a Simulator
fi

# 5. Ensure *this project's* Metro is running on :8081 (dev builds load JS from
#    it). A foreign Metro on :8081 — e.g. another Expo app on a different RN/SDK
#    version — would serve the wrong bundle and trigger a "React Native version
#    mismatch", so detect it by the listener's cwd and replace it if it isn't ours.
METRO_PID=$(lsof -t -i :8081 -sTCP:LISTEN 2>/dev/null | head -1)
if [ -n "${METRO_PID:-}" ]; then
  METRO_CWD=$(lsof -a -p "$METRO_PID" -d cwd -Fn 2>/dev/null | grep '^n' | cut -c2-)
  if [ "$METRO_CWD" != "$CLIENT_DIR" ]; then
    echo "⚠️  A foreign Metro (pid $METRO_PID, cwd ${METRO_CWD:-unknown}) holds :8081 — stopping it so this project's bundle is served."
    kill "$METRO_PID" 2>/dev/null || true
    sleep 1
    lsof -i :8081 -sTCP:LISTEN >/dev/null 2>&1 && { kill -9 "$METRO_PID" 2>/dev/null || true; sleep 1; }
    METRO_PID=""
  fi
fi
if [ -z "${METRO_PID:-}" ]; then
  echo "Starting Metro in the background (logs: /tmp/aura-metro.log) …"
  pnpm exec expo start --port 8081 >/tmp/aura-metro.log 2>&1 &
  for _ in $(seq 1 40); do lsof -i :8081 -sTCP:LISTEN >/dev/null 2>&1 && break; sleep 1; done
fi

# 6. Build the simulator SDK (no signing), then install + launch.
echo "Building $SCHEME for $SIM_NAME …"
xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "id=$UDID" \
  -derivedDataPath ios/build \
  build

echo "Installing & launching $BUNDLE_ID …"
xcrun simctl install "$UDID" "$APP_PATH"
xcrun simctl launch "$UDID" "$BUNDLE_ID"
echo "✅ Launched $BUNDLE_ID on $SIM_NAME"
