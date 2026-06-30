# Aura AI — Redesign prompt library

This folder is the **plan of record for the Aura AI visual redesign**, executed in an external
**Claude Design** session. We do **not** edit app code here — these are the prompts + reusable
scaffolding we paste into Claude Design, plus the design rules we grade the output against.

Modeled on the sibling repo **`../Amibroke`** (`origin/master`), which already ran this exact
playbook successfully (same Expo/React Native stack).

## Locked decisions (2026-06-22)

- **Direction:** "Warm Sanctuary" — warm, calm, human, trustworthy. Deliberately *off* the cold
  cosmic/purple/neon/glassmorphism default (that look reads as vibe-coded).
- **Palette + type:** **LOCKED — Option A "Reading Nook"**: Newsreader (display) × Hanken Grotesk (body),
  terracotta accent on warm paper; warm-light + warm-dark. Full tokens in [`approved-tokens.md`](approved-tokens.md).
- **Logo / app icon:** **LOCKED (2026-06-24)** — an abstract two-form mark (a larger wine form sheltering a
  smaller terracotta one; warm gouache on cream). No wordmark yet (blocked on the app name). Source +
  variants (color master, transparent animation mark, mono, 1024 PNGs) live in
  [`../../client/assets/logo/`](../../client/assets/logo/) — see its README. Colors are `LOGO_COLORS` in
  `client/constants/design.ts` (wine `#8F4150` / honey `#BD6B45` / cream `#F4ECE0`). Still on the old Expo
  `icon.png` placeholder — wiring the live app icon/splash is a separate step.
- **Icons:** **LOCKED (2026-06-25)** — **Phosphor** (`phosphor-react-native`, MIT) is the committed icon
  family for the RN port: warm/rounded, `regular` (outline) idle + `fill` active, matching doctrine §6.
  The web prototypes keep hand-rolled inline SVG in the same style (no RN icon deps run in-browser); the
  logo/brand mark stays bespoke. No emoji-as-UI (§0): the only two were removed/replaced — notifs `💬`
  dropped (settings rows are text-only), break-reminder `💛` → an inline wine heart SVG.
- **Platform:** iOS, native (Expo / React Native). Frame = iPhone 16 Pro (402×874 pt).
- **Navigation:** 3 tabs — **Home · Companions · You**. Chat is a pushed screen.
- **Onboarding flow:** one-page Welcome (value prop) → auth (swappable) → **3-screen carousel
  (post-auth)** → age gate (18+) → AI disclosure + ToS → profile → choose companion → **first
  conversation** (NOT the dashboard).
- **Two-phase build:** **scaffold first** (a navigable shell of *stub* screens + the dev rail), then
  **per-screen design prompts** pasted one at a time to flesh out each stub. Keeps Claude Design from
  over-building the whole flow at once.

## The doc set (read / paste in order)

| File | Role |
|---|---|
| [`00-foundation.md`](00-foundation.md) | **Paste first.** Project + Warm Sanctuary mood + the palette/type proposal workflow + the technical scaffold conventions (ios-frame, dev rail, tokens). |
| [`approved-tokens.md`](approved-tokens.md) | **LOCKED palette + type (Option A — Reading Nook)** — the concrete token set every screen builds from. Paste as the system; replaces `00`'s Step-1 proposal. |
| [`01-doctrine.md`](01-doctrine.md) | Standing design rules — the anti-"vibe-coded" doctrine + the completeness/accessibility gate. Our grading rubric. |
| [`02-demo-persona.md`](02-demo-persona.md) | The **one coherent demo persona** (user + companion + conversation + memories) that threads through every screen so the prototype tells one story. |
| [`03-onboarding-scaffold.md`](03-onboarding-scaffold.md) | **Scaffold** (stubs + nav + dev rail) for `Onboarding.html`. |
| [`04-hometabs-scaffold.md`](04-hometabs-scaffold.md) | **Scaffold** (stubs + 3-tab navpill + dev rail) for `HomeTabs.html`. |
| [`05-oneoff-screens.md`](05-oneoff-screens.md) | **Scaffold** (stubs + dev rail) for the pushed/one-off screens + system-states kit. |
| [`screens/onboarding.md`](screens/onboarding.md) | **Per-screen design prompts** for the onboarding flow — paste one at a time after the `03` scaffold. |
| [`screens/hometabs.md`](screens/hometabs.md) | **Per-screen design prompts** for Home · Companions · You — paste one at a time after `04`. |
| [`screens/oneoffs.md`](screens/oneoffs.md) | **Per-screen design prompts** for Chat (hero), Paywall, Memory, … + the states kit — paste one at a time after `05`. |
| [`claude-design/ios-frame.jsx`](claude-design/ios-frame.jsx) | Reusable iOS device chrome (status bar, Dynamic Island, nav bar, home indicator, keyboard). |
| [`claude-design/dev-harness.jsx`](claude-design/dev-harness.jsx) | Reusable **out-of-frame dev rail** + state context (screen jumper · theme · free/premium · per-screen states). |

## How a Claude Design session goes

1. Paste **`00-foundation`** → Claude Design proposes palette + type. **Approve one.**
2. Paste **`01-doctrine`** + **`02-demo-persona`** as standing context.
3. Provide the two `claude-design/*.jsx` files as reusable scaffolding.
4. **Scaffold:** paste **one scaffold prompt** (`03`/`04`/`05`) → Claude Design builds that HTML
   artifact as a navigable shell of **stub** screens, with the dev rail wired so you can jump screens
   and flip states (theme / account / data state / per-screen states) while reviewing.
5. **Design, one screen at a time:** paste a single per-screen block from the matching
   `screens/*.md` to flesh out that stub. Repeat per screen. (Pasting a whole `screens/*.md` at once
   is what over-builds — go one block at a time.)
6. Export the approved HTML into `claude-design/` (mirrors Amibroke's `docs/redesign/claude-design/`).
