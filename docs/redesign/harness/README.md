# Design harness — Playwright capture/iteration loop for the web prototypes

Drives the static "Warm Sanctuary" prototypes in [`../claude-design/`](../claude-design/) with
Playwright and produces review artifacts: a contact-sheet gallery of every screen state, flow clips,
and animation burst frames. We iterate on the **prototype** here (not the React Native app yet); this
harness is how we see what changed and verify it landed.

Isolated from the pnpm workspace (it lives under `docs/`, which is not a workspace package), so its
`node_modules` won't touch the app.

## Setup (once)

```bash
cd docs/redesign/harness
npm install
npx playwright install chromium
```

Requires network access at runtime: the prototypes pull React/Babel + Google Fonts from CDNs.

## Commands

| Command | What it does |
|---|---|
| `node smoke.mjs` | One-shot health check: renders Onboarding, drives the rail, saves a clean clip. |
| `node capture.mjs [artifact]` | Full contact sheet → `captures/<artifact>/stills/*.png` + `captures/<artifact>/gallery.html`. |
| `node clip.mjs [artifact] [theme]` | Walkthrough webm → `captures/<artifact>/clips/<artifact>.webm`. |
| `node burst.mjs <artifact> <screen> [--to=state] [--theme=]` | Animation frame strip → `captures/<artifact>/bursts/<screen>-*/`. |
| `node serve.mjs [port]` | Long-running static server for manual browsing. |

`artifact` is one of `onboarding` (default), `hometabs`, `oneoff` — see [`matrix.mjs`](matrix.mjs).

Examples:
```bash
node capture.mjs onboarding
node burst.mjs onboarding carousel          # slide1 → slide2 transition
node burst.mjs onboarding welcome           # entrance animation
node clip.mjs onboarding light
```

## How it works

- [`lib/server.mjs`](lib/server.mjs) — dependency-free static server (the prototypes must be served over
  http; `file://` breaks Babel's `.jsx` fetch).
- [`lib/driveRail.mjs`](lib/driveRail.mjs) — opens an artifact and sets screen/theme/state via the dev
  rail. The prototype has no URL routing, so navigation = driving the rail's `<select>` + `.dev-chip`
  buttons (targeted by stable section order). Screenshots clip to `.dev-scaler` (the 402×874 device),
  excluding the dark rail.
- [`matrix.mjs`](matrix.mjs) — the screen × state matrix per artifact, mirrored from the `*-app.jsx`
  `SCREENS`/`TABS` arrays.

Open `captures/<artifact>/gallery.html` in a browser to review the full set side-by-side.
