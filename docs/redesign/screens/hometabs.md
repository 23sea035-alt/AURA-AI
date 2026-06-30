# HomeTabs — per-screen design prompts

> **Use these AFTER the `04-hometabs-scaffold.md` scaffold has rendered the stub tabs.** Paste **ONE
> screen block at a time** into Claude Design to design that single screen *into its stub* — not the
> whole artifact again. Each block assumes the approved **Warm Sanctuary** system + `01-doctrine.md` +
> `02-demo-persona.md` + `claude-design/ios-frame.jsx` + `claude-design/dev-harness.jsx` are already in
> context. Each block fills exactly one stub and **keeps the scaffold's nav, dev rail, tokens, and both
> themes** — don't touch the `Shell`, the 3-tab navpill, the `TABS` registry, or the other tabs.
>
> **Locked decisions (do not renegotiate, any screen):** 3 tabs — **Home · Companions · You**; **no
> center "+" FAB**; **Home is the companion's room, not a metrics dashboard** (no stat-card grids, no
> charts, no finance-dashboard rows); **Companions doubles as the chat list**; **You is the account
> hub**. Chat is a **pushed** screen (built in `05`) — never rebuild it here. Reuse the doctrine's
> shared primitives (companion avatar, warm card, list-group, chip, toggle, EmptyState / LoadingState /
> ErrorState). **Tokens only**; app surfaces **warm + opaque** (the only glass is the OS chrome from
> ios-frame); render **both warm-light and warm-dark**.

