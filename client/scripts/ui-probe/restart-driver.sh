#!/usr/bin/env bash
# Maestro's XCUITest driver goes stale after many flows in one session: steps report
# COMPLETED while nothing happens on screen, or text matching fails while the screen is
# fine (bit us 2026-07-03 and again 2026-07-07). Bounce everything — the next
# `maestro test` reinstalls a fresh runner.
set -euo pipefail

pkill -f 'maestro' 2>/dev/null || true
xcrun simctl terminate booted dev.mobile.maestro-driver-iosUITests.xctrunner 2>/dev/null || true
xcrun simctl uninstall booted dev.mobile.maestro-driver-iosUITests.xctrunner 2>/dev/null || true
echo "maestro driver reset — the next flow reinstalls it fresh"
