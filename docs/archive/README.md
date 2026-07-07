# docs/archive — frozen history

> ⚠️ **Nothing in this folder is authoritative.** These docs are point-in-time records kept for
> history; they describe **old versions of the product and process** and are never updated. If a
> claim here conflicts with the app, the app and the living docs win. The living docs are indexed
> in [../README.md](../README.md).

Archive convention: a doc moves here (mirroring its original subfolder) when the work it tracked
is done or the model it describes is superseded — it is moved whole, not edited. Relative links
inside archived docs may be stale.

## What's here and why (archived 2026-07-07 unless noted)

**Backend build era (work executed; the code + CHANGELOG are the record):**
- `TODO-backend-era.md` — the backend work queue (was `docs/TODO.md`; canonical branch was still
  `backend`).
- `planning/v1-tasklist.md`, `planning/backend-fixlist-v1.md` — the phased backend build plan +
  fixlist. Still-open leftovers were triaged into
  [../planning/post-v1.0-roadmap.md](../planning/post-v1.0-roadmap.md).
- `planning/frontend-todo.md` — the pre-rebuild client to-do; every item either shipped or
  describes the retired model (premium-gated creation, lock-not-delete downgrade).
- `planning/app-name-research.md` — name availability audit; resolved 2026-06-24 (**Aura**).
- `audit/backend-audit-2026-06.md` — point-in-time backend audit; findings fixed.
- `testing/testing-readiness-v1.md` — the backend v1 go/no-go gate; passed.
- `README.pre-audit-2026-06.md` — the original "plan of record" README (pre-audit snapshot).

**Claude-Design prototype era (the web-prototyping pipeline the redesign was born in; the RN app
is now the source of truth):**
- `redesign/00-foundation.md`, `00b-tokens-revision.md`, `06-layout-motion-research.md` —
  direction/tokens research that produced [../redesign/01-doctrine.md](../redesign/01-doctrine.md)
  and `client/constants/design.ts`.
- `redesign/03/04/05-*-scaffold.md` + `redesign/screens/` — the frozen per-screen design-prompt
  decks. **They encode the pre-roster model** (3-persona picker, "3 base companions", locked
  customs); the companion screens are superseded by
  [../specs/companion-roster.md](../specs/companion-roster.md).
- `redesign/claude-design/` + `redesign/harness/` — the web prototypes and their Playwright
  capture harness.

**RN port era (superseded wholesale by the Fable 5 rebuild —
[../redesign/fable5-rebuild-notes.md](../redesign/fable5-rebuild-notes.md)):**
- `redesign/rn-port-status.md`, `rn-port-remediation-plan.md`, `rn-port-fidelity-audit.md`.
- `redesign/fable5-rebuild-prompt.md` — the executed rebuild brief.

**Companion art batches (consolidated into
[../redesign/companion-avatar-pipeline.md](../redesign/companion-avatar-pipeline.md)):**
- `redesign/companion-avatar-batch-1.md` (pilot), `companion-avatar-batch-2-handoff.md`
  (the 9 canonical character prompts), `companion-avatar-batch-3-handoff.md` (style-lock
  iteration pass). The per-character prompts remain canonical here; the living doc carries the
  durable rules + current status.
