# 05 — One-off screens scaffold (`OneOff.html`)

> Paste after the foundation is approved and `01-doctrine.md` + `02-demo-persona.md` are in context,
> with `claude-design/ios-frame.jsx` + `claude-design/dev-harness.jsx` provided as reusable code (and
> after `03`/`04` exist). **This builds the navigable SHELL ONLY — stub screens + the dev rail. It does
> NOT design the screens.** Design each one later, one at a time, with its per-screen prompt in
> [`screens/oneoffs.md`](screens/oneoffs.md).

---

## ONE-OFF SCREENS SCAFFOLD PROMPT

Build **`OneOff.html`** as a **scaffold only** — every screen you *push to* from the three tabs, as
**stubs** wired into the dev rail. **Each screen is a STUB:** the device frame containing a centered
placeholder showing the screen's **title** (large), a **one-line purpose**, and the **current dev state
name** (if any). No real layouts, copy, cards, or imagery — we design each later with targeted prompts.
Stubs won't fill the frame; that's expected.

### Technical setup (same for every scaffold)
- Wrap screen content in `<IOSDevice dark={theme==='dark'}>` from **ios-frame.jsx** (402×874).
- Render via **`<DevProvider screens={SCREENS}><DevStage><Shell/></DevStage></DevProvider>`** from
  **dev-harness.jsx** — `DevStage` **scales the whole frame to fit the viewport** (no page scroll).
- **Dev rail** (left, outside the frame): screen jumper + **theme / account / data-state /
  per-screen-state** toggles driving `useDev()`.
- `Shell` renders the active stub with a **back affordance** (`BackChevron` / nav-bar back) to the tab
  it came from; the dev rail jumps to any screen/state.
- **Both warm-light and warm-dark.** Tokens only. App surfaces warm + opaque (only OS chrome is glass).

### SCREENS registry (build in this order)

```
[ { id:'chat',     label:'Chat conversation ★', states:['default','typing','crisis','limit','report'] },
  { id:'create',   label:'Companion create/edit', states:['create','edit'] },
  { id:'memory',   label:'Memory',              states:['happy','empty','loading','error'] },
  { id:'paywall',  label:'Paywall',             states:['default','owned'] },
  { id:'submgmt',  label:'Subscription mgmt',   states:['default'] },
  { id:'editprofile', label:'Edit profile',     states:['default','focus','error','saving'] },
  { id:'account',  label:'Account management',  states:['default','export-sent','delete-confirm'] },
  { id:'notifs',   label:'Notifications',       states:['default'] },
  { id:'safety',   label:'Safety center',       states:['default'] },
  { id:'legal',    label:'Privacy / legal',     states:['default'] },
  { id:'help',     label:'Help / support',      states:['default'] },
  { id:'states',   label:'System-states kit',   states:['empty','loading','error','offline','blocked'] } ]
```

`chat` is the hero (and, once designed, **reuses `03`'s `firstchat` components** — don't rebuild them).
The other entries are one-line stubs until their per-screen prompt is run.

### Flow wiring
`Shell` renders the screen the dev rail selects, each with a back affordance. These are reached (in the
real app) from the tabs and from each other — but in this scaffold they're independent stubs the dev
rail switches between. No designed content yet.

### Guardrails
- **Stubs only** — do not design screen content here (that's `screens/oneoffs.md`).
- **Frame scales to fit** via `DevStage` — no page scroll. **Both themes**, tokens only, dev rail wired
  (jumper + all toggles, including each screen's per-screen states).
