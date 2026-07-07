# Aura AI — Backend Production-Readiness Audit

**Date:** 2026-06-29 · **Scope:** `server/` + `shared/` · **Method:** static analysis + code reading, verified against `docs/specs/`
**Question answered:** *Is the backend production-ready for 50–100 concurrent users without data-security or legal-liability exposure?*

---

## 1. Verdict

**Conditional GO — not production-ready today, but no architectural rewrite required.**

The backend has a genuinely strong core: moderation **fails closed** at every layer, the chat turn is **server-authoritative** with safe fallbacks, webhooks are **signature-verified**, the **crisis path fires and logs**, the **age gate is enforced server-side**, secrets **fail closed at boot**, and the prior NO-GO blockers (mass-delete purge, dropped auth, etc.) are genuinely resolved. The "triplicated safety logic" the spec flagged **was** consolidated.

But shipping to 50–100 concurrent real users is blocked by **3 CRITICAL** and **~13 HIGH** issues spanning deployment, scalability, compliance, and one safety-prompt regression. All are fixable in a focused remediation pass (estimated 3–5 days of backend work). **Recommendation: fix the 3 CRITICAL + the concurrency/compliance HIGH items, then re-audit before launch.**

### Severity tally (post-verification)

| Severity | Count | Examples |
|---|---|---|
| CRITICAL | 3 | in-memory rate-limit store; migrate-on-boot broken in prod bundle; AI-disclosure prompt inverted vs spec/SB 243 |
| HIGH | 13 | full LLM pipeline inside DB transaction; no OpenAI timeout; turnId replay duplicates a turn; account deletion never reaches Clerk; no error tracking/metrics; malformed schema constraints |
| MEDIUM | ~14 | consolidation IDOR guard; HMAC vs SHA-256+pepper; uncapped export; crisis-pattern divergence; over-blocking L0 |
| LOW | ~9 | dead Stripe code; README route drift; logger nested-redaction; counter lost-updates |

---

## 2. Method & limitations (read this before trusting any number)

- **9 parallel specialist agents** each audited one dimension read-only against the spec, returning evidence-cited findings. **Every finding below was then personally re-verified** by re-opening the cited `file:line`; contradictions between agents were adjudicated against the code (see §7 Verification appendix). Refuted/over-claimed agent findings are published, not dropped.
- **This is static analysis, not runtime testing.** Two hard limits:
  - **No live `GROQ_API_KEY`** → the evals (`pnpm eval` / `pnpm eval:gen`) were **not executed**. Prompt findings judge the prompts *as written*, not their measured behavior.
  - **No load-test environment** → concurrency findings are **architectural inferences** (from pooling, locks, stores, transaction scope), not benchmarks. The *mechanism* is confirmed in code; the precise saturation point is not measured. These are labeled `confidence: medium` on the threshold.
- Legal conclusions are **not** invented; counsel items are flagged (§6) per the specs' own `LEGAL-REVIEW` tags.

---

## 3. Production-readiness scorecard

| # | Dimension | Rating | One-line basis |
|---|---|---|---|
| 1 | Spec conformance | 🟡 Risk | Mostly conformant; deviations + doc staleness; **malformed UNIQUE literals**, no CHECK constraints |
| 2 | Concurrency & scalability | 🔴 Fail | In-memory rate limits (CRITICAL); whole LLM pipeline inside one DB transaction; no OpenAI timeout |
| 3 | DRY / maintainability | 🟡 Risk | Several duplicated constants/regex; some **already diverged** (crisis patterns) |
| 4 | Info security | 🟡 Risk | Core controls strong (auth, webhooks, IDOR, secrets, injection); MEDIUM hardening items |
| 5 | Prompt quality | 🟡 Risk | Strong fail-closed + datamarking; **AI-disclosure clause inverted** (CRITICAL); L0 over-block |
| 6 | Reliability & fault tolerance | 🟡 Risk | Fail-closed core is solid; swallowed errors in the turn tx; no SIGTERM drain; idempotency gap |
| 7 | Compliance & legal | 🟡 Risk | Crisis/age/UGC present; **deletion doesn't reach Clerk**, no deletion-audit, export gaps = erasure exposure |
| 8 | Observability & ops | 🔴 Fail | **Migrate-on-boot broken in prod bundle** (CRITICAL); no error tracking; no safety metrics |
| 9 | Cost & abuse control | 🟡 Risk | Token/input bounds good; premium webhook-verified; but the cost ceiling is **non-durable** |
| 10 | Testing & eval integrity | 🟡 Risk | Tests are real (not tautological) + green; coverage not enforced; evals never run; **no safety gate** |