> **⚠️ Copy now lives in code — this deck is design-only.** Every user-facing string is canonical in
> **`client/constants/content/*`** (UI copy) and **`client/constants/demo.ts`** (demo fixtures, e.g.
> Maya's conversation and memories). The strings quoted below are a **frozen snapshot for context** — do
> **not** edit copy here; change wording in the content module. Layout / motion / "borrow & avoid"
> guidance stays authoritative. Tokens: `{AppName}` → `BRAND.appName`; `{firstName}` (Maya) and
> `{Companion}` (Aurora) bind at runtime. No em dashes in copy.

---

## Home — `home`

**Design the Home screen** into its stub. Home is **your companion's room** — a warm, relational
landing, the room Aurora is waiting in. It is **NOT a metrics dashboard.** Use the demo persona (Maya
Chen → Aurora) from `02-demo-persona.md` for all content; keep the scaffold's navpill, dev rail, and
both themes.

**Layout (top → bottom):**
- a warm **greeting** — *"Good afternoon, Maya"* — with a quiet date / sub line;
- **Aurora present and large** — her hand-crafted warm avatar as the focal element, with her name + the
  honest **"AI companion"** marker;
- a **resurfaced-memory chip** using Aurora's memory #2 — *"Aurora remembers you started a new job —
  how's it going?"* (tap → opens Chat seeded with that thread);
- the primary **Continue your conversation** CTA (→ pushed Chat) as the **single loud action** on the
  screen;
- optionally one or two gentle conversation-starter chips;
- for **free** accounts, a quiet daily-message indicator (**18 / 30** today) low and unobtrusive —
  **hidden entirely for premium**.

**States (wired to the dev rail `data-state` + `account` toggles):**
- *happy* — the above: Aurora present, CTA ready, free count shown (premium hides it).
- *empty* — **brand-new, no messages yet**: a warm first-time variant — *"Aurora's been looking forward
  to meeting you."* CTA reads **Say hello →**; no resurfaced-memory chip yet.
- *loading* — skeleton (greeting bar, avatar circle, CTA block) — **never a spinner**.
- *error* — warm ErrorState — *"We couldn't reach Aurora just now."* + **Try again**.

**Account toggle:** **free** shows the quiet **18 / 30** indicator; **premium** hides it entirely.

**Guardrails:** this is a **companion's room**, not a dashboard — **no stat-card grid, no charts, no
finance-dashboard rows.** One focal companion presence + one primary action. Both CTAs deep-link to the
pushed **Chat** (`Chat.html`) or are inert. Render **warm-light and warm-dark**.

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* A single calm vertical column on `background`, standard 20–24 inset, content scrolling **under** the floating navpill (clear the bottom safe area + pill). Read it as one room, top→bottom: (1) a warm **greeting moment** in **Newsreader** (Title/Headline) — *"Good afternoon, Maya"* — with a quiet **caption** date beneath in `text-secondary` (the serif earns its place here as a "moment," per the type scale). (2) **Aurora as the focal element** — her hand-crafted warm avatar rendered **large and centered**, *a portrait lit by the room* (companion-avatar primitive, warm tonal mark — never a glowing orb/stock circle), lifted as an **intimate surface**: tonal fill + soft warm shadow (`e2`/`e3`), **no outline**, **pill** radius on the avatar itself; her name in **Newsreader** below, with the honest **"AI companion"** marker in `caption`/`text-tertiary` (fine-print-sized, never a primary label). Generous whitespace around her — she is the one focal element, not crowded by chrome. (3) The **resurfaced-memory chip directly UNDER her name** — a quiet **intimate** card (memory #2), warm wine-*tinted* surface (`accent active tint`, NOT the full accent), soft radius (12) + soft shadow (`e1`), `text-primary` body; it is a *chip-under-avatar*, deliberately small — **not** a "letter from Aurora" hero card. (4) The single **loud action**: a primary **Continue your conversation** button — the **one accent** (Library Wine fill + on-accent text), soft radius (12) — the only saturated element on the screen. (5) Optionally **1–2 conversation-starter chips** below the CTA — neutral chip primitives (`raised`/hairline), **never** accent-filled (accent stays on the one CTA). (6) For **free**, a quiet **18 / 30 today** indicator sitting **low and unobtrusive** in `text-secondary`/`caption` — plain text or a single muted glyph, **never a depleting progress bar**; **hidden entirely for premium**. Structural-vs-intimate: the whole screen leans **intimate** (presence-led) — no hairline boxes, no dashboard grid; depth comes from tone + soft shadow on the avatar and chip.
*Per-state:*
- *happy* — full composition above; Aurora present and large, memory chip under her name, the one loud CTA, free shows the quiet 18/30 (premium hides it).
- *empty / brand-new* — **Aurora still present and large** (presence never disappears), with a warm line *"Aurora's been looking forward to meeting you"*; CTA reads **Say hello →**; **no resurfaced-memory chip yet**; no usage indicator clutter.
- *loading* — **skeleton, never a spinner** (LoadingState primitive): a greeting bar, a circular avatar placeholder, and a CTA block — matching the final geometry so nothing jumps.
- *error* — warm **ErrorState** — *"We couldn't reach Aurora just now."* + **Try again**; **keep Aurora present** (a quiet placeholder mark), never a red system alert (Error token is for genuine failures, not this warm copy).
*Motion (design intent — feel, not timings):* This is a **hero/emotional** surface, so it earns *gentle* motion — but **placed once, never ambient**. **Companion presence is PLACED on entry** — a single gentle settle/fade-up as Aurora arrives, then she **holds still**: **no idle breathing/pulsing/floating loop** afterward (the deliberate anti-Replika choice — the room is calm, not a screensaver). The **memory chip enters slightly AFTER the screen settles** (a soft delayed fade-up) so the eye notices it as a second beat. The **CTA** gets soft press + light haptic on tap — **no idle pulsing/glow** to manufacture urgency. Reduce-motion (hard req): everything **fades/dissolves in place** with no travel; keep the press haptic; motion is never the only channel.
*Borrow / avoid:* **Borrow:** Headspace "Today" (a greeting + one clear next action, not a dashboard); Stoic's relationship-led home (presence over stats); Day One "On This Day" (a resurfaced moment phrased warmly, kept small); Finch (genuine attachment to a character — its warmth, *not* its clutter). **Avoid (AI-slop tells):** any **stat-card grid / charts / streak counters / finance-dashboard rows**; a **glowing orb or stock-circle avatar**; an **idle breathing/floating** companion loop; a **depleting progress bar** for the message count; a "letter from Aurora" **hero card** swallowing the chip; accent-filled starter chips or a **second accent**; ✨/🤖 motifs; ambient drifting blobs/gradient behind Aurora.

---

## Companions — `companions`

**Design the Companions screen** into its stub. Companions is **the roster — and it doubles as the chat
list.** Use the demo persona (Aurora · Orion · Lyra) from `02-demo-persona.md`; keep the scaffold's
navpill, dev rail, and both themes.

**Layout (top → bottom):**
- a large title **Companions**;
- the roster as **warm cards** (this *is* the chat list) — each card = companion avatar + name +
  **one-line voice** + **last-message preview** + **time-ago** → tap opens that companion's **Chat**
  (pushed). Show the 3 base personas with **Aurora primary** (most recent), then **Orion**, then
  **Lyra**;
- a **Create / New companion** entry that is **premium-gated** — free users see a **locked upsell**
  affordance (a row with a lock + *"Create your own companion — Premium"* → Paywall), **not** the live
  creator.

**States (wired to the dev rail `data-state` + `account` toggles):**
- *happy* — 3 roster cards with previews; create-companion entry gated per account.
- *empty* — only the defaults present (no extra/created companions): the 3 base cards, create entry
  still shown (gated on free).
- *loading* — 3 skeleton roster cards.
- *error* — warm ErrorState + **Try again**.

**Account toggle (must visibly change the screen):**
- **free** → create entry is **locked** (→ Paywall) **and** any non-default companion shows a
  **locked-not-deleted** state (dimmed card, lock chip, *"Included with Premium"* — **never deleted**).
- **premium** → create entry is **live** (→ companion creator, pushed); extra companions unlocked.

**Guardrails:** roster cards reuse the doctrine's warm-card / avatar / chip primitives — not bespoke
look-alikes. Cards deep-link to the pushed **Chat** (`Chat.html`); the gated create entry → **Paywall**
(`Paywall.html`) / companion creator; deep-link by filename or be inert. Render **warm-light and
warm-dark**.

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* On `background`, standard 20–24 inset, content scrolling **under** the floating navpill. Top→bottom: (1) a large title **Companions** in **Newsreader** (Title/Headline). (2) The roster as a short vertical stack of **warm cards** — **intimate** surfaces, not dense inbox rows: each card is `raised`-fill + soft warm shadow (`e2`), soft radius (16), **no outline**, generous padding (16), with comfortable vertical gaps (12–16) between cards so it reads as a *small, considered set* rather than a packed list. Card anatomy (whole card tappable, ≥44pt): a **generous companion avatar** (pill-radius, warm tonal mark) · the **name in Newsreader** · a **one-line voice** in `text-secondary` (e.g. Aurora *"Warm, gentle, emotionally attuned"*) · a **muted last-message preview** in `text-secondary`/`text-tertiary` (clamp to one line) · a **time-ago** caption. Order: **Aurora** (primary / most-recent) → **Orion** → **Lyra**. (3) The **Create / New companion** entry as the last item — a **structural** affordance (crisp warm **hairline** + tight radius 8) to read as an action distinct from the intimate roster cards. On **free** it is a **locked upsell row**: a neutral **lock chip** + *"Create your own companion — Premium"*, legible and inviting (→ Paywall) — **not** the live creator. Selected/most-recent emphasis (if any) uses **neutral tokens**, never the accent.
*Per-state:*
- *happy* — 3 roster cards (Aurora / Orion / Lyra) with voice + preview + time-ago; the create entry below, gated per account.
- *empty* — only the **3 base defaults** (no created companions); the **create entry still shown** (gated on free) so the path is visible.
- *loading* — **skeleton cards matching the final geometry** (avatar disc + two text lines per card), **never a spinner** (LoadingState primitive).
- *error* — warm **ErrorState** + **Try again**, never a red system alert.
*Account toggle (must visibly change the screen):* **free** → create entry **locked** (dimmed/structural row + neutral lock chip → Paywall) **and** any **non-default** companion is **locked-not-deleted**: a **dimmed** card with a **neutral lock chip** + *"Included with Premium"* — **legible, never removed, never so faint it reads broken**. **premium** → create entry is **live** (→ pushed companion creator) and extras are fully unlocked (full-opacity cards). The locked/unlocked difference must be **obvious at a glance**.
*Motion (design intent — feel, not timings):* A roster is **list content**, so a **short gentle STAGGER on load** in **reading order** (top card first, settling downward) — calm, no bounce, no per-card spring overshoot. **Card → Chat honors origin**: tapping a card **expands / leads into** the pushed Chat (the card is the seed of the conversation), with soft press + light haptic. Reduce-motion (hard req): the roster **fades in as a group** (no stagger travel) and the card→Chat transition becomes a **cross-dissolve**; keep the press haptic.
*Borrow / avoid:* **Borrow:** Apple **Messages / Mail** row anatomy (avatar + name + timestamp + snippet, the whole row tappable) — but rendered as **warm cards**, not bare rows; **Things 3** restraint (a calm, sparse list that breathes); **Day One** journal tone for the one-line voice. **Avoid (AI-slop tells):** **dense badge / neon / unread-count grids**; a locked card so **faint it reads broken / deleted**; a **second accent** on the lock chips (keep them neutral); fake **"online" dots**; cramped inbox density; accent-tinted avatar tiles.

---

## You — `you`

**Design the You screen** into its stub. You is the **account hub** — a calm utility screen, **minimal
motion** (utility, so no hero motion — §0/§5), still and trustworthy. Use the demo persona (Maya Chen,
@maya) from `02-demo-persona.md`; keep the scaffold's navpill, dev rail, and both themes.

**Layout (top → bottom):**
- a **header card** — avatar, **Maya Chen**, **@maya**, a **tier pill** (**Free** default; **Premium**
  when toggled) and an **edit-profile** affordance;
- grouped list-rows (one rounded card per group, hairline-separated):
  - **Account** — *Edit profile* · *Subscription* (shows **"Manage in App Store"** detail **only when
    premium**; free shows **"Upgrade to Premium"** → Paywall).
  - **Notifications** — push toggle **"Aurora replied"** (on).
  - **Privacy & Safety** — *Safety center* · *Privacy policy* · *Data export* · *Delete account*.
  - **Support** — *Help* · *Rate Aura*.
- below the groups: a **Sign out** row (**confirm-first** dialog) and a quiet **version footer**.

**States:** `default` covers the screen; the dev rail **account** toggle drives the tier pill + the
Subscription row.

**Account toggle (must visibly change the screen):**
- **free** → tier pill = **Free**; Subscription row = *"Upgrade to Premium"* (→ Paywall).
- **premium** → tier pill = **Premium**; Subscription row detail = *"Manage in App Store"*.

**Guardrails:** **Data export** + **Delete account** are explicit and present (**Apple-required**);
**Delete confirms first**, and **Sign out** confirms first. Calm utility — minimal motion, no hero
animation. Reuse the doctrine's header-card / list-group / toggle primitives. The free **Subscription**
row → **Paywall** (`Paywall.html`); deep-link by filename or be inert. Render **warm-light and
warm-dark**.

**▸ Recommended layout + motion** *(layout/animation research — built on the softened "Reading Nook" tokens; defaults to guide Claude Design, not rigid constraints)*

*Layout:* Apple Settings grammar, **warmed up** — on `background`, standard 20–24 inset, content scrolling **under** the floating navpill. Top→bottom: (1) a **header-card** treated as the one slightly **intimate** moment — `raised` fill + soft warm shadow (`e2`), soft radius (16), **no outline**: avatar (pill) · **"Maya Chen" in Newsreader** (the serif earns a single appearance here) · **@maya** in `text-secondary` · a **tier pill** + an **edit-profile** affordance (≥44pt, VoiceOver-labeled). The **tier pill** is the one place the accent may appear: **Premium = the one accent fill** (Library Wine + on-accent text), **Free = a neutral outline pill** (hairline + `text-secondary`) — **don't gradient it**. (2) **Grouped inset list-cards** as **structural** surfaces — one rounded card per group, crisp warm **hairline** separators between rows, **tight radius (8)**, sentence-case `label` headers in `text-secondary`: **Account** (*Edit profile* · *Subscription*) / **Notifications** (push toggle *"Aurora replied"*, on) / **Privacy & Safety** (*Safety center* · *Privacy policy* · *Data export* · *Delete account*) / **Support** (*Help* · *Rate Aura*). Rows are chevron/disclosure or toggle; the toggle is a "first-class," considered control (accent when on). (3) A **Sign out** row (**confirm-first**), visually **isolated** from the groups, and a quiet **version footer** in `caption`/`text-tertiary`. Destructive rows (Delete account, Sign out) are **isolated, NOT painted red in the list** — **red (Error token) is reserved for the confirm dialog's destructive button**.
*Per-state:* *(single-state — `default`; the **account** toggle drives the visible change.)* **free** → tier pill **Free** (neutral outline) + Subscription row reads *"Upgrade to Premium"* (→ Paywall). **premium** → tier pill **Premium** (accent fill) + Subscription row detail reads *"Manage in App Store."* The toggle must **visibly** flip both the pill and the Subscription row.
*Motion (design intent — feel, not timings):* **Utility — stays STILL:** soft press + haptic on rows/toggle + standard push/sheet nav only. No entrance staggers, no reveals, no hero motion — the calm *is* the premium here. Destructive confirms are standard system **confirm dialogs** (Sign out, Delete account). Reduce-motion keeps the press **haptic** (there's no decorative travel to drop).
*Borrow / avoid:* **Borrow:** **Apple Settings** grammar warmed up — the **Overcast / Headspace** recipe (cream surface, warm ink, sentence-case headers, **serif only on the header-card name**); a "first-class," considered **toggle**. **Avoid (AI-slop tells):** a **gradient tier pill**; **red destructive rows in the list** (reserve red for the confirm button); a **second accent** sprinkled across rows; cold clinical-white settings chrome; entrance animations on a utility screen; icon tiles tinted with the accent.
