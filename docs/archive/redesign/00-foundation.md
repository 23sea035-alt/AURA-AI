# 00 — Foundation (paste first into Claude Design)

> Paste the **FOUNDATION PROMPT** block below into a fresh Claude Design session first. It establishes
> the product, the "Warm Sanctuary" mood, and the technical scaffold conventions, then asks Claude
> Design to **propose** palette + type (we approve before any screens). After approval, paste
> [`01-doctrine.md`](01-doctrine.md) + [`02-demo-persona.md`](02-demo-persona.md) as standing context,
> provide the two `claude-design/*.jsx` files, then feed one scaffold prompt at a time.

---

> **Palette/type is now LOCKED to Option A ("Reading Nook").** In new sessions, skip Step 1's
> proposal and paste [`approved-tokens.md`](approved-tokens.md) as the system. Step 1 below is kept for
> reference / provenance only.

## FOUNDATION PROMPT

You are designing the complete visual identity and native iOS UI for **Aura AI**. Work in two steps:
**(1)** propose a palette + type direction and stop for approval; **(2)** once approved, build screens
as the scaffold prompts instruct. This message is step 1's brief and the standing context for step 2.

### What Aura is
A 1:1 **AI-companion chat app** for adults (18+, US-first), native iOS (Expo / React Native). People
talk with a small set of vetted AI personas — **Aurora, Orion, Lyra** — that **remember facts about
them across conversations.** The product's signature is that it is **safety-first and trustworthy**:
crisis support, content moderation, and honest "you're talking to an AI" disclosure are built in.
One premium subscription ($9.99/mo) unlocks personality tuning, extra companions, and unlimited
messages; the free tier has a daily message cap. **The core loop is conversation** — everything
orbits the chat.

### Direction & mood — "Warm Sanctuary"
Aura should feel like a **calm, warm, well-lit room you're glad to be in** — intimate, human, quietly
premium. The reference feeling is a **sunlit reading nook or a thoughtful journal**, not a spaceship,
not a dashboard. Emotional qualities to design toward: **warm, calm, safe, trustworthy, unhurried,
human, considered.** Premium is communicated through **restraint, generous space, and material
warmth** (warm paper, soft textile, natural light, real depth), never through tech signifiers. Aura
holds people's vulnerable conversations; the interface must feel like it can be trusted with them.

### The prime directive — do NOT produce the generic "AI app" look
The fastest way to fail is to ship the default AI aesthetic. **Avoid all of:** glassmorphism /
frosted glass as the primary language; glowing orbs, neon, "light-leak," glow in place of real
shadow; deep purple/indigo cosmic gradient backgrounds; sci-fi HUD vibes; rainbow / multi-stop
gradients; gradient-blob heroes; `Inter`/`Roboto` as the only typeface; geometric-techy display
fonts (Sora, Space Grotesk, Orbitron); emoji-as-UI and "AI sparkle" ✨ / robot motifs; generic SaaS
card-grid dashboards; purple-on-near-black "ChatGPT clone" chat. *(The full rule set + the
"vibe-coded tell → alive equivalent" table is in `01-doctrine.md` — honor it on every screen.)*
If a choice feels like the default an AI tool would auto-generate, choose differently and more
deliberately.

### STEP 1 — Propose palette + type, then stop
Do **not** silently pick one and build. **Propose 2–3 distinct palette+type directions**, all within
the Warm Sanctuary mood, and **stop for approval.** For each option provide:
1. A short name + one-line rationale.
2. A **full token table** with hex for **both a warm-light and a warm-dark theme**:
   - **Surfaces:** 3–4 elevation steps built from **subtle warmth and tone, not glow** (background →
     raised card → sheet/modal). Light = off-white / cream / warm sand. Dark = **warm charcoal or
     brown-black — never pure `#000`, never cool blue-grey.**
   - **Text:** primary / secondary / tertiary / disabled, each meeting contrast minimums on its surface.
   - **One warm primary accent**, used with restraint (explore terracotta, amber, clay, warm rose,
     ochre, sage). Optionally one quiet secondary.
   - **Borders / dividers** (soft, low-contrast).
   - **Semantic states** (success / warning / error) that belong to the warm world — and a
     **crisis/safety treatment that is grounding and supportive, NOT alarming klaxon-red.**
3. A **type pairing** — warm and characterful, not techy. Lead candidates: a humanist serif or soft
   humanist sans for display/headings (the *feeling* of Fraunces, Newsreader, Source Serif, Hanken
   Grotesk), paired with a **highly legible body face for long-form chat** (relaxed line-height and
   measure). Avoid `Inter`-as-default and any geometric/sci-fi display. Give a one-line sample + a
   full type scale (display / headline / title / body / label / caption).
Constraints for every option: meet **WCAG 2.2 AA** contrast; the accent is an accent, not a flood;
depth comes from soft warm shadows + tonal layering, not borders-everywhere or glow.

Also deliver, for the leading option: the **core token set** (color, type scale, spacing on an 8pt
rhythm, radius, elevation) and a **small component sample** (button set, a chat-bubble pair, an input
bar, a card, a persona-avatar treatment). **Then stop and wait for approval — do not build full
screens in step 1.**

### STEP 2 — Technical scaffold conventions (how every screen is built once approved)
Each scaffold prompt asks you to build **one self-contained React HTML artifact = one flow**
(Onboarding, HomeTabs, or a set of one-off screens). Conventions for all of them:

- **Device chrome:** wrap screen content in the provided **`ios-frame.jsx`** (`<IOSDevice>` etc. —
  status bar, Dynamic Island, home indicator, optional keyboard; 402×874 pt = iPhone 16 Pro).
  **Important:** the glass in `ios-frame.jsx` is the *iOS operating system* chrome — it's the device,
  not our app. The "no glassmorphism" rule applies to **our app's content surfaces inside the frame**,
  which must be warm and opaque, not frosted.
- **Dev rail (required):** use the provided **`dev-harness.jsx`** to render a control rail **outside,
  to the left of, the device frame** (never inside the UI). It provides a **screen jumper** (jump to
  any screen in this artifact), and **toggles** for: **theme** (warm-light / warm-dark), **account**
  (free / premium), **data state** (happy / empty / loading / error), and **per-screen states**
  declared by each screen (e.g. chat: default / typing / crisis / limit-reached). Screens read this
  via the `useDev()` context and render accordingly — so the toggles double as a forcing function to
  actually build every state.
- **Screen registry + shell:** define a `SCREENS` (or `TABS`) array — `{ id, label, states? }` — and a
  `Shell` component that renders the active screen; `dev-harness` drives which one shows.
- **Tokens only.** No hardcoded hex/px in screens — pull from the approved palette + an 8pt spacing
  scale + the radius/elevation tokens. Render **both light and warm-dark** for each screen.
- **States discipline.** Every data view designs **loading (skeleton, not a spinner) / empty / error /
  happy** — wired to the dev rail's data-state toggle.
- **Accessibility.** WCAG 2.2 AA contrast; ≥44pt touch targets; Dynamic-Type-friendly layouts;
  honor reduce-motion; label icon-only controls. (Details in `01-doctrine.md`.)
- **Content.** Use the **demo persona** in `02-demo-persona.md` verbatim so every screen tells one
  coherent story — same user, same companion, same conversation, same numbers.

Confirm you understand, then deliver the **step-1 palette + type proposals** and stop.
