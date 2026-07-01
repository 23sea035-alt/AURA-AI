# Aura AI — Backend TODO

Work this list **top-to-bottom**, one task at a time.

After completing each task:
1. Confirm `pnpm build && pnpm typecheck && npx vitest run` are all green (baseline: **342 tests**).
2. No `console.*` or hardcoded secrets in the diff.
3. Commit your changes with a clear message (`feat:` / `fix:` / `test:` / `chore:` prefix).
4. Add an entry to [`CHANGELOG.md`](CHANGELOG.md) describing what landed.
5. Push to `origin/test-results` only — do not push to `main` or `backend`.

---

## 1. Voice ID selection — Inworld portal

**This task blocks tasks 2 and 3.** The voice pipeline is fully built. The only missing pieces are the three voice IDs — one per companion persona — which you create in the Inworld TTS portal.

**Steps:**
1. Go to the Inworld TTS portal → Voice → Create Voice.
2. Create **three voices**, one per persona, using the character feel as your casting guide:

   | Persona | Style tag | Delivery mode | Character feel |
   |---|---|---|---|
   | Aurora | `[warm and gentle]` | BALANCED | Warm, calm, emotionally present |
   | Orion | `[direct and grounded]` | STABLE | Clear, measured, no-nonsense |
   | Lyra | `[bright and expressive]` | CREATIVE | Energetic, playful, expressive |

3. Copy each voice ID and add to `.env` and Render environment variables:
   ```
   INWORLD_VOICE_ID_AURORA=<id>
   INWORLD_VOICE_ID_ORION=<id>
   INWORLD_VOICE_ID_LYRA=<id>
   ```
4. Start the server and open a voice session with each persona. Verify audio is produced and sounds roughly in-character. Check server logs for TTS errors.

**Acceptance:** voice IDs set; each persona produces audio matching its character feel; no TTS errors in logs.

---

## 2. Voice expression tuning

With IDs set, evaluate expression steering and adjust if needed.

**What to check:**

- **Style tags** — defined per-persona in `server/src/services/voice/voice-session.ts` (`PERSONA_STYLE_TAG`). If a voice does not respond well to `[warm and gentle]` / `[direct and grounded]` / `[bright and expressive]`, adjust the wording — Inworld's steering is sensitive to phrasing.
- **Delivery modes** — `PERSONA_DELIVERY_MODE` in the same file. `STABLE` = predictable/consistent; `BALANCED` = natural variation; `CREATIVE` = wider expressive range. Swap modes if a persona sounds off.
- **Crisis override** — crisis replies always use `[calm and measured]` + `STABLE` regardless of persona (`voice-session.ts:synthesizeReply`). Verify this sounds noticeably calmer than normal speech.
- **Filler clips** — short ambient phrases pre-generated at session open (e.g. "Mm, yes...", "Go on..."). These are defined in `@aura/shared` as `VOICE_FILLER_TEXTS`. Check they sound natural and appropriately paced for each persona.

**Acceptance:** the three personas are clearly distinct; crisis override is audibly calmer; filler clips don't sound jarring or out of character.

---

## 3. Unit tests for the new WebSocket + voice code

These files shipped with zero tests. Write one test file per section below. All four are pure logic or in-memory — **no real DB, Groq, or Inworld API needed**.

Test files go in `server/src/__tests__/`.

### 3a. `interruption.ts` — `classifyInterruption()` (pure function, zero deps)

| Input | Expected output |
|---|---|
| `""` | `"resume"` |
| `"yes"` / `"yeah"` / `"ok"` / `"mhm"` / `"uh huh"` | `"interjection"` |
| `"Yes!"` / `"Okay."` (with punctuation) | `"interjection"` |
| `"YEAH"` | `"interjection"` (case-insensitive) |
| `"tell me more"` (short, not an affirmation) | `"detour"` |
| Sentence longer than `INTERJECTION_MAX_WORDS` words | `"detour"` (regardless of content) |

### 3b. `connection-manager.ts` — in-memory registry (zero deps)

- `add()` + `get()` — returns the registered socket
- `add()` duplicate key — closes the old socket with code 4000, stores the new one
- `remove()` existing — cleans up; safe on non-existing (no throw)
- `isConnected()` — `true` for `readyState === 1`; `false` for any other readyState or missing entry
- `size()` — counts total connections across all users
- `remove()` last companion for a user — removes the outer user map entry (no memory leak)

### 3c. `turn-queue.ts` — priority queue (mock p-queue or inspect calls)