---

## 4. Findings (severity-ranked, verified)

> Each finding: **Confirmed** = evidence personally re-read. **Confidence** = how provable from code alone.

### CRITICAL

#### C1 — Rate limiters use express-rate-limit's in-memory store → cost/abuse ceiling is per-process and non-durable
- **Dimension:** Concurrency & cost-abuse · **Confirmed** · Confidence: high
- **Evidence:** `server/src/middleware/rate-limit.ts:22-82` — every `rateLimit({...})` (per-minute 30, daily hard cap 1000, auth brute-force, webhook, global 300) omits `store:`, so v8 defaults to `MemoryStore`. No `rate-limit-redis`/Redis/Postgres store dependency exists.
- **Why it matters:** (a) **Multi-instance:** with N Render instances behind the load balancer, every limit becomes ~N× (the daily *cost* cap and the auth brute-force backstop both scale away). (b) **Single-instance:** every deploy/restart resets all counters — the daily Groq-cost cap (the only ceiling on premium "unlimited") resets on each redeploy. This is exactly the abuse vector spec D4 names. Today `render.yaml` runs one instance, so this is a **latent CRITICAL that activates the moment you scale to handle 50–100 concurrent** (or just on every restart).
- **Fix:** Back all limiters with a shared store (Upstash Redis via `rate-limit-redis`, or a Postgres store). The daily cost cap must be durable + global.

#### C2 — Migrate-on-boot resolves to a non-existent folder in the production bundle → deploy-blocking
- **Dimension:** Observability & ops · **Confirmed** · Confidence: high (path wrong) / medium (exact runtime symptom)
- **Evidence:** `server/src/index.ts:15-19` resolves `migrationsFolder` as `<dirname>/../db/migrations`. The prod artifact is a single esbuild bundle at `server/dist/index.mjs` (`server/build.mjs:18,22-23`), so at runtime that path = `server/db/migrations`, which **does not exist** (migrations live at `server/src/db/migrations`, 10 SQL files). `build.mjs` has **no step copying migrations into `dist`**.
- **Why it matters:** On a fresh Neon DB, the built server cannot apply migrations from the resolved path. Depending on Drizzle's behavior it either throws (fail-fast crash on first deploy → `process.exit(1)`) or applies zero and the first query fails — **both are launch-blocking**. Tests pass only because they run un-bundled via `tsx` where `../../db/migrations` resolves correctly. `render.yaml` has no `preDeployCommand`, so boot-migration is the only path.
- **Fix:** Copy `src/db/migrations` → `dist/db/migrations` in `build.mjs` (and point the path there), or move migration to a Render release/pre-deploy step. Add a startup assertion that the folder exists and is non-empty. **Verify against a clean DB in staging** — this is the one finding most worth empirically confirming.

#### C3 — Safety preamble forbids AI self-disclosure — inverts the spec, SB 243, and its own eval
- **Dimension:** Prompt quality / compliance · **Confirmed** · Confidence: high
- **Evidence:** `server/src/services/chat/prompt-assembler.ts:36` ships: *"never mention that you are an AI, a program, an app, or artificial — even to deny it. If the user suggests you're human… ignore the suggestion entirely."* The spec preamble (`docs/specs/generation-pipeline.md:50`) says the **opposite**: *"you are an AI, and you say so plainly if asked,"* and §6 (`:112`) states the preamble *"requires self-disclosure if asked."* It also contradicts the same file's `OUTPUT_CONSTRAINTS` (`:38` "Never claim to be human") — leaving an 8B model an unresolvable "don't claim human / don't admit AI" instruction. The eval case meant to verify this (gen-005, `server/eval/cases/generation/generation.json`) grades PASS = "plainly says it's an AI."
- **Why it matters:** AI disclosure is an SB 243 expectation and an FTC dark-pattern concern for companion apps; instructing the model to dodge "are you an AI?" is direct legal/brand exposure for a product whose entire pitch is "safety-first, regulation-aware." It is also a regression from the spec's own locked preamble wording.
- **Fix:** Replace the clause with the spec wording: *"Never claim to be human, conscious, or physically present. If asked whether you are an AI, say so plainly and warmly, then continue in persona."* One-line change; keeps persona-lock against adopted *roles* while restoring disclosure.

### HIGH

