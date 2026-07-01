# Aura AI — Backend TODO

Work this list **top-to-bottom**, one task at a time.

After completing each task:
1. Confirm `pnpm build && pnpm typecheck && npx vitest run` are all green (baseline: **342 tests**).
2. No `console.*` or hardcoded secrets in the diff.
3. Commit your changes with a clear message (`feat:` / `fix:` / `test:` / `chore:` prefix).
4. Add an entry to [`CHANGELOG.md`](CHANGELOG.md) describing what landed.
5. Push to `origin/test-results` only — do not push to `main` or `backend`.

---

## 0. Pull before you do anything else

**Run `git pull origin test-results` before touching any code.** Your last commit predates a merge-corruption cleanup — a prior reconciliation merge had silently resurrected old, pre-Inworld code (the LiveKit voice stack, NVIDIA/Anthropic/OpenRouter LLM providers, a broken `memory.ts`, and a `config/env.ts` that required `NVIDIA_API_KEY` instead of `GROQ_API_KEY`). All of that is now fixed on `origin/test-results`. If you don't pull first, you'll keep building on top of the corrupted state. See [`CHANGELOG.md`](CHANGELOG.md) for the full record of what was removed/restored.

**After pulling, run `pnpm install`** — the LiveKit dependency tree (110+ packages) was removed from `server/package.json`.

---

## 1. Voice expression tuning — send the audio samples

Tasks 1, 3, 4, 5, 6, and 8 are done and verified — see [`CHANGELOG.md`](CHANGELOG.md) for the full record. This is the one item still open from that batch.

Your `server/tts-output/*.mp3` samples (persona × welcome/warm-response/concerned/crisis) are gitignored and never reach the repo — Jason needs to actually hear them to sign off on Task 2. **Send the 12 files directly** (Slack/email/drive link — whatever's easiest).

**Acceptance:** Jason confirms the three personas are clearly distinct and the crisis override is audibly calmer than normal speech. If a persona sounds off, adjust the style tag wording or delivery mode in `server/src/services/voice/voice-session.ts` (`PERSONA_STYLE_TAG` / `PERSONA_DELIVERY_MODE`) and regenerate.

---

## 2. Re-run the generation eval on Groq (Task 7 correction)

**The moderation half of Task 7 is done and stands as-is** — it was already genuinely Groq-based (`runner.ts` hardcodes `createGroqProvider` directly). Nothing to redo there.

**The generation half needs a fresh run.** The signed verdict's "GO on generation" was produced by `runner-generation.ts` calling **NVIDIA** — for both generating the candidate replies *and* judging them — not Groq. This happened because your `NVIDIA_API_KEY` env var was available and `runner-generation.ts`'s entry-gate fetched it first, ahead of whatever the model-selector would otherwise have picked. That verdict doesn't tell us anything trustworthy about the actual production pipeline (Groq's `llama-3.3-70b-versatile`), so it needs to be discarded and re-run.

After pulling (task 0 above), the fix is already in place: `runner-generation.ts` is now Groq-gated end to end, and `model-selector.ts` no longer has any NVIDIA/Anthropic/OpenRouter code path at all — there's nothing left to accidentally fall through to.

**Before running:** confirm `GROQ_API_KEY` is actually set in whatever shell/environment you run this from. You do **not** need `NVIDIA_API_KEY` at all anymore.

```bash
# from server/, with GROQ_API_KEY set in the environment
pnpm eval:gen      # generation: persona × trait × scenario cases + LLM judge
```

Update `server/eval/verdicts/V2-FINAL-2026-07-01.md`'s generation section with the fresh results (or write a new dated verdict file), and note in `CHANGELOG.md` that the prior generation verdict was invalid and has been superseded.

**Acceptance:** `pnpm eval:gen` all dimensions PASS on a run confirmed to have used Groq (check the verdict — it should say `Judge | Groq`, not NVIDIA).

---

## 3. (Optional, low priority) Fix the M11 CHANGELOG description

Your CHANGELOG entry for M11 says the `route` field is "populated as `req.route?.path ?? \"unknown\"` in middleware." That's not what actually shipped — the real implementation threads explicit stage labels (`"L2_degraded_fallback"`, `"L2_escalated_adjudicate"`, `"L3_degraded_fallback"`) through `moderation-engine.ts`'s calls to `adjudicate()`/`runOutputFallback()`. The code itself is correct and verified; just the changelog prose doesn't match. Fix whenever convenient — not blocking.

---

## Eval loop reference (for future runs)

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

---

## Historical reference

This file supersedes the incomplete work tracked in:

- [`planning/backend-fixlist-v1.md`](planning/backend-fixlist-v1.md) — Phase E (eval loop) and Phase F (coverage, verdicts). Phases A–D are complete history, do not re-do them.
- [`testing/testing-readiness-v1.md`](testing/testing-readiness-v1.md) — §1 (eval loop), §2 (coverage).

Both docs are kept for historical context only. See [`audit/backend-audit-2026-06.md §9`](audit/backend-audit-2026-06.md) for the original deferred-items rationale (M7/M8/M11/M12/L5, all now fixed — see `CHANGELOG.md`).