- Premium turn (`isPremium: true`) enqueues with priority 1
- Free turn (`isPremium: false`) enqueues with priority 0
- `turnQueueSize()` reflects the current pending count
- `ttsQueueSize()` reflects TTS pending count

### 3d. `voice-session.ts` — state machine transitions + filler clip cycling

`onInterrupt()` state transitions (construct a VoiceSession, set initial state to IDLE):
- `onInterrupt("")` → state ends at `RESUMING`; returns `"resume"`
- `onInterrupt("yes")` → state ends at `ACKNOWLEDGING`; returns `"interjection"`
- `onInterrupt("what do you think about that")` → state ends at `PROCESSING`; returns `"detour"`

`nextFillerClip()`:
- Empty `fillerClips` + defined `fallbackClip` → returns fallback
- Non-empty clips → cycles by index modulo length across repeated calls

**Acceptance:** all new tests pass; total suite ≥ 346 tests; `npx vitest run` exits 0.

---

## 4. Remember endpoint — contract test

The service layer for "remembers" is tested in `src/__tests__/remember.test.ts`. What is **not** tested is the HTTP response contract — that `GET /api/companions` actually returns the three remember fields in the response shape.

Add tests to `routes.integration.test.ts` or a new `remember.contract.test.ts`:

1. **No cache** — seed a companion with `rememberQuestion: null`; `GET /api/companions` response includes `rememberQuestion: null` and `rememberMemoryId: null`.
2. **Populated cache** — seed a companion with `rememberQuestion: "How's the new job going?"` and a valid `rememberMemoryId`; `GET /api/companions` response returns those values correctly.
3. **Delete nulls cache** — seed a companion with a `rememberMemoryId` pointing at a memory row; `DELETE /api/memories/:id` on that memory; verify the companion's `rememberMemoryId` becomes `null` (FK `ON DELETE SET NULL` — test via PGlite contract).

**Acceptance:** new tests pass; the three `remember*` fields are verifiably present and correct in the response shape.

---

## 5. Coverage to 80%

Coverage is reported (v8) but not enforced. Raise line coverage for `server/src/` to ≥ 80% and add a vitest threshold so CI fails if it drops below.

Coverage thresholds are **already configured** in root `vitest.config.ts` (`lines: 80, statements: 80, branches: 60, functions: 70`). The task is to get coverage there, not to configure the tool.

**Steps:**
1. Run `npx vitest run --coverage` from the repo root; open `coverage/lcov-report/index.html` to identify gaps.
2. Fill gaps, prioritizing: `services/chat/`, `services/moderation/`, `services/voice/`, `services/payments/revenuecat.ts`, `services/memory.ts`.
3. Re-run until `npx vitest run --coverage` exits 0 with all thresholds met.

> Gaps to expect: the new WS+voice files (covered by §3), free-tier race path, RevenueCat CANCELLATION/EXPIRATION paths, voice adapter TTS failure path. Fill with unit or PGlite-backed contract tests — no real API keys needed.

**Acceptance:** `npx vitest run --coverage` exits 0 with all thresholds passing; CI is green.

> See [`planning/backend-fixlist-v1.md §Phase F — Coverage to 80%`](planning/backend-fixlist-v1.md) and [`testing/testing-readiness-v1.md §2`](testing/testing-readiness-v1.md) for the original tracking entry.

---

## 6. Deferred audit items

These were explicitly deferred in the 2026-06-29 remediation pass. See [audit/backend-audit-2026-06.md §9](audit/backend-audit-2026-06.md) for the full rationale. Work them in order:

| ID | Task | Risk |
|---|---|---|
| M7 | Free-tier count race — add `FOR UPDATE` to the daily counter select in `services/chat/free-tier.ts` | Low |
| M8 | RevenueCat webhook — atomic compare-and-swap replay safety: the stale-check SELECT in `services/payments/revenuecat.ts` (lines 83-95) runs outside any transaction, and the subsequent `onConflictDoUpdate` / `UPDATE` paths have no `WHERE lastEventTimestampMs < event_timestamp_ms` guard. Two concurrent deliveries can both pass the stale check and race. Fix: wrap the SELECT + conditional upsert in a single transaction with a CAS WHERE clause on the update. | Low |
| M11 | Safeguard structured `route` field — `SafeguardVerdict` has no `route` / `pipeline_stage` field; log callers have no way to filter by L1/L2/L3/output stage. Add a `route` field to `SafeguardVerdict` and thread it through callers that log safety events. | Low |
| M12 | `DELETE /notifications/register` — replace the type-assertion + manual `if (!token)` guard with a Zod schema parse at `routes/notifications.ts` | Low |
| L5 | Delete dead `moderation/break-reminder.ts` — file still exists but is unused | Low |

