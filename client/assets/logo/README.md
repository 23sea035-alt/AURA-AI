# App logo / mark — LOCKED (2026-06-24)

The abstract app-icon mark: two warm organic forms on a cream ground — a larger
wine shape leaning over and sheltering a smaller terracotta one ("a companion who
sits with you"). Flat hand-printed / gouache feel, mid-century modern. No wordmark
(the app name is still TBD — see [`docs/README.md`](../../../docs/README.md) naming TODO).

This is the locked **V2** mark (a refinement of the chosen "V5" that broadened the
top-right lobe into a sheltering shoulder). The production vector was built by
flattening a matte render and tracing it (VTracer: Colored · Stacked · Filter
Speckle ~8 · Spline · Corner Threshold ~90 → a clean 3-path SVG), then recoloring
to the locked brand hexes. Do **not** auto-trace the textured/grainy renders — that
produces hundreds of speckle-paths.

## Colors (locked)

Mirror `LOGO_COLORS` in [`client/constants/design.ts`](../../constants/design.ts):

| Role | Hex | Note |
|---|---|---|
| Wine (larger form) | `#8F4150` | == `COLORS.light.accent` |
| Honey (smaller form) | `#BD6B45` | muted terracotta; icon-only, no theme token |
| Cream (ground) | `#F4ECE0` | == `COLORS.light.bg` |

## Files

| File | What | Use |
|---|---|---|
| `app-icon.svg` | Full color, **cream ground** baked in (square) | The app icon artwork (master vector). |
| `app-icon-1024.png` | 1024×1024 opaque raster of the above | iOS/Android app icon, App Store. |
| `logo-mark.svg` | Full color, **transparent**, shapes only | In-app mark + **animation**. Two id'd groups: `#wine` (larger) and `#honey` (smaller), each `transform-box: fill-box; transform-origin: center` so they animate independently. |
| `logo-mono.svg` | Single color (`currentColor`), transparent | One-color contexts. The cream channel is negative space; tint via `color`/`fill`. |
| `logo-mono-wine-1024.png` | Mono, wine ink, transparent | Mono on **light** backgrounds. |
| `logo-mono-cream-1024.png` | Mono, cream ink, transparent | Mono on **dark** backgrounds (wine ink is too dim on dark). |

## Behavior at icon scale

Two-tone reading holds down to 16px; the cream channel opens up from ~24px. The
mark deliberately avoids a beak / bird / phallic misread (the last is most exposed
in the mono variant, where the honey drops out — the union silhouette is a calm
kidney, verified).

## Not done yet

- **Wordmark lockup** — blocked on the app name.
- **Live Expo wiring — DONE (2026-06-25).** `app.json` now uses `app-icon-1024.png` for
  `icon` / Android `adaptiveIcon.foregroundImage` / `web.favicon`, and the splash is wired
  via the `expo-splash-screen` config plugin: wine mono mark on cream `#F4ECE0` (light) +
  cream mono mark on warm-dark `#1B1712` (dark), `resizeMode: contain`, `imageWidth: 200`.
  `userInterfaceStyle` is now `automatic` so both themes — and both splash variants — show.
  The old placeholder `assets/images/icon.png` was deleted.
- **Paper grain** — the mark is flat matte; an optional gouache-grain overlay can be
  added to the hi-res raster later (small sizes + the SVGs stay flat).
