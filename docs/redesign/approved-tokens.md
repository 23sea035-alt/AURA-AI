# Approved tokens — Option A "Reading Nook," softened (LOCKED 2026-06-23)

> The palette + type direction is **locked to Option A, softened** — this **supersedes the original
> 2026-06-22 lock** (terracotta accent, single soft-radius, soft-shadow-only).
>
> ⚠️ **Implementation truth is `client/constants/design.ts` (+ `motion.ts`)** — if this doc and the
> tokens file disagree, the tokens file wins. This doc is the record of the locked decision. The
> design-session docs it used to feed ([`00-foundation.md`](../archive/redesign/00-foundation.md),
> [`00b-tokens-revision.md`](../archive/redesign/00b-tokens-revision.md)) are archived. **Library Wine** accent on warm paper; warm-light + warm-dark; depth
> from **soft warm shadow** (no glow/glass); warm hairline edges reserved for **structural** surfaces.
> Meets WCAG 2.2 AA.

**Type:** **Newsreader** (warm literary serif) for display/headings · **Hanken Grotesk** for body & UI.

## Governing principle — the surface's job decides its treatment

- **Structural / utility surfaces** (list-groups, inputs, settings, legal, dividers) are **crisp**:
  warm low-contrast **hairline** edges + **tight radius** (4/8).
- **Intimate surfaces** (chat bubbles, companion presence, persona + raised cards) are **soft**:
  **tonal fill + soft warm shadow**, **no hard outline**, **soft radius** (12/16). Never border +
  shadow on the same element. *Aura is a soft place to land, not a magazine spread.*

## Color tokens

| Role | Warm-light | Warm-dark |
|---|---|---|
| Background | `#F4ECE0` | `#1B1712` |
| Raised card | `#FBF5EB` | `#25201A` |
| Sheet / modal | `#FFFCF6` | `#2E2820` |
| Text · primary | `#2A241E` | `#F1E8DC` |
| Text · secondary | `#6A5D50` | `#BFB2A2` |
| Text · tertiary | `#9C8E7E` | `#8A7E70` |
| Text · disabled | `#C2B6A7` | `#5C5347` |
| **Accent · Library Wine** | `#8F4150` | `#CC7A84` |
| Accent · on-accent (text/icon) | `#FFFCF6` | `#1F1712` |
| Accent · active tint | `#F1E2E4` | `#3A2A2E` |
| User-bubble fill | `#EFDFE1` | `#3A2A2E` |
| User-bubble text | `#5A3942` | `#EAD7DA` |
| Companion avatar (base / glyph) | `#D8A98C` / `#5A3B2B` | `#7A5142` / `#F4ECDF` |
| Hairline / divider (structural only) | `#E6DBCB` | `#393129` |
| Success | `#5C7850` | `#8AA47C` |
| Warning | `#B07A22` | `#D7A24E` |
| Error | `#B0463A` | `#D9725F` |
| Crisis / safety · fill | `#3D6B5C` | `#6FA08C` |
| Crisis / safety · surface | `#E7F0EB` | `#233A33` |
| Crisis / safety · text (head / body) | `#234A40` / `#3A5A50` | `#CDE5DB` / `#9FC3B5` |

- **One accent — Library Wine** (dusky mulberry/garnet). Primary CTA fill (with on-accent text), active
  state, and caret only — never decoration, never three-at-once, never a screen flood. Keep it a
  **dusky** wine, not a bright cherry.
- The **user chat bubble** uses the muted **user-bubble fill** (a wine tint), not the full accent — cozy,
  not loud. Companion bubbles stay warm paper (`sheet`).
- The **crisis/safety green** is reserved for safety moments (grounding, never alarm-red).

### Accent-contrast + usage rules (AA-verified)

- The accent passes AA both as a **fill** (on-accent text on it ≈6.7:1 light / ≈5.5:1 dark) and as
  **accent-colored text on cream** (≈5.9:1 light / ≈5.7:1 dark on `bg`). On `raised`/`sheet` in dark it's
  ~4.6:1 — so **accent-as-small-text prefers the `bg` surface**, or is sized up / used sparingly there.
- **Tertiary text is fine-print/large only** (~3:1 on cream) — **never** body, a primary label, or a
  **placeholder** (use secondary for placeholders).
- **Don't pair Library Wine and error-red tightly** — both are red-family; keep the wine CTA out of
  immediate adjacency to an error message.

## Type scale

| Role | Font | Size / line · weight |
|---|---|---|
| Display | Newsreader | 40 / 44 · 600 |
| Headline | Newsreader | 30 / 36 · 600 |
| Title | Newsreader | 22 / 28 · 600 |
| Body · chat | Hanken Grotesk | 17 / 26 · 400 |
| Label | Hanken Grotesk | 14 / 18 · 600 |
| Caption | Hanken Grotesk | 12 / 16 · 500 |

Long-form chat uses Body (17/26) with a relaxed measure — readability is the priority. Newsreader serif
is reserved for headings + **"moments"** (greetings, date/session dividers), never for fast-scrolling
bubble text.

## Spacing · radius · elevation

- **Spacing (8pt rhythm):** `4 · 8 · 12 · 16 · 24 · 32 · 48`. Standard screen horizontal inset = 20–24.
- **Radius — dual system:**
  - **Structural** (lists, inputs, settings, legal): `4` / `8`.
  - **Intimate** (bubbles, cards): `12` / `16`; sheets/modals `20`. **Pill (full)** for
    chips / avatars / small pills only — avoid full-pill-everything.
- **Elevation (soft warm shadow, never glow) — for LIFT surfaces** (companion presence, floating
  navpill, sheets, raised/intimate cards):
  - `e1` — light `0 1px 2px rgba(60,40,25,.06)` · dark `0 1px 2px rgba(0,0,0,.35)`
  - `e2` — light `0 4px 14px rgba(60,40,25,.09)` · dark `0 4px 14px rgba(0,0,0,.40)`
  - `e3` — light `0 12px 30px rgba(60,40,25,.14)` · dark `0 12px 30px rgba(0,0,0,.50)`
- **Hairline edge (structural only):** light `#E6DBCB` · dark `#393129`. Intimate surfaces get **no
  outline** — depth from tonal fill + soft shadow.

---

*Provenance: [`00b-tokens-revision.md`](../archive/redesign/00b-tokens-revision.md) (archived). Grading rubric: [`01-doctrine.md`](01-doctrine.md) §13.*