> **M9 and H1-full are already resolved.** Memory/history are datamarked at the generation fence (`<<MEMORY ref-only {tag}>>`, `<<HISTORY {tag}>>`) in `prompt-assembler.ts`. The full LLM + moderation pipeline runs outside any DB transaction — `turn-pipeline.ts` line 64 documents this explicitly.

> **Do not touch M5, M6, or M13** without Jason — they change safety detection behavior or client API contracts.

**Acceptance per item:** `pnpm build && pnpm typecheck && npx vitest run` green; CHANGELOG entry written.

---

## ✅ 7. Eval loop — run and validated (2026-07-01)

**Signed verdict:** `server/eval/verdicts/V2-FINAL-2026-07-01.md` — GO on safety (moderation), GO on generation, GO on crisis response, GO on injection resistance, GO on medical boundaries.

The eval runners are built and wired. The prompts are **first drafts that have never been run against real Groq**. This is the prompt-iteration loop.

**Pre-condition: verify guard models exist on your Groq account before running evals.**

```bash
curl -H "Authorization: Bearer $GROQ_API_KEY" \
  https://api.groq.com/openai/v1/models | grep -E "prompt-guard|safeguard"
```

Expected:
- `meta-llama/llama-prompt-guard-2-86m` — L1 input screening
- `openai/gpt-oss-safeguard-20b` — L2/L3 output safeguard

If either is missing or deprecated, the selector already falls back safely — pick a replacement and update `server/src/services/llm/model-selector.ts`. Options: `llama-guard-3-8b` (Meta), `wildguard` (Allen AI), or `llama-3.3-70b-versatile` as a more capable (costlier) fallback.

> Earlier eval reports on this branch were run against an NVIDIA endpoint + a placeholder OpenAI key — those numbers do NOT reflect the Groq production pipeline. Discard them; re-run fresh.

```bash
# from server/, with GROQ_API_KEY + OPENAI_API_KEY set in the environment
pnpm eval          # moderation: L0–L3 pipeline, writes confusion matrix to eval/reports/
pnpm eval:gen      # generation: persona × trait × scenario cases + LLM judge
```

**The loop:**
1. Run `pnpm eval` → read the confusion matrix in `eval/reports/`.
2. Safety-critical cells (`sexual/minors`, `self-harm`, injection) must hit **FN = 0** — the runner exits 1 if they don't. Tune `services/moderation/safeguard.ts` or `prompt-guard.ts` and re-run. Log before/after so the iteration is auditable.
3. Once moderation passes: run `pnpm eval:gen` → read dimension grades → tune persona/generation prompts if any dimension fails.
4. Commit signed-off reports under `server/eval/verdicts/` with a GO/NO-GO per dimension.

> **Jason owns the `safetyCritical` labels** in `eval/cases/`. Tune the prompts to the labels — never move the labels to match the prompts.

**Acceptance:** `pnpm eval` exits 0; `pnpm eval:gen` all dimensions PASS; signed verdicts committed under `eval/verdicts/`.

> See [`planning/backend-fixlist-v1.md §Phase E`](planning/backend-fixlist-v1.md) and [`testing/testing-readiness-v1.md §1`](testing/testing-readiness-v1.md) for the original tracking entries.

---

## 8. CI lint fix

`pnpm lint` currently fails on 5 `react-hooks/exhaustive-deps` "Definition for rule not found" errors in **client/** files. These are pre-existing and unrelated to backend work. Fix the client ESLint config (register `eslint-plugin-react-hooks` or drop the rule from the flat-config) so the full CI gate passes clean.

**Acceptance:** `pnpm lint` exits 0 from the repo root; the CI workflow on `.github/workflows/ci.yml` goes green on a PR to `main`.

---

## Historical reference

This file supersedes the incomplete work tracked in:

- [`planning/backend-fixlist-v1.md`](planning/backend-fixlist-v1.md) — Phase E (eval loop → §7 here) and Phase F (coverage → §5 here; verdicts → §7 here). Phases A–D are complete history, do not re-do them.
- [`testing/testing-readiness-v1.md`](testing/testing-readiness-v1.md) — §1 (eval loop → §7 here), §2 (coverage → §5 here).

Both docs are kept for historical context only.
