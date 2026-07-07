# Aura — Redesign docs (Warm Sanctuary)

This folder holds the **living design docs** for the Warm Sanctuary redesign. The design-session
prompt library, web prototypes, capture harness, and RN-port tracking docs that used to live here
are **frozen history** in [`../archive/redesign/`](../archive/README.md) — the app itself (plus the
docs below) is now the source of truth.

## Living docs

| Doc | Job |
|---|---|
| [`01-doctrine.md`](01-doctrine.md) | The design doctrine — what "Warm Sanctuary" means in practice; §13 is the grading gate every screen must pass (used by the `/audit-screen` skill). |
| [`audit-rubric-supplement.md`](audit-rubric-supplement.md) | S1–S6 supplemental rubric dimensions for screen audits. |
| [`02-demo-persona.md`](02-demo-persona.md) | Demo canon (Maya, Aurora's thread, the 18/30 story) — every screen tells this one story on demo data. |
| [`approved-tokens.md`](approved-tokens.md) | Record of the locked palette/type decision. **Implementation truth is `client/constants/design.ts`** (+ `motion.ts`). |
| [`companion-avatar-pipeline.md`](companion-avatar-pipeline.md) | Portrait art pipeline: hard rules, style lock, grading rubric, current batch status. |
| [`fable5-rebuild-notes.md`](fable5-rebuild-notes.md) | **The frontend change log.** Running record of what shipped on the client, per session — newest entry at the bottom. |

## Locked decisions (unchanged)

- **Direction:** "Warm Sanctuary" — warm, calm, human, trustworthy (deliberately off the cold
  cosmic/neon default).
- **Palette + type:** Option A "Reading Nook" — Newsreader (display) × Hanken Grotesk (body),
  terracotta/wine accent on warm paper; warm-light + warm-dark. Tokens: `client/constants/design.ts`.
- **Logo / app icon:** the abstract two-form mark (wine sheltering terracotta, gouache on cream) —
  source + variants in `client/assets/logo/`; colors are `LOGO_COLORS` in `design.ts`.

## How design changes happen now

Design work happens **directly in the RN app** and is verified on the simulator (`/verify-ui`,
`/audit-screen` skills). New behavior specs live in [`../specs/`](../specs/) (e.g.
`companion-roster.md`); this folder only carries the doctrine, canon, tokens record, art pipeline,
and the change log.
