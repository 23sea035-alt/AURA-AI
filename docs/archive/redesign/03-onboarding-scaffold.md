# 03 — Onboarding scaffold (`Onboarding.html`)

> Paste after the foundation is approved and `01-doctrine.md` + `02-demo-persona.md` are in context,
> with `claude-design/ios-frame.jsx` + `claude-design/dev-harness.jsx` provided as reusable code.
> **This builds the navigable SHELL ONLY — stub screens wired into the flow + the dev rail. It does
> NOT design the screens.** Design each screen later, one at a time, with its per-screen prompt in
> [`screens/onboarding.md`](screens/onboarding.md).

---

## ONBOARDING SCAFFOLD PROMPT

Build **`Onboarding.html`** as a **scaffold only** — the navigable shell for Aura's first-run flow, not
designed screens. **Every screen is a STUB:** the device frame containing a centered placeholder showing
the screen's **title** (large), a **one-line purpose**, and the **current dev state name** (if any). No
real layouts, copy, inputs, cards, buttons, or imagery — we design each screen later with targeted
prompts. It is expected that stubs don't fill the frame vertically.

### Technical setup (same for every scaffold)
- Wrap screen content in `<IOSDevice dark={theme==='dark'}>` from **ios-frame.jsx** (402×874).
- Render the app via **`<DevProvider screens={SCREENS}><DevStage><Shell/></DevStage></DevProvider>`**
  from **dev-harness.jsx**. `DevStage` **scales the whole frame to fit the viewport** (no page scroll;
  only content inside the frame scrolls) — do not roll your own frame layout.
- **Dev rail** (left, outside the frame): screen jumper + **theme / account / data-state /
  per-screen-state** toggles, all driving `useDev()`.
- `Shell` holds the real flow state (`step`, `authMode`, a collected `profile`) with `next/back`; the
  dev rail can also jump to any screen/state directly.
- **Both warm-light and warm-dark.** Tokens only. App surfaces warm + opaque (the only glass is OS
  chrome from ios-frame).

### SCREENS registry (this order = the flow)

```
[ { id:'welcome',    label:'Welcome (value prop)', states:['default'] },
  { id:'auth',       label:'Auth',                states:['signup','signin','forgot','verify','reset'] },
  { id:'carousel',   label:'Intro carousel',      states:['slide1','slide2','slide3'] },
  { id:'agegate',    label:'Age gate',            states:['default','under18'] },
  { id:'disclosure', label:'AI disclosure + ToS', states:['default'] },
  { id:'profile',    label:'Profile setup',       states:['default'] },
  { id:'persona',    label:'Choose companion',    states:['default'] },
  { id:'firstchat',  label:'Conversation',        states:['opening','typing'] } ]
```

One line per screen (for the stub placeholder text — NOT a design brief):
- **welcome** — single value-prop page (not a carousel), pre-auth: get started / sign in.
- **auth** — swappable modes; `authMode` switches the stub label.
- **carousel** — a 3-screen intro, **after** auth; the 3 slides are its states.
- **agegate** — DOB / 18+ gate; `under18` is a dead-end stub.
- **disclosure** — "you're talking to an AI" + Terms acceptance.
- **profile** — first/last name capture.
- **persona** — choose the first companion (Aurora / Orion / Lyra).
- **firstchat** — the conversation the flow ends in (not the dashboard).

### Flow wiring
Happy path: `welcome → auth → carousel → agegate → disclosure → profile → persona → firstchat`. The
carousel advances across its 3 slides before continuing; the auth toggle switches `authMode`; the age
gate branches to the `under18` dead-end. `next/back` move through the path; the dev rail jumps freely.

### Guardrails
- **Stubs only** — do not design screen content here (that's `screens/onboarding.md`).
- **Order is exactly the registry above** — Welcome is one page; the 3-screen carousel is its own step
  **after** auth (not merged into Welcome, not pre-auth).
- **Frame scales to fit** the viewport via `DevStage` — no page scroll.
- **Both themes**, tokens only, dev rail fully wired (jumper + all toggles).
