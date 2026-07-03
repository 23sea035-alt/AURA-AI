#!/usr/bin/env python3
"""Inspect/stage/reset the Aura app's AsyncStorage on the booted iOS simulator.

RN AsyncStorage keeps small values inline in RCTAsyncLocalStorage_V1/manifest.json
and spills large values into sibling files named md5(key) — this tool handles both
transparently, and re-resolves the app's data container every run (the container
UUID changes whenever the app is reinstalled).

Usage (app should be TERMINATED first so it doesn't overwrite your edits):
  sim-storage.py keys                     list all keys (* = stored in overflow file)
  sim-storage.py get <key>                pretty-print a value
  sim-storage.py set <key> <json|@file>   write a value (JSON string, or @path to a JSON file)
  sim-storage.py del <key>                delete a key
  sim-storage.py reset-demo               restore the canonical Maya/Aurora demo story
"""

import hashlib
import json
import subprocess
import sys
from pathlib import Path

BUNDLE_ID = "com.aura.ai.companion"


def storage_dir() -> Path:
    out = subprocess.run(
        ["xcrun", "simctl", "get_app_container", "booted", BUNDLE_ID, "data"],
        capture_output=True,
        text=True,
        check=True,
    )
    base = Path(out.stdout.strip()) / "Library" / "Application Support" / BUNDLE_ID / "RCTAsyncLocalStorage_V1"
    if not (base / "manifest.json").exists():
        sys.exit(f"no AsyncStorage manifest at {base} (has the app run at least once?)")
    return base


def load_manifest(base: Path) -> dict:
    return json.loads((base / "manifest.json").read_text())


def read_key(base: Path, manifest: dict, key: str):
    """Returns (parsed_value, location) — location is 'manifest', an overflow filename, or None."""
    raw = manifest.get(key)
    if raw is not None:
        return json.loads(raw), "manifest"
    overflow = base / hashlib.md5(key.encode()).hexdigest()
    if key in manifest and overflow.exists():  # manifest value null → overflow file
        raw = overflow.read_text()
        val = json.loads(raw)
        if isinstance(val, str):  # some writers double-encode
            val = json.loads(val)
        return val, overflow.name
    return None, None


def write_key(base: Path, manifest: dict, key: str, value, location) -> None:
    encoded = json.dumps(value)
    if location and location != "manifest":
        (base / location).write_text(encoded)
        manifest.setdefault(key, None)
    else:
        manifest[key] = encoded
    (base / "manifest.json").write_text(json.dumps(manifest))


def delete_key(base: Path, manifest: dict, key: str) -> None:
    manifest.pop(key, None)
    overflow = base / hashlib.md5(key.encode()).hexdigest()
    if overflow.exists():
        overflow.unlink()
    (base / "manifest.json").write_text(json.dumps(manifest))


def reset_demo(base: Path, manifest: dict) -> None:
    """Canonical demo story: seeded Aurora thread only, no drafts, fresh mock server state."""
    msgs, loc = read_key(base, manifest, "messages")
    if msgs:
        msgs = {"aurora": [m for m in msgs.get("aurora", []) if str(m.get("id", "")).startswith("seed-")]}
        write_key(base, manifest, "messages", msgs, loc)
    for key in list(manifest.keys()):
        if key.startswith("draft:") or key in ("mock:accountStatus", "mock:isPremium", "voiceUsage", "usage"):
            delete_key(base, manifest, key)
            manifest = load_manifest(base)
    print("demo state reset (relaunch the app to re-seed usage/voice meters)")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd, args = sys.argv[1], sys.argv[2:]
    base = storage_dir()
    manifest = load_manifest(base)

    if cmd == "keys":
        for key in sorted(manifest):
            marker = "*" if manifest[key] is None else " "
            print(f"{marker} {key}")
    elif cmd == "get":
        val, loc = read_key(base, manifest, args[0])
        print(f"# location: {loc}")
        print(json.dumps(val, indent=2))
    elif cmd == "set":
        raw = args[1]
        value = json.loads(Path(raw[1:]).read_text() if raw.startswith("@") else raw)
        _, loc = read_key(base, manifest, args[0])
        write_key(base, manifest, args[0], value, loc)
        print(f"wrote {args[0]}")
    elif cmd == "del":
        delete_key(base, manifest, args[0])
        print(f"deleted {args[0]}")
    elif cmd == "reset-demo":
        reset_demo(base, manifest)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