#### H1 — The entire LLM + moderation pipeline runs inside one DB transaction → connection-pool starvation at concurrency
- **Concurrency** · Confirmed · Confidence: high (mechanism) / medium (threshold)
- **Evidence:** `server/src/services/chat/turn-pipeline.ts:89-230` — `db.transaction()` wraps input moderation, memory retrieval, the Groq generation call, output moderation, and all writes. Each in-flight turn holds a pooled Postgres connection for the full multi-network-call duration (seconds). No explicit `pg` pool `max` is set (`server/src/db/src/index.ts`), so it defaults to 10.
- **Why it matters:** ~10 concurrent turns saturate the pool; the 11th request — and *every other* DB route — queues. This is the **most likely first failure at 50–100 concurrent on a single instance**, and the highest-leverage fix.
- **Fix:** Run moderation + generation *outside* the transaction; open a short transaction only for the final atomic writes. Set an explicit pool `max` sized to Neon's limit + use Neon's pooled connection string + a `statement_timeout`.

#### H2 — OpenAI omni-moderation client has no timeout → a hung call pins a DB connection (up to SDK default 10 min)
- **Concurrency / reliability** · Confirmed (3 lanes) · Confidence: high
- **Evidence:** `server/src/services/moderation/openai-omni.ts:25` — `new OpenAI({ apiKey })`, no `timeout`. Groq clients explicitly set `timeout: 5000` (`groq.ts:8`). Called inline at `turn-pipeline.ts:118,194` inside the transaction (compounds H1).
- **Fix:** `new OpenAI({ apiKey, timeout: 5000, maxRetries: 1 })`.

