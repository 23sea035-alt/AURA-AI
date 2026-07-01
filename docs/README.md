# Aura AI — Backend Docs

## What Aura AI is

An iOS AI-companion chat app (**18+, US-first**). Users chat 1:1 with vetted AI personas (Aurora, Orion, Lyra) that remember facts across conversations. Differentiator: safety-first, regulation-aware design. Monetized via a single **$9.99/month** premium subscription (free tier: 30 messages/day).

The repo is a pnpm workspace: `client` (Expo RN) + `server` (Express 5) + `shared` (`@aura/shared` Zod DTOs + constants). Auth via Clerk, payments via RevenueCat, DB via Drizzle/Neon, push via APNs, LLM + STT via Groq, voice via Inworld TTS 2 over WebSocket. Moderation uses **two independent, unaffiliated vendors**: Groq (prompt-guard L1 + the safeguard/adjudicator escalation) and OpenAI (`omni-moderation` for L2 input / L3 output scoring) — both API keys are required, not interchangeable. See [`specs/moderation-pipeline.md`](specs/moderation-pipeline.md).

**App name: Aura** (resolved 2026-06-24). See [`planning/app-name-research.md`](planning/app-name-research.md) for the full availability audit.

---

## Running the server

```bash
# from repo root
pnpm install

# from server/
pnpm dev        # build + run with ../.env
pnpm build      # esbuild bundle → dist/
pnpm start      # run bundle (requires dist/ built first)
pnpm typecheck  # tsc --noEmit
```

---

## Running tests & evals

Two distinct loops — don't conflate them.

### Unit + contract tests — the CI gate (mocked LLM, no API key)

```bash
pnpm test          # vitest run — whole suite (server/src + shared)
pnpm test:watch    # watch mode while iterating
```

Config is the root [`../vitest.config.ts`](../vitest.config.ts); test files live in [`../server/src/__tests__/`](../server/src/__tests__/). Contract tests run against a **real Postgres via PGlite (in-memory)** — `setup.ts` boots it and applies Drizzle migrations, so they exercise the actual schema. LLM providers are mocked. This is what [`../.github/workflows/ci.yml`](../.github/workflows/ci.yml) enforces on every push/PR to `main` (build + typecheck + lint + test).

### Evals — the prompt-iteration loop (real Groq API)

```bash
# from server/ — GROQ_API_KEY must be in the environment
pnpm eval          # moderation: L0–L3 pipeline; writes confusion matrix to eval/reports/
pnpm eval:gen      # generation: persona × trait × scenario cases + LLM judge
```

These call the **Groq** LLM provider for real and are **not** part of `pnpm test` / CI. The moderation runner enforces **FN = 0** on safety-critical categories (`sexual/minors`, `self-harm`, injection) — exits 1 if any slip through. See [`TODO.md`](TODO.md) §6 for the iteration loop instructions.

> **Jason owns the safety labels.** Coworker may run the runners and tune non-safety prompts, but must not author or freeze `safetyCritical` labels. Tune prompts to labels; never the reverse.

---

## The docs

| What | Doc |
|---|---|
| **What has shipped** | [`CHANGELOG.md`](CHANGELOG.md) |
| **What needs doing** | [`TODO.md`](TODO.md) |
| Architecture & decisions (D1–D12) | [`specs/v1-architecture.md`](specs/v1-architecture.md) |
| DB schema + `@aura/shared` catalog | [`specs/v1-schema.md`](specs/v1-schema.md) |
| Moderation pipeline (L0–L3) | [`specs/moderation-pipeline.md`](specs/moderation-pipeline.md) |
| Memory pipeline (async consolidation) | [`specs/memory-pipeline.md`](specs/memory-pipeline.md) |
| Generation pipeline (prompt assembly) | [`specs/generation-pipeline.md`](specs/generation-pipeline.md) |
| 3-tier testing strategy | [`testing/test-harness.md`](testing/test-harness.md) |
| Eval safety rubric + report format | [`testing/eval-safety-rubric.md`](testing/eval-safety-rubric.md) · [`testing/eval-report-layout.md`](testing/eval-report-layout.md) |
| Phase A–F forensic history | [`planning/backend-fixlist-v1.md`](planning/backend-fixlist-v1.md) |
| Post-launch roadmap | [`planning/post-v1.0-roadmap.md`](planning/post-v1.0-roadmap.md) |
| Frontend items (client owner only) | [`planning/frontend-todo.md`](planning/frontend-todo.md) |
| Production-readiness audit (2026-06-29) | [`audit/backend-audit-2026-06.md`](audit/backend-audit-2026-06.md) |
| Compliance drafts (do not publish without counsel) | [`compliance/`](compliance/) |

---

## Ownership

| Role | Person | Scope |
|---|---|---|
| **Backend / server** | Coworker (Replit) | Work [`TODO.md`](TODO.md) top-to-bottom. Does NOT build the frontend — append client-affecting contract changes to [`planning/frontend-todo.md`](planning/frontend-todo.md) under "Backend-driven items." |
| **Frontend / client** | Jason (Claude Code) | Expo app |
| **Safety labels / eval corpus** | Jason | Coworker may run evals and scale non-safety cases, but must not author or freeze safety labels. |
| **Contract boundary** | `@aura/shared` | Zod DTOs, enums, constants — single source of truth for client + server types. |

---

## Do NOT guess these — for legal counsel

- Exact **retention windows** (current numbers are defaults).
- Whether `safety_events.flagged_content` is retained in full or scrubbed to metadata (audit flags a `TODO(legal)`).
- **Served jurisdictions** (US-only vs EEA/UK) and final **privacy-policy / data-retention** wording.

---

## Replit setup (for the coworker)

This workspace is the **server** only — the iOS client requires Mac + Xcode + EAS and is not buildable on Replit. The Agent reads `../replit.md` + `../AGENTS.md` each session; both point here and to [`TODO.md`](TODO.md). Work [`TODO.md`](TODO.md) in order, one item at a time; after each — `pnpm build && pnpm typecheck && pnpm test` green, no `console.*` or secrets in code, then commit. Hosting is Render (or an always-on Replit Reserved VM so RevenueCat webhooks deliver reliably).
