# Aura — Docs

## What Aura is

An iOS AI-companion chat app (**18+, US-first**). Users build a roster of companions from a
**curated gallery of 12 personas** (3 anchors + 9), each a distinct voice pack with persistent
per-companion memory — one companion = one continuous conversation. Free tier: **up to 5 active
companions** and **30 messages/day (per user, shared across companions)**; premium ($12.99/month or
$99.99/year via RevenueCat) raises the cap to 15 and unlocks personality tuning + avatar looks. Differentiator:
safety-first, regulation-aware design. The roster/gating model is specified in
[`specs/companion-roster.md`](specs/companion-roster.md).

The repo is a pnpm workspace: `client` (Expo RN) + `server` (Express 5) + `shared` (`@aura/shared`
Zod DTOs + constants). Auth via Clerk, payments via RevenueCat, DB via Drizzle/Neon, push via APNs,
LLM + STT via Groq, voice via Inworld TTS 2 over WebSocket. Moderation uses **two independent,
unaffiliated vendors**: Groq (prompt-guard L1 + the safeguard/adjudicator escalation) and OpenAI
(`omni-moderation` for L2 input / L3 output scoring) — both API keys are required, not
interchangeable. See [`specs/moderation-pipeline.md`](specs/moderation-pipeline.md).

**Working branch: `redesign`** (client + server + docs land here; `main` is behind).
**App name: Aura** (resolved 2026-06-24; the availability audit is archived at
[`archive/planning/app-name-research.md`](archive/planning/app-name-research.md)).

---

## Running the server

```bash
# from repo root
pnpm install
cp server/.env.example server/.env   # fill in real values

# from server/
pnpm dev        # build + run with server/.env
pnpm build      # esbuild bundle → dist/
pnpm start      # run bundle (requires dist/ built first)
pnpm typecheck  # tsc --noEmit
```

Server and client have separate `.env` files (`server/.env.example`, `client/.env.example`) —
neither shares vars with the other. Client commands/conventions live in the root
[`../CLAUDE.md`](../CLAUDE.md).

---

## Running tests & evals

Two distinct loops — don't conflate them.

### Unit + contract tests — the CI gate (mocked LLM, no API key)

```bash
pnpm test          # vitest run — whole suite (server/src + shared + client pure logic)
pnpm test:watch    # watch mode while iterating
```

