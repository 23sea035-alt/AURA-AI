# 04 — HomeTabs scaffold (`HomeTabs.html`)

> Paste after the foundation is approved and `01-doctrine.md` + `02-demo-persona.md` are in context,
> with `claude-design/ios-frame.jsx` + `claude-design/dev-harness.jsx` provided as reusable code.
> **This builds the navigable SHELL ONLY — stub tab screens + the 3-tab navpill + the dev rail. It does
> NOT design the screens.** Design each tab later, one at a time, with its per-screen prompt in
> [`screens/hometabs.md`](screens/hometabs.md).

---

## HOMETABS SCAFFOLD PROMPT

Build **`HomeTabs.html`** as a **scaffold only** — the signed-in **3-tab** app shell, not designed
screens. **Every tab screen is a STUB:** the device frame containing a centered placeholder showing the
tab's **title** (large), a **one-line purpose**, and the **current dev state name** (if any). No real
layouts, copy, cards, or imagery — we design each tab later with targeted prompts. Stubs won't fill the
frame; that's expected.

### Technical setup (same for every scaffold)
- Wrap screen content in `<IOSDevice dark={theme==='dark'}>` from **ios-frame.jsx** (402×874).
- Render via **`<DevProvider screens={TABS}><DevStage><Shell/></DevStage></DevProvider>`** from
  **dev-harness.jsx** — `DevStage` **scales the whole frame to fit the viewport** (no page scroll).
- **Dev rail** (left, outside the frame): screen jumper + **theme / account / data-state** toggles
  driving `useDev()`.
- `Shell` holds the **active tab** and renders the stub under a persistent **3-tab navpill**; the dev
  rail can also jump to any tab.
- **Both warm-light and warm-dark.** Tokens only. App surfaces warm + opaque (only OS chrome is glass).

### TABS registry (left→right in the navpill)

```
[ { id:'home',       label:'Home',       states:['happy','empty','loading','error'] },
  { id:'companions', label:'Companions', states:['happy','empty','loading','error'] },
  { id:'you',        label:'You',        states:['default'] } ]
```

One line per tab (stub placeholder text — NOT a design brief):
- **home** — "your companion's room" landing (NOT a metrics dashboard).
- **companions** — the roster (doubles as the chat list); create/customize is premium-gated.
- **you** — the account hub (profile, subscription, privacy & safety, support).

### Navpill & flow wiring
A clean **3-tab navpill — NO center "+" FAB** — rendered as a **floating overlay, never a docked footer**:
- `position: absolute` at the bottom, `z-index` above the screen; each tab screen fills the **full**
  frame and its content scrolls **underneath** the bar (the bar floats on top, it owns no layout space).
- **Warm surface, no gray:** the sheet/raised token (`#FFFCF6` light / `#2E2820` dark) + a soft **warm**
  shadow (elevation e2/e3, `rgba(60,40,25,…)`) + optional hairline warm border — **never a gray or
  system-default background.**
- **Detached:** a small horizontal inset + a gap above the home indicator (Cash-App style) so it reads
  as floating; respect the bottom safe area (don't overlap the home indicator).
- **Content clearance:** each tab screen gets bottom padding = bar height + the home-indicator gap so
  content is never hidden behind the floating bar.
- Active pill uses the one warm accent (outline icon → filled when active).

`Shell` tracks the active tab (`home` default); tapping a pill switches tabs. Chat and other pushed
screens are **separate artifacts** (built from `05`) — from a stub, a primary CTA may deep-link by
filename (e.g. `Chat.html`) or be inert. The dev rail jumps to any tab/state.

### Guardrails
- **Stubs only** — do not design tab content here (that's `screens/hometabs.md`).
- **3 tabs: Home · Companions · You. No FAB.** Chat is pushed, not a tab.
- **Navpill = floating overlay** — warm token surface + soft warm shadow, content scrolls under it;
  **never a solid gray footer band.**
- **Frame scales to fit** via `DevStage` — no page scroll. **Both themes**, tokens only, dev rail wired.