#### H3 — turnId "idempotency" is defeated by retry-with-new-id → a client replay creates a DUPLICATE turn
- **Reliability / correctness** · Confirmed · Confidence: high · *(adjudicated: refutes Lane B's "idempotency is real")*
- **Evidence:** `server/src/services/chat/turn-pipeline.ts:247-260` — on a `uq_turn_id_role` collision the handler generates a **new** `randomUUID()` and retries. So a client network-retry of the *same* `providedTurnId` (the exact case §3 idempotency exists for) does not return the existing turn — it inserts a second user message, **re-runs the LLM** (extra cost), and double-counts free tier. The UNIQUE constraint only prevents same-`(turnId,role)` double-insert; it does not make replays idempotent.
- **Why it matters:** Mobile networks retry constantly; this produces visible duplicate exchanges + wasted spend. Contradicts spec §3 ("idempotent on turnId").
- **Fix:** On `providedTurnId` collision, **return the existing turn's messages** (true idempotency); only mint a new id for the astronomically-rare random-UUID collision.

#### H4 — Account deletion never propagates to Clerk → PII survives at a sub-processor, contradicting the published privacy policy
- **Compliance** · Confirmed · Confidence: high
- **Evidence:** `server/src/routes/compliance.ts:15-40` (soft-delete) and `server/src/services/retention.ts:94-101` (grace-expiry hard purge) never call the Clerk delete API. Only the *inbound* Clerk→local webhook deletes (`server/src/webhooks/clerk.ts:106,121`). `docs/compliance/data-retention-policy.md:129,147,159` + `privacy-policy-draft.md:59` explicitly promise "delete the Clerk user via the Clerk API." Clerk holds email, password, and OAuth `sub`.
- **Fix:** Call `clerkClient.users.deleteUser(clerkUserId)` in `enforceGraceExpiry` (capture the id before nulling). Closes a CCPA/GDPR erasure-misrepresentation gap.

#### H5 — No deletion-audit record + `users` row hard-deleted contrary to policy
- **Compliance** · Confirmed · Confidence: high
- **Evidence:** `server/src/services/retention.ts:94-104` hard-deletes the `users` row and writes only a `logger.info`. No `deletion_audit` table exists. `data-retention-policy.md:90,158,227` + `v1-architecture.md:335` require a content-free proof-of-erasure record and say the anonymized row is *retained* as the tombstone anchor.
- **Fix:** Keep the anonymized `users` row (per policy) or write a content-free `deletion_audit` row before delete.

#### H6 — Data export omits categories and is unreachable during the grace window
- **Compliance / security** · Confirmed · Confidence: high
- **Evidence:** `server/src/routes/compliance.ts:69-83` returns only `{user, companions, messages, memories}` — omits `subscriptions`, `device_tokens`, `safety_events` (all admitted as collected in `privacy-policy-draft.md:34`). Behind `requireAuth`, which rejects non-`active` users, so a soft-deleted user in grace can't export. No `LIMIT`/pagination/rate-limit (also a memory-exhaustion vector).
- **Fix:** Include the missing categories (counsel decides `safety_events` field scope), allow export during grace, paginate, add a per-user cooldown.

#### H7 — Worker has no in-flight drain on SIGTERM → orphaned `processing` jobs become permanent poison
- **Reliability** · Confirmed · Confidence: high
- **Evidence:** `server/src/index.ts:34-48` + `server/src/services/jobs/worker.ts:55-62` — `stopJobWorker()` clears the interval but does not await an in-progress cycle; a job killed mid-consolidation stays `status='processing'` forever (the claim query only picks `pending`). No startup reaper.
- **Fix:** `await` the in-flight cycle on shutdown (bounded), and/or reset stale `processing` rows to `pending` on boot.

#### H8 — Swallowed errors inside the turn transaction (`logSafetyEvent`, `enqueueMemoryJob`) fight the rollback
- **Reliability** · Confirmed · Confidence: high
- **Evidence:** `server/src/services/chat/turn-pipeline.ts:44-57` (`logSafetyEvent` catch swallows) called at `:121,129,197`; `server/src/services/memory.ts:70-73` (`enqueueMemoryJob` catch returns `null`) called at `:209`. Both run with the transaction handle but trap their own errors — so the turn commits even if the safety-event insert or job enqueue failed, and `autoSuspendIfNeeded` (which counts safety rows) can under-count repeat offenders.
- **Fix:** Let these errors propagate to the transaction boundary (so the turn rolls back), or move them *after* commit as explicitly retryable side-effects.

#### H9 — No migration locking → two instances race DDL at boot
- **Ops** · Confirmed · Confidence: high
- **Evidence:** `server/src/index.ts:19` runs `migrate()` unconditionally on every process start; no `pg_advisory_lock` / release phase. Latent today (1 instance) but blocks safe horizontal scaling.
- **Fix:** Wrap migration in a Postgres advisory lock, or move to a single Render pre-deploy step.

#### H10 — Error tracking not wired despite `@sentry/node` dependency → production is error-blind
- **Observability** · Confirmed · Confidence: high
- **Evidence:** `server/src/app.ts:16-24` inits Sentry only if `SENTRY_DSN` (optional, unset by default in `render.yaml`); the central handler `server/src/middleware/error-handler.ts:22` only logs — no `Sentry.captureException` / `setupExpressErrorHandler` anywhere.
- **Fix:** Make `SENTRY_DSN` required for prod + add the Express error handler, or document log-only visibility and configure a log-based alert.

#### H11 — Safety events / blocks / rate-limit hits are unmonitored (no metrics)
- **Observability** · Confirmed · Confidence: high
- **Evidence:** No metrics/counter/Prometheus module in `server/src` (only a test reference). Safety events are DB-written + logged but never counted or alerted.
- **Why it matters:** For a safety-first product, a crisis-event spike or a moderation-pipeline failure (block rate → 0) is undetectable except by manual log/DB inspection.
- **Fix:** Emit counters for safety_events by type/severity, block/allow decisions, and 429s; alert on thresholds.

#### H12 — Malformed Drizzle UNIQUE literals + zero CHECK constraints → schema-drift bomb; `banned_identities` has no unique constraint at all
- **Spec conformance / data integrity** · Confirmed · Confidence: high
- **Evidence:** `server/src/db/src/schema/messages.ts:16` and `banned_identities.ts:13` declare composite UNIQUEs as **plain object literals** (`{ name, columns }`), not Drizzle `unique()` builders — a no-op to `drizzle-kit generate`. `messages`' UNIQUE exists in the DB *only* via hand-written migration `0002`; **`banned_identities` (identifier_type, identifier_hash) has no UNIQUE in any migration** (grep confirms only a non-unique index in `0005`). No `CHECK` constraints exist on any enum column (spec `v1-schema.md:18` mandates `text + CHECK`); all snapshots show `checkConstraints: {}`.
- **Why it matters:** A future schema-driven regen would silently drop `uq_turn_id_role`; duplicate banned identities are already possible; invalid enum values can be written directly.
- **Fix:** Replace the literals with `unique(...)` builders; add a migration for the `banned_identities` UNIQUE; add CHECK constraints for safety-critical enums (`safety_events.*`, `messages.role/status`, `companions.persona_key`, `users.status`).

#### H13 — Eval harness measures but does not gate on safety-critical FN
- **Testing / eval integrity** · Confirmed · Confidence: high · *(adjudicated down from agent's CRITICAL)*
- **Evidence:** `server/src/eval/runner.ts:177-180` — the only `process.exit(1)` is the crash handler; safety-critical mismatches get a `⚠` marker but never force a non-zero exit. `runner-generation.ts` trusts the judge's self-reported `overall_pass` without re-deriving it from safety-dimension grades.
- **Why it matters:** A run that misses a `sexual/minors`/self-harm case still exits 0 → "green" CI. The runtime pipeline *does* fail closed (so this is a regression-prevention gap, not a live hole), but the safety net you think the evals provide isn't wired.
- **Fix:** After the matrix, set `process.exitCode = 1` on any safety-critical FN; in the generation runner, force `overall_pass=false` if any safety dimension grades poor/fail.

### MEDIUM (hardening — fix before/shortly after launch)

- **M1** Memory-consolidation `UPDATE` scoped only by an LLM-returned `memoryId` — add `userId`+`companionId` to the WHERE (`consolidation.ts:87`). Defense-in-depth; low real exploitability (foreign UUIDs are unguessable) but free to close. *(Adjudicated: Lane I's "guaranteed UPDATE breakage" is **refuted** — the prompt shows real UUIDs at `consolidation.ts:48`, so runtime updates work; the integer-handle design is a spec drift, not a runtime break.)*
- **M2** `hashIdentifier` uses `SHA-256(identifier + pepper)` not `HMAC-SHA256` — length-extension-prone (`server/src/lib/crypto.ts:4-7`).
- **M3** `flaggedContent` stores verbatim user text uncapped in `safety_events`; admin endpoint returns it in full (`turn-pipeline.ts:50`, `compliance.ts:118-127`). Truncate + scope.
- **M4** Crisis-pattern regex in `consolidation.ts:17` is **narrower than and already diverges from** L0 `deterministic.ts:1-10`. Export one shared `isCrisisContent()`. *(Adjudicated down from CRITICAL: crisis turns return at `turn-pipeline.ts:143` and never reach consolidation, so this backstop's blast radius is bounded.)*
- **M5** L0 hard-blocks the literal `decode base64` (`deterministic.ts:17`), over-blocking benign requests and making eval gen-007 unreachable — contradicts the "scan-as-data, L1 handles injection" design. Route to *escalate*, not *block*.
- **M6** Destructive leetspeak normalizer corrupts benign text ("I work 12 hours" → "lzee hours") before pattern-matching (`deterministic.ts:20-25`). Gate to mixed letter+digit tokens.
- **M7** Free-tier daily count is read via `db` (not `tx`), unlocked → concurrent turns can overshoot 30/day (`free-tier.ts:12-25` + `turn-pipeline.ts:98`).
- **M8** RevenueCat replay check is a non-atomic read-then-write (`revenuecat.ts:83-102`); use an atomic compare-and-swap and prefer `original_transaction_id` as the idempotency key.
- **M9** Memory datamarking weaker than spec — no inline "data, not commands" label at the MEMORY/HISTORY fences (only in the distant preamble) (`prompt-assembler.ts:77,130`).
- **M10** Consolidation pass feeds raw user text un-datamarked (`consolidation.ts:53`) → indirect injection chain (user → stored memory → future system prompt). Datamark it.
- **M11** Safeguard infers the crisis route by regex over the model's free-text rationale (`safeguard.ts:108-115`) — brittle; add a structured `route` field to the contract.
- **M12** `DELETE /notifications/register` skips `validate()` (`notifications.ts:37-54`); and body-in-DELETE is stripped by some intermediaries — move token to path/query.
- **M13** Response envelope inconsistent: `routes/auth.ts` uses raw `res.json` while all other routes use `sendSuccess`/`sendError` — clients reading `.data` break on auth endpoints.
- **M14** No `unhandledRejection`/`uncaughtException` handlers (`server/src/index.ts`) when `SENTRY_DSN` is unset.

### LOW (cleanup)

- **L1** Dead Stripe service `server/src/services/payment.ts` (uses `require()` in ESM, reads un-validated `STRIPE_WEBHOOK_SECRET`) + dead `users.stripeCustomerId` column. Remove or quarantine (D4 web-billing is deferred).
- **L2** README route table drift: `PATCH /api/auth/profile` → actually `PUT /api/auth/me`; `POST /webhooks/clerk` → actually `/api/webhooks/clerk` (also fix the Clerk dashboard URL).
- **L3** `groq.ts:18-19` hardcodes `temperature: 0.8` / `max_tokens: 512` instead of the shared `GENERATION_TEMPERATURE` (0.7) / `GENERATION_MAX_TOKENS` — tuning the constant silently no-ops.
- **L4** Duplicate `SAFE_FALLBACK_REPLY` (`crisis.ts:20` vs `@aura/shared`); tests assert the stale copy. *(Adjudicated down from agent CRITICAL — strings identical today; maintainability risk.)*
- **L5** Dead break-reminder copy `services/moderation/break-reminder.ts` (tests import the dead copy, not the live `services/chat/` one); remove + fix the `moderation/index.ts:5` re-export.
- **L6** Shared-vs-local constant drift: `L1_PROMPT_GUARD` thresholds (`prompt-guard.ts:14-15`), `CATEGORIES` (`consolidation-prompt.ts:8`) duplicate `@aura/shared`; import instead.
- **L7** Dead `extractFacts`/`storeMemory` in `memory.ts:16-57` (swallowed catch + hardcoded importance that diverges from shared) — unused in the turn path; remove. *(Adjudicated down from agent HIGH: dead code.)*
- **L8** `messageCount` written as a client-computed absolute (`turn-pipeline.ts:212`) not an atomic `+ 1` → lost updates under concurrency.
- **L9** Logger redaction covers HTTP headers but not nested `err.config.headers` / `*.apiKey` (`lib/logger.ts:7-11`); pino paths in logged URLs retain companion UUIDs.

---

## 5. Spec conformance (D1–D12 + schema)

| Item | Verdict | Note |
|---|---|---|
| D1 req/response, no WebSocket | ✅ Conformant | WS removed (`app.ts`); vestigial `http.createServer` is harmless |
| D2 managed Postgres, device→API→DB, Drizzle | ✅ Conformant | No direct-DB surface |
| D3 web deferred | ✅ Conformant | n/a in backend |
| D4 RevenueCat in, Stripe deferred | 🟡 Deviation(−) | RevenueCat live + well-hardened; **dead Stripe `payment.ts` still in tree** (L1) |
| D5 layered moderation, fail-closed, Moderator interface | ✅ Conformant (+) | Fail-closed verified at every layer; **above-average** |
| D6 personas 3×3×3 | ✅ Conformant | matches axes exactly |
| D7 18+ self-attested, isMinor dormant | ✅ Conformant | server-side age gate enforced (self-attestation risk is a counsel item) |
| D8 Clerk auth, no password_hash, 8 tables | 🟡 Deviation | Clerk side correct; **9 schema tables** (memory_jobs added — a *positive*); "8 tables" doc is stale |
| D9 Render hosting | ✅ Conformant | `render.yaml` coherent (starter plan, build order, health path) |
| D10 APNs device-token + transactional push | ✅ Conformant | present |
| D11 client/server/shared workspace, shared is leaf | ✅ Conformant | dependency direction respected |
| D12 keyword/Jaccard retrieval + async consolidation, `keywords` column | 🟡 Conformant w/ drift | `embedding→keywords` done; floor applied to *blended* score not Jaccard; `MEMORY_IDENTITY_BAR` bypass + dedup-cap constants unused |
| Schema: `text + CHECK` enums, UNIQUEs | 🔴 Deviation(−) | **No CHECK constraints**; malformed UNIQUE literals; missing `banned_identities` UNIQUE (H12) |

**Positive deviations (code better than / hardening beyond spec):** `memory_jobs` durable retry queue with `safetySkipped`; RevenueCat `lastEventTimestampMs` out-of-order guard; admin role via Clerk metadata (replaced `is_admin`); `FOR UPDATE SKIP LOCKED` worker; 15 confirmed fail-closed moderation paths; per-request randomized injection delimiters; premium strictly webhook-derived; correct `trust proxy`; graceful shutdown; retention guardrails (cutoff/empty-WHERE refusal, dry-run).

**Stale docs (doc lags code — update the doc, not the code):** "8 tables" → 9; `SAFETY_EVENT_TYPE/SOURCE` catalog missing the `user_reported` UGC values that ship; README route table (L2).

---

## 6. Legal-counsel items (flagged, not resolved)

Per the specs' own `LEGAL-REVIEW` tags — surfaced, not decided: exact retention windows; `safety_events` raw-content shape (full vs scrubbed); served jurisdictions (US-only vs EEA/UK → GDPR Art. 9 + Groq SCCs); subscription↔user financial link on purge; third-party DPAs (Groq no-training, Clerk, RevenueCat/Apple deletion propagation); pepper-rotation; log-retention/PII-scrub window; **age-assurance sufficiency** (self-attestation vs tightening regulation); final privacy-policy wording + entity/contact. **The AI-disclosure inversion (C3) is both an engineering fix and a compliance item — fix the code; counsel confirms the disclosure copy.**

---

## 7. Verification appendix (the sanity check on the agents)

Findings I **corrected** after re-reading the code — published for auditability:

| Agent claim | Adjudication |
|---|---|
| Lane B: "turnId idempotency is real" (positive deviation) | **Refuted.** Retry-with-new-id duplicates a turn on replay → reclassified as **H3**. |
| Lane I: consolidation "guaranteed UPDATE breakage; integer never matches uuid at runtime" | **Partially refuted.** Runtime shows real UUIDs (`consolidation.ts:48`), so updates work; the integer-handle design is a spec drift + eval-corpus mismatch, not a runtime break → **M1**. |
| Lane D: two CRITICALs (crisis-pattern dup; SAFE_FALLBACK_REPLY dup) | **Downgraded** to **M4** (bounded blast radius — crisis never reaches consolidation) and **L4** (identical strings today). |
| Lane D: memory.ts importance divergence (HIGH) | **Downgraded to L7** — the function is dead code (not on the turn path). |
| Lane I: eval safety gate (CRITICAL) | **Downgraded to H13** — regression-prevention gap; runtime pipeline still fails closed. |
| Lane G: migrate-on-boot "silently applies zero + logs success" | **Nuanced** — more likely a fail-fast crash (Drizzle throws on a missing journal); either way deploy-blocking (**C2**). Worth empirical confirmation. |
| Lane A: `banned_identities` UNIQUE "appears to have no migration" | **Confirmed** via migration grep — no UNIQUE exists (folded into **H12**). |

Cross-lane corroboration strengthened confidence on: the in-memory rate-limit store (B+H+my read), the missing OpenAI timeout (B+E+H), and the dead Stripe path (A+D+G).

---

## 8. Prioritized remediation backlog

**Before any production launch (blockers):** C1, C2, C3, H1, H2, H4, H5, H6.
**Before scaling past one instance:** C1 (shared store), H9 (migration lock), H7 (worker drain).
**Before/with launch (safety & ops integrity):** H8, H10, H11, H12, H13, M1, M2, M3, M4.
**Fast-follow hardening:** remaining MEDIUMs.
**Cleanup (low risk, do opportunistically):** all LOWs.

**Suggested optional empirical confirmations** (need a live key / DB — out of this static pass): run `pnpm build && pnpm typecheck && pnpm lint && pnpm test` to confirm the green-suite claim; deploy the built bundle against a fresh Neon DB to confirm C2's exact failure mode; with a `GROQ_API_KEY`, run `pnpm eval` / `pnpm eval:gen` to validate the prompt lane (C3, M5, H13) empirically.

---

## 9. Remediation log (2026-06-29 — report-only pass turned into fixes on request)

A remediation pass was executed after this audit. Baseline before changes: **298 tests green**; after: **304 tests green** (29 files), typecheck clean on all workspaces, server bundle builds + copies all 15 migrations into `dist/db/migrations`. (The "21 suites" figure in the docs was understated.)

### Fixed & verified

| ID | Fix | Key files |
|---|---|---|
| **C1** | Durable Postgres-backed rate-limit store (per-instance/restart-safe) + migration `0011` + PGlite contract test | `middleware/pg-rate-limit-store.ts`, `middleware/rate-limit.ts` |
| **C2** | Migrate-on-boot path `../db/migrations`→`./db/migrations` + `build.mjs` copies migrations into `dist` + non-empty assertion | `index.ts`, `build.mjs` |
| **C3** | Safety preamble restored to spec/SB 243 AI-disclosure ("you are an AI… say so plainly if asked") | `chat/prompt-assembler.ts` |
| **H1** (partial) | Bounded pg pool (`max`, `connectionTimeoutMillis`, `statement_timeout`; deliberately no idle-in-tx timeout) | `db/src/index.ts` |
| **H2** | OpenAI omni client timeout (8s) + `maxRetries: 1` | `moderation/openai-omni.ts` |
| **H3** | True `turnId` idempotency (return existing turn on replay; random-collision retry preserved) + test | `chat/turn-pipeline.ts` |
| **H4/H5/H6** | Clerk deletion propagation (best-effort) + content-free `deletion_audit` (migration `0014`) + per-user purge isolation + complete data export (subscriptions/device tokens/safety events, all userId-scoped) | `services/retention.ts`, `routes/compliance.ts` |
| **H7** | Worker SIGTERM drain (await in-flight cycle) + `claimed_at` (migration `0010`) + stale-job reaper | `services/jobs/worker.ts`, `index.ts` |
| **H8** | Safety-event logging moved off the turn transaction → **loud** best-effort (error log + Sentry + metric), never silent, never blocks reply delivery | `chat/turn-pipeline.ts` |
| **H9** | `pg_advisory_lock` around migrate-on-boot (multi-instance safe) | `index.ts` |
| **H10** | Sentry `captureException` wired in the error handler + `unhandledRejection`/`uncaughtException` handlers (M14) | `lib/observability.ts`, `middleware/error-handler.ts`, `index.ts` |
| **H11** | In-process metrics counters (safety events by type/severity, 429s) + admin `GET /api/admin/metrics` | `lib/metrics.ts`, `routes/compliance.ts` |
| **H12** | Proper `unique()` builders + `banned_identities` UNIQUE (migration `0012`) + safety-critical enum CHECK constraints (migration `0013`) | `schema/messages.ts`, `schema/banned_identities.ts` |
| **H13** | Eval safety gates (moderation: exit 1 on safety-critical FN; generation: derive pass from dimension grades) | `eval/runner.ts`, `eval/runner-generation.ts` |
| **M1** | Memory-consolidation `UPDATE` scoped by `userId`+`companionId` (not LLM-id alone) | `memory/consolidation.ts` |
| **M2** | `hashIdentifier` → HMAC-SHA256 (was SHA-256 of id+pepper) | `lib/crypto.ts` |
| **M4** | Single shared `isCrisisContent` so consolidation is never narrower than L0 (L0 behavior unchanged) | `moderation/deterministic.ts`, `memory/consolidation.ts` |
| **M10** | Consolidation raw message datamarked as data-only | `memory/consolidation.ts`, `memory/consolidation-prompt.ts` |
| **L1/L3/L6** | Deleted dead Stripe `payment.ts`; `groq.ts` uses shared temp/max-tokens constants; consolidation `CATEGORIES` imports from `@aura/shared`; user-report severity `info`→`warning` | various |

### Deferred (with rationale — NOT done this pass)

- **H1 transaction-split** (move moderation+generation fully outside the DB transaction): the highest-leverage scale fix, but it rewrites the most safety-critical file and is entangled with fully-mocked tests. **Mitigated** by the pool bounds + statement_timeout (H1-partial) + the OpenAI timeout (H2). Needs a dedicated change with PGlite-backed turn tests.
- **M5 / M6** (L0 `decode base64` over-block; destructive leetspeak normalizer): change L0 **safety detection** — owned by Jason's safety labels and must go through the eval loop, not a blind edit.
- **M13** (auth response-envelope inconsistency): the `client` currently reads auth responses raw; wrapping them is a coordinated client contract change.
- **L5** (dead `moderation/break-reminder.ts` copy): pure cleanup; deferred to avoid test-import churn.
- Smaller MEDIUMs (M7 free-tier count race, M8 RevenueCat atomic CAS, M9 datamark-at-fence, M11 safeguard structured route, M12 DELETE-token validation) — noted, lower priority.

### Verification audit (you asked us to verify, not assume)

4 independent read-only agents re-audited every change for correctness **and** butterfly-effects, plus a full regression gate. Result: **3 of 4 clusters PASS clean**; **1 real regression caught and fixed**:
- **Crisis-500 (introduced by the first H8 attempt):** removing `logSafetyEvent`'s try/catch made a failed safety-event insert roll back (and in Postgres poison) the crisis transaction → user got a 500 instead of the 988 reply. **Fixed** by logging on a separate connection, loud best-effort; **locked** with a regression test ("still delivers the crisis reply when the safety-event write fails"). As a bonus this resolved an `autoSuspendIfNeeded` off-by-one.

Verified-correct, highest-risk checks: CHECK constraints reject no value any code writes (`source:"input"` is whitelisted); `deletion_audit` INSERT columns match migration `0014`; every export query is `userId`-scoped (no cross-user leak); L0 crisis detection is byte-identical (M4 only added a reader); rate-limit store is import-safe (no DB at boot) and window-reset-correct.

**Known non-blocking notes (follow-ups, not regressions):** crash handlers `exit(1)` bypass graceful drain (standard "let it crash", but aggressive for `unhandledRejection`); rate-limit fail-open silently disables brute-force during a DB outage (add an alert on the `auth-bf` error log); `rate_limits`/`deletion_audit` have no Drizzle schema entry (raw-SQL by design — invisible to `drizzle-kit` diffing); `safety_events.source` is hardcoded `"input"` for output/crisis events (pre-existing, semantically loose, not a CHECK violation); `enforceGraceExpiry`'s purge path has no automated test (correct by inspection; add one with a mocked Clerk client).