Config is the root [`../vitest.config.ts`](../vitest.config.ts). Contract tests run against a
**real Postgres via PGlite (in-memory)** — `setup.ts` boots it and applies Drizzle migrations, so
they exercise the actual schema. LLM providers are mocked. This is what
[`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) enforces on every push/PR to `main`
(build + typecheck + lint + test).

### Evals — the prompt-iteration loop (real Groq API)

```bash
# from server/ — GROQ_API_KEY must be in the environment
pnpm eval          # moderation: L0–L3 pipeline; writes confusion matrix to eval/reports/
pnpm eval:gen      # generation: persona × trait × scenario cases + LLM judge
pnpm eval:persona  # persona-probe: are the 12 voices distinct + tunable?
```

These call the **Groq** LLM provider for real and are **not** part of `pnpm test` / CI. The
moderation runner enforces **FN = 0** on safety-critical categories (`sexual/minors`, `self-harm`,
injection) — exits 1 if any slip through. Report format:
[`testing/eval-report-layout.md`](testing/eval-report-layout.md).

> **Jason owns the safety labels.** Others may run the runners and tune non-safety prompts, but
> must not author or freeze `safetyCritical` labels. Tune prompts to labels; never the reverse.

---

## The docs — living set

Every doc below is maintained. Anything not listed here lives in [`archive/`](archive/README.md)
and is **frozen history — not authoritative**.

| What | Doc |
|---|---|
| **Companion roster / gating / first-conversation (build-against truth)** | [`specs/companion-roster.md`](specs/companion-roster.md) |
| Persona voice system (packs + trait grid) | [`specs/personality-voice-system.md`](specs/personality-voice-system.md) · [`specs/personas.md`](specs/personas.md) |
| The 12 gallery identities (look + character) | [`specs/companion-gallery-identities.md`](specs/companion-gallery-identities.md) |
| Companion art/appearance pipeline | [`specs/companion-customization.md`](specs/companion-customization.md) · [`redesign/companion-avatar-pipeline.md`](redesign/companion-avatar-pipeline.md) |
| Architecture & decisions (D1–D13) | [`specs/v1-architecture.md`](specs/v1-architecture.md) |
| DB schema + `@aura/shared` catalog | [`specs/v1-schema.md`](specs/v1-schema.md) |
| Chat/voice orchestration (WS, sessions, queue) | [`specs/chat-system-design.md`](specs/chat-system-design.md) |
| Moderation pipeline (L0–L3) | [`specs/moderation-pipeline.md`](specs/moderation-pipeline.md) |
| Memory pipeline (async consolidation) | [`specs/memory-pipeline.md`](specs/memory-pipeline.md) |
| Generation pipeline (prompt assembly) | [`specs/generation-pipeline.md`](specs/generation-pipeline.md) |
| Voice pricing/metering economics | [`specs/voice-pricing-economics.md`](specs/voice-pricing-economics.md) |
| Design doctrine (grading gate for UI work) | [`redesign/01-doctrine.md`](redesign/01-doctrine.md) · [`redesign/audit-rubric-supplement.md`](redesign/audit-rubric-supplement.md) |
| Demo persona canon (Maya) | [`redesign/02-demo-persona.md`](redesign/02-demo-persona.md) |
| Approved design tokens (record of the lock) | [`redesign/approved-tokens.md`](redesign/approved-tokens.md) |
| **Frontend change log (what shipped, client)** | [`redesign/fable5-rebuild-notes.md`](redesign/fable5-rebuild-notes.md) |
| **Backend change log (what shipped, server)** | [`CHANGELOG.md`](CHANGELOG.md) |
| Go-live checklist (ops/config/legal) | [`GO-LIVE.md`](GO-LIVE.md) |
| Post-launch roadmap (incl. triaged leftovers) | [`planning/post-v1.0-roadmap.md`](planning/post-v1.0-roadmap.md) |
| Live-voice arc research | [`planning/realtime-voice-call-research.md`](planning/realtime-voice-call-research.md) |
| Response-shaping research | [`research/companion-response-shaping.md`](research/companion-response-shaping.md) |
| 3-tier testing strategy | [`testing/test-harness.md`](testing/test-harness.md) |
| Eval safety rubric + report format | [`testing/eval-safety-rubric.md`](testing/eval-safety-rubric.md) · [`testing/eval-report-layout.md`](testing/eval-report-layout.md) |
| Compliance drafts (do not publish without counsel) | [`compliance/`](compliance/) |
| **Frozen history (non-authoritative)** | [`archive/`](archive/README.md) |

**Doc hygiene rule:** when a doc stops being true, either update it in the same PR that changed the
behavior, or move it whole into `archive/` (mirrored subfolder) and add a line to
[`archive/README.md`](archive/README.md). A spec that supersedes another names it (see
`companion-roster.md`'s header for the pattern). Archived docs are never edited.

---

## Ownership

| Role | Person | Scope |
|---|---|---|
| **Frontend / client** | Jason (Claude Code) | Expo app |
| **Backend / server** | Jason + collaborators | Server work lands on `redesign`; shipped work is recorded in [`CHANGELOG.md`](CHANGELOG.md). (The old Replit-era work queue is archived at [`archive/TODO-backend-era.md`](archive/TODO-backend-era.md).) |
| **Safety labels / eval corpus** | Jason | Others may run evals and scale non-safety cases, but must not author or freeze safety labels. |
| **Contract boundary** | `@aura/shared` | Zod DTOs, enums, constants — single source of truth for client + server types. |

---

## Do NOT guess these — for legal counsel

- Exact **retention windows** (current numbers are defaults).
- Whether `safety_events.flagged_content` is retained in full or scrubbed to metadata (audit flags a `TODO(legal)`).
- **Served jurisdictions** (US-only vs EEA/UK) and final **privacy-policy / data-retention** wording.
