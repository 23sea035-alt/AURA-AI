# 00b — Token revision: Option A "Reading Nook," softened (Step 1B)

> **Status: RUN + LOCKED 2026-06-23.** This is the revision prompt pasted into Claude Design to correct
> the first "Reading Nook" token proposal — it softened the depth model and swapped the accent to
> **Library Wine**. The resulting locked token set lives in [`approved-tokens.md`](approved-tokens.md)
> (paste *that* as the system; this file is provenance / reproducibility).
>
> **Why the revision:** Claude Design's Step-1 "Reading Nook" had drifted too "editorial-hard" for an app
> that holds vulnerable conversations — hard near-black 1px borders everywhere, sharp 2–6 radius, no soft
> shadow, a near-black dark theme, and a bright vermilion accent (`#D8492C`). The corrections below pull
> it back toward "a soft place to land" without losing the editorial typography. Governing idea: **each
> surface's emotional job decides its treatment — structural crisp, intimate soft.**

---

## The prompt (pasted into the existing Claude Design session)

```
STEP 1B — Revise and re-lock the system: Option A "Reading Nook," softened. Re-emit the core
tokens + a component sample, then STOP for approval. Do NOT build screens yet. This supersedes
the Step-1 "Reading Nook" token set; ios-frame.jsx and dev-harness.jsx are untouched.

We're keeping Option A's spine — Newsreader display, the paper-cream editorial palette, big
confident type. Two things drifted too far toward "editorial magazine" for an app that holds
people's vulnerable conversations, and the accent needs to change. Apply the corrections below.

GOVERNING PRINCIPLE (applies to every token and component decision):
Let each surface's emotional job decide its treatment.
- STRUCTURAL / utility surfaces (list-group dividers, section rules, inputs, legal/settings
  blocks) stay CRISP — editorial hairlines, tighter radius. This is where precision reads as
  "considered."
- INTIMATE surfaces (chat bubbles, the companion avatar, persona cards — the things people are
  vulnerable on) go SOFT — tonal fill + soft warm shadow, no hard outline, gentler radius.
Aura is a soft place to land, not a magazine spread. When in doubt, soften the intimate surface.

CORRECTIONS (deltas from the current Reading Nook tokens):

A. DEPTH & MATERIAL
- Restore a soft warm-shadow elevation scale (e1 / e2 / e3) as the depth device for LIFT moments:
  the companion presence, the floating navpill, sheets/modals, raised intimate cards. Warm brown
  ink, low opacity (e.g. e1 0 1px 2px rgba(60,40,25,.06); e2 0 4px 14px rgba(60,40,25,.09);
  e3 0 12px 30px rgba(60,40,25,.14)). Never a glow, never cool, never pure-black shadow.
- STOP using hard near-black (#211C16) 1px borders as the universal depth device. Reserve a
  hairline edge for STRUCTURAL surfaces only (list-group dividers, section rules, inputs), and
  warm its tone off near-black to a low-contrast warm divider — give a light AND a dark hairline
  token (e.g. light ~#E6DBCB, dark ~#393129). Never border + shadow on the same element.
- INTIMATE surfaces carry NO hard outline — depth from tonal fill + soft warm shadow.

B. RADIUS — replace the sharp 2–6 scale with a dual system, both as named tokens:
- Structural/editorial: tight (4 / 8).
- Intimate/conversational: soft continuous (12 / 16; cards 16, sheets 20).
- Pill reserved for chips / avatars / small pills only — avoid full-pill-everything.

C. DARK THEME — warm it off near-black.
- Move the dark background from #0C0907 (effectively black; halation + coldness risk) to a true
  warm charcoal (~#1B1712). Re-derive the full dark ladder on the warmer base:
  bg ~#1B1712 → raised ~#25201A → sheet ~#2E2820, with text primary ~#F1E8DC / secondary ~#BFB2A2
  / tertiary ~#8A7E70. Keep the inky, ink-on-page feeling — just not pure black. Maintain AA.

D. ACCENT — replace vermilion (#D8492C). Adopt "Library Wine," a dusky mulberry/garnet:
  light #8F4150, dark #CC7A84.
- Warm, muted, premium; deliberately NOT terracotta/clay (overused) and NOT hot vermilion (too
  bright). Distinct from crisis-green, warning-ochre, and error-red so it never reads as a
  semantic. Keep it a DUSKY wine, never a bright cherry.
- Restraint: accent is the primary CTA fill (with off-white text ~#FFFCF6), active state, and the
  caret — never decoration, never three-at-once, never a screen-wide flood.
- The user chat bubble uses the accent as a slightly muted fill (cozy, not loud); the companion
  bubble stays warm paper.
- ACCENT-CONTRAST RULE: must pass WCAG AA both as a fill (off-white text on it) AND as accent-
  colored text on cream — darken the light tone if any thin accent text fails on paper.
  [Swap alternates if we change our mind — same role: Clay Rose #A85A5A/#D38E8A (darken to
  ~#974F4F for accent-text), or Sunlit Gold #C68A2A/#E0A94E (needs dark text on the fill).]

E. KEEP UNCHANGED
- Newsreader for display/headings. Body & UI = Hanken Grotesk (warmer for long, vulnerable chat).
- Paper-cream light surface family; 8pt spacing rhythm; ONE-accent discipline; the grounding
  crisis/safety GREEN treatment (never alarm-red); WCAG 2.2 AA; render BOTH warm-light and warm-dark.

DELIVER, THEN STOP:
1. The corrected core token set for BOTH warm-light and warm-dark: surfaces (bg → raised → sheet),
   text (primary/secondary/tertiary/disabled), the Library Wine accent, semantics (success /
   warning / error) and crisis-green, the warm hairline-edge tokens, the dual radius scale, the
   8pt spacing scale, and the restored soft-shadow elevation scale (e1/e2/e3).
2. A refreshed small component sample showing the SOFTENED treatment: primary/secondary/tertiary
   buttons; the chat-bubble pair (soft, tonal fill + soft shadow, NO hard outline); the message
   input dock; a warm card; the persona-avatar; and the crisis card. Include ONE side-by-side
   that proves the dual treatment — a structural list-group row (crisp hairline) next to an
   intimate chat bubble (soft, shadowed) — so the "surface's job decides" principle is visible.
Tokens only; no hardcoded values in the components. Then STOP and wait for approval — no screens.
```

---

## Locked result + usage caveats (carried into [`approved-tokens.md`](approved-tokens.md) + [`01-doctrine.md`](01-doctrine.md))

- **Accent = Library Wine** `#8F4150` (light) / `#CC7A84` (dark).
- **Depth** = soft warm shadow (`e1/e2/e3`) for lift; **warm hairline for structural surfaces only**;
  **dual radius** (4/8 structural · 12/16/20 intimate); **warm-charcoal dark** `#1B1712`.
- **AA verified** on the key pairings (primary/secondary text, accent-as-fill and accent-as-text,
  user-bubble text, crisis). Three usage caveats:
  1. **Tertiary text is fine-print/large only** (~3:1 on cream) — never body, a primary label, or a
     **placeholder** (use secondary for placeholders).
  2. **Accent-as-small-text prefers the `bg` surface** (≈5.9/5.7:1); on `raised`/`sheet` in dark it's
     ~4.6:1 — size it up or use sparingly there.
  3. **Don't pair Library Wine and error-red tightly** — both are red-family; keep the wine CTA out of
     immediate adjacency to an error message.
