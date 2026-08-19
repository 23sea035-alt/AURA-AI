# Aura — project handoff

> **Purpose:** everything a new owner (or future-you, six months from now) needs to pick this
> project up cold. Written 2026-08-19 against `redesign` @ `580e524`, with every claim below
> re-verified by running the toolchain rather than trusting the other docs.
>
> **Scope:** this file is the *entry point*. It does not duplicate the specs — it tells you what is
> true today, where the authoritative detail lives, and what is genuinely left to do.
> Living-doc index: [`README.md`](README.md). Remaining-work checklist: [`../todos.md`](../todos.md).
> Ops/config/legal gates: [`GO-LIVE.md`](GO-LIVE.md).

---

## 1. What Aura is

An **iOS AI-companion chat app (18+, US-first)**. Users build a roster of companions from a curated
gallery of **12 personas**, each with a distinct personality voice pack, cast Inworld TTS voice, and
persistent per-companion memory. One companion = one continuous conversation.

- **Free tier:** up to 5 active companions, 30 messages/day (per user, shared across companions),
  20 voice minutes/month.
- **Premium** ($12.99/mo or $99.99/yr via RevenueCat): 15 companions, personality tuning, avatar
  looks, 600 voice minutes/month.
- **Differentiator:** safety-first, regulation-aware design (SB 243, Apple 5.1.2(i)), with a
  two-vendor moderation pipeline that is not bypassable from the client.

Full product model: [`specs/companion-roster.md`](specs/companion-roster.md).

---

## 2. Which branch is current — read this first

**`redesign` is the current product.** It is the canonical branch and there is nothing newer.

| Ref | Tip | Relationship to `redesign` |
|---|---|---|
| `redesign` (local) | `580e524` | **current** |
| `origin/redesign` | `580e524` | identical |
| `origin/main` | `580e524` | **identical — 0 commits divergence either way** |
| `main` (local) | `25d96c6` | stale, 175 behind — a leftover local ref, safe to fast-forward or delete |
| `backend` (local) | `c6b7a0d` | 1 commit not in `redesign`; **unpushed** — see §2.1 |
| `origin/backend` | `572b194` | fully contained in `redesign` |
| `origin/test-results` | `6b5e6b1` | ~20 avatar-art authoring iterations, superseded — see §2.1 |
| `feat/voice` | `fad1d79` | fully contained in `redesign` |
| `worktree-agent-*` | `3c9012c` | fully contained in `redesign` |

> ⚠️ Several older docs (including [`README.md`](README.md)) still say *"`main` is behind"*. That was
> true when written and is **no longer true** — `origin/main` was fast-forwarded to the `redesign`
> tip. Both remote branches point at the same commit today.

Working tree at time of writing: **clean**. Total history: 300 commits.

### 2.1 The one real branch gap — RESOLVED 2026-08-19

`backend` @ `c6b7a0d` ("feat(avatars): add batch-4 companion avatar art + authoring tool") was
**local-only and unpushed**, and two of its files existed *nowhere else*. Both have now been
recovered onto `redesign`, byte-identical to the originals:

- `tools/avatars/magenta_key.py` — the chroma-key avatar authoring tool. Now documented under
  *Tooling* in [`redesign/companion-avatar-pipeline.md`](redesign/companion-avatar-pipeline.md).
- The batch-4 art brief → [`archive/redesign/companion-avatar-batch-4-handoff.md`](archive/redesign/companion-avatar-batch-4-handoff.md),
  alongside batches 1–3 and indexed in [`archive/README.md`](archive/README.md). It is archived
  rather than living because the art it specifies is shipped and complete.

Everything else in that commit was already obsolete: `redesign` carries all 12 portraits **plus**
36 outfit looks (48 files vs. backend's 12), and its `eli.png` / `juno.png` are *newer* (last
touched `8e6d12c`, 2026-07-13, vs. backend's 2026-07-10). The other 10 portraits are byte-identical.

**`backend`, `test-results`, `feat/voice`, and the `worktree-agent-*` ref now hold nothing unique.**
They are safe to delete once you are comfortable; `redesign` is a strict superset.

---

## 3. Verified current state (re-run 2026-08-19, not copied from docs)

| Check | Command | Result |
|---|---|---|
| Test suite | `pnpm test` | ✅ **679 passed, 2 skipped, 0 failed** (65 files) |
| Server typecheck | `pnpm --filter @aura/server typecheck` | ✅ clean |
| Client typecheck | `pnpm --dir client exec tsc -p tsconfig.json --noEmit` | ⚠️ 6 errors — **all stale generated route types**, see §3.2 |
| Lint | `pnpm lint` | ✅ **0 errors**, 106 warnings (unused-var / no-console) |
| Working tree | `git status` | ✅ clean |

### 3.1 Footgun: you must build `@aura/shared` before `pnpm test`

On a cold checkout the suite **fails 29 tests across 3 files** with errors that look alarming and are
not real:

```
TypeError: (0 , totalCompanionCap) is not a function
TypeError: (0 , activeCompanionCap) is not a function
Error: Retention [enforceGraceExpiry]: invalid cutoff date
```

**Cause:** `@aura/shared` resolves through its `package.json` `exports` to `shared/dist/index.js`, not
to source. A stale `dist/` silently omits newer exports; the imports then resolve to `undefined`
(`ACCOUNT_GRACE_DAYS` → `undefined` → `NaN` cutoff → the retention error). Vitest does not build it.

**Fix — always run this first:**

```bash
pnpm --filter @aura/shared build   # or: pnpm build  (shared + server)
pnpm test
```

CI is unaffected because [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) builds before
testing. This is purely a local-workflow trap, and it has cost real debugging time. Consider making
`pnpm test` depend on the build.

### 3.2 The 6 client typecheck errors are stale expo-router types

`client/.expo/types/router.d.ts` was generated **2026-06-25** and is ~8 weeks out of date. It still
lists a `/firstchat` route that no longer exists and lacks `/terms-of-service`, `/ai-consent`, and
`/(auth)/verify-email` — all of which **do exist** as route files. Regenerate:

```bash
pnpm --dir client exec expo start --port 8090 --offline   # run briefly until router.d.ts updates
```

`.expo/` is gitignored, so this affects every fresh clone. Not a code defect.

---

## 4. Architecture at a glance

pnpm workspace, three packages, one contract boundary:

```
client/   Expo RN (SDK 54, RN 0.81.5, expo-router)   — iOS app
server/   Express 5 + Drizzle                        — API, WS chat, voice
shared/   @aura/shared                               — Zod DTOs, enums, policy constants
```

`shared` is the **single source of truth for cross-package types and policy numbers** (caps, grace
windows, age minimum). Never duplicate a constant across client and server — put it in `shared`.

**Vendors:** Clerk (auth) · Neon/Postgres via Drizzle (data) · Groq (LLM generation, Whisper STT,
prompt-guard + safeguard moderation) · OpenAI (`omni-moderation` L2/L3 scoring) · Inworld TTS 2
(voice, over WebSocket) · RevenueCat (payments) · APNs (push) · Render (hosting) · Sentry (optional).

The two moderation vendors are **deliberately unaffiliated and not interchangeable** — both API keys
are required. See [`specs/moderation-pipeline.md`](specs/moderation-pipeline.md).

**Client seam:** every backend call goes through `client/lib/backend.ts`. `DEV_USE_MOCKS` switches
between a fully-local mock implementation (`lib/mock.ts`, the dev default — the app runs with no
backend at all) and the real stack (`lib/live.ts`). Screens never import mock or live directly.

**Surface:** 11 server route modules (auth, chat, companions, compliance, health, memories,
notifications, payments, voice, webhooks) · 35 client screens · 7 SQL migrations (`0000`–`0006`,
applied on server boot — there is no manual migrate step).

Deeper: [`specs/v1-architecture.md`](specs/v1-architecture.md) (decisions D1–D13),
[`specs/chat-system-design.md`](specs/chat-system-design.md), [`specs/v1-schema.md`](specs/v1-schema.md).

---

## 5. Inworld voice IDs — the 12 cast personas

All 12 personas were cast and prosody-tuned on 2026-07-10. **These IDs are preserved here because
they are the output of a manual casting-and-listening process that would be expensive to redo.**

> **Good news:** they are *not* only in `server/.env`. They are already committed to
> [`../server/.env.example`](../server/.env.example), which is tracked in git. This table is a
> convenience duplicate for handoff purposes — `.env.example` remains the operational source.

| Persona | `INWORLD_VOICE_ID_*` | Delivery mode | Base rate | Accent steer | Playback gain |
|---|---|---|---|---|---|
| Aurora | `Deborah` | CREATIVE | 0.98 | — | +3.5 dB |
| Orion | `Edward` | STABLE | 0.95 | — | — |
| Lyra | `Sarah` | CREATIVE | 1.05 | — | — |
| Sage | `Tunde` | STABLE | 0.98 | — | +4 dB |
| Amara | `Saanvi` | CREATIVE | 1.02 | — | — |
| Eli | `Miguel` | CREATIVE | 1.00 | `en-US` (forced — voice defaults to Spanish) | — |
| Selene | `Wendy` | CREATIVE | 1.00 | — | +1 dB |
| Soren | `Lucian` | CREATIVE | 0.96 | — | +4 dB |
| Juno | `Asuka` | CREATIVE | 1.10 | — | — |
| Thea | `Folake` | CREATIVE | 0.95 | — | +9 dB |
| Cyrus | `community-snyihdsosxjx` | BALANCED | 0.90 | `hi-IN` | — |
| Wren | `Yoona` | CREATIVE | 1.00 | `en-US` (forced) | — |

**Notes that matter if you ever re-tune:**

- **Cyrus is the fragile one.** It is the only *community* voice ID rather than a stock catalog
  entry — if Inworld ever removes it, Cyrus loses its voice and there is no drop-in replacement.
  It is also the only persona locked to `BALANCED`: that is the sole delivery mode in which the
  `hi-IN` accent steer persists. (The steer approximates a Persian-Iranian character; no Persian
  en-locale exists, and the stock Thomas voice it derives from reads Irish.)
- **An unset voice ID is not a crash.** That persona's voice sessions run but produce **no audio** —
  TTS skips gracefully. This makes a missing ID easy to overlook in production.
- **Rate is a synthesis input; pace is not.** These base rates were hand-tuned for expressiveness.
  The user's speaking-pace preference is applied **client-side** as a pitch-preserving playback-rate
  change, so Inworld always renders the performance these values were tuned for.
- **Gain values** live in `client/constants/voiceGain.ts` and are EBU R128 measurement-derived
  (`pnpm voices:levels`). They are one-line edits.
- Tuning source of truth: `server/src/services/voice/voice-tuning.ts`.
  Process: [`specs/voice-casting-guide.md`](specs/voice-casting-guide.md).
  Re-audition harness: `pnpm voices:audition` (from `server/`).

### 5.1 Secrets — what is NOT in this file, on purpose

`INWORLD_API_KEY` is a live credential and is **deliberately not recorded here**. It exists only in
`server/.env`, which is gitignored (`server/.gitignore:4`) and has never been committed. The same
applies to `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `OPENAI_API_KEY`,
`GROQ_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, and `BANNED_IDENTITY_PEPPER`.

**`server/.env` is therefore a single point of failure** — it is on one machine, not in git, and not
in any backup this repo knows about. Put it in a password manager or secret store before anything
else in this handoff. Note that `BANNED_IDENTITY_PEPPER` in particular is **not regenerable**:
rotating it invalidates every existing banned-identity hash.

Currently populated in `server/.env`: everything except `APNS_KEY_ID`, `APNS_TEAM_ID`,
`APNS_KEY_FILE` (blocked on the Apple Developer account) and `SENTRY_DSN` (optional).

---

## 6. Is it production ready?

**The code is. The launch is not** — and the gap is entirely ops, config, and legal.

### ✅ Done and verified

- Backend v1-complete: 679 tests green, typecheck clean, lint 0 errors.
- The 2026-07-09 production-readiness audit's **P0/P1 findings are all remediated**
  ([`audits/2026-07-09-v1-production-readiness.md`](audits/2026-07-09-v1-production-readiness.md),
  [`CHANGELOG.md`](CHANGELOG.md) 2026-07-10).
- Contract tests run against **real Postgres via PGlite** with real Drizzle migrations applied — the
  schema is genuinely exercised, not mocked.
- Moderation FN=0 enforced on safety-critical categories by the eval runner.
- Migrate-on-boot wired; `render.yaml` complete including all 12 voice-ID slots.
- All 12 personas cast, tuned, and wired end-to-end; 12 portraits + 36 outfit looks shipped.
- Client: onboarding, home, chat, voice call, roster, paywall, account/settings family, compliance
  screens — all ported to the Warm Sanctuary design system.

### ⛔ Hard launch blockers (none are code)

1. **Apple Developer Program enrollment** ($99/yr) — "Gate -1". Blocks StoreKit products (RevenueCat
   cannot configure offerings without them), code signing, prod APNs key, TestFlight, and the App
   Store Connect record. 24–48h+ review lag, longer for organization enrollments (D-U-N-S
   verification). **Start this first** — it gates not just the launch but the pre-launch user
   testing in §7, which is the only way to find the defects a solo build can't surface.
2. **Groq paid (Developer) tier.** Free tier caps `llama-3.3-70b-versatile` at 12K TPM / 1K RPD /
   100K TPD, shared between generation and consolidation at ~2 calls/turn — that is **~42 turns/day
   across all users combined**. One-click billing change.
3. **OpenAI prepaid credits.** The org currently 429s on `omni-moderation` (a card on file is not
   enough). Moderation is running the Groq-safeguard **degraded path on every turn** today. It works
   and is metered (`moderation.l2/l3_degraded`), but it is not the designed two-vendor posture, and
   it also blocks the eval GO/NO-GO gate.
4. **Neon Launch plan for prod.** Free tier is unsafe: hitting any cap (100 CU-hrs / 0.5 GB / 5 GB
   egress) **suspends compute until the next month** — the database goes offline mid-month.
5. **Legal counsel sign-off** — retention windows, SB 243 / crisis / age-gate copy, the two
   documented E-3 divergences, the NCMEC §2258A duty question, and publicly hosted privacy + terms
   URLs. Drafts are in [`compliance/`](compliance/); **all are review-only and unpublished.**
6. **Render plan bump** free → starter, and all `sync: false` env vars set in the dashboard.

Full sequenced list: [`GO-LIVE.md`](GO-LIVE.md) gates 0–6.

### ⚠️ Known engineering backlog (P2, non-blocking)

Carried from the audit, in [`../todos.md`](../todos.md): REST chat turn bypasses the shared Groq
turn-queue (WS respects it) · no timeout on the Inworld TTS call · WS pongs never verified so dead
sockets linger · voice silence timers defined but wired nowhere · `internal_error` path sends raw
exception text · no transcript pagination · companion-cap check is read-then-write (concurrency
race) · Clerk `user.deleted` webhook hard-purges immediately, bypassing grace + audit row.

---

## 7. Recommended: get real people using it before launch

**This is the highest-value work available once Apple enrollment clears** — and it is the strongest
argument for starting that enrollment today. TestFlight is the only sanctioned way to put an iOS
build in other people's hands, and it sits behind the **Apple Developer Program** ($99/yr) exactly
like the launch itself does (§6 blocker #1). A free Apple ID only allows sideloading to *your own*
devices, with a 7-day provisioning expiry — it cannot distribute to testers.

So enrollment is not merely the first launch gate; it is also the gate on finding out whether the
thing is any good before launching it. Everything in this section is queued behind it.

The app has been built and verified by one person. That is exactly the condition under which a
codebase can be genuinely well-engineered — 679 tests, a real-Postgres contract layer, a remediated
audit — and *still* ship defects, because automated tests verify what you thought to specify, and a
solo builder shares a mental model with the code they wrote. Fresh users don't. They tap things in
an order nobody designed for, misread copy that seemed unambiguous, background the app mid-voice-call,
and lose signal in an elevator. None of that is a gap in care; it is a category of information that
only arrives from outside the build.

It matters more than usual here for three specific reasons:

1. **The product is emotional, and quality is subjective.** Whether a companion "feels right" — voice
   warmth, response length, memory surfacing at the right moment — cannot be asserted in a test.
   Persona distinctness passed its eval, but eval-passing and *likable* are different bars.
2. **Real conversation will find moderation edges a corpus won't.** The pipeline enforces FN=0 on
   safety-critical categories against a curated eval set. Live users will produce phrasings nobody
   wrote down, in both directions: things that should be caught and aren't, and — the more likely
   failure mode for a companion app — **false positives that block ordinary emotional conversation**
   and make the product feel punitive. That calibration can only come from real traffic.
3. **The riskiest paths are the ones tests mock.** Payments, push delivery, WebSocket reconnect
   across network changes, and the voice loop are all vendor-boundary code. Every one of them is
   mocked in CI by necessity. The [`GO-LIVE.md`](GO-LIVE.md) Gate 4 smoke test covers the happy path
   once; users cover it a thousand times, badly.

**Suggested shape** — deliberately small, because the goal is depth of use, not sample size:

- **5–10 TestFlight users**, ideally people who would plausibly use an AI companion, over ~2 weeks
  of ordinary daily use rather than a scripted test pass. Internal testers (up to 100, added by
  Apple ID on the team) skip App Review entirely; external testers need a one-time Beta App Review
  per build train, so budget a day for the first submission.
- **Watch, don't just ask.** Bookmark `GET /api/admin/metrics` (needs `users.role = 'admin'`) and
  alert on `groq.rate_limited > 0` and the rate-limit counters. Wire `SENTRY_DSN` before the cohort
  starts — it is currently empty, and it is the difference between "someone said it crashed" and a
  stack trace.
- **Instrument the moderation false-positive rate specifically.** Count `safety_events` per active
  user and read a sample by hand. A companion app that blocks people mid-vulnerable-moment fails
  differently and worse than one that occasionally lets something through.
- **Ask three questions at the end of week 1**, not a survey: what made you stop using it, what felt
  wrong or fake, and what did you expect to happen that didn't.
**Prerequisites, all of which must land before the cohort starts:**

1. **Apple Developer Program enrollment** — no enrollment, no TestFlight, no testers (§6 blocker #1).
2. **Groq paid tier + OpenAI credits.** Without them the free-tier cap (~42 turns/day *across all
   users*) throttles the test into uselessness and you will be measuring rate limits instead of the
   product — and moderation stays on its degraded single-vendor path, so any calibration you infer
   is calibration of the wrong pipeline.
3. **A deployed server the app can reach.** Render is currently `plan: free`, which spins down when
   idle (~50s cold start). Acceptable for a small cohort if you warn them; bump to `starter` if the
   first-launch latency starts reading as "the app is broken."
4. **`SENTRY_DSN` set** — see above; it is the difference between a report and a stack trace.

Also still open and cheap: the **owner ear-review** of the 4 re-audition clips
(`server/audition-clips/`: soren, eli, thea, wren) and the boosted-gain previews
(`server/boost-preview/`), plus **one real live voice call** end-to-end — the pace/gain mechanisms
have been verified on-device via playback probes, but the full WebSocket loop hasn't been exercised
since those changes landed.

---

## 8. Getting running from cold

```bash
# repo root
pnpm install
pnpm --filter @aura/shared build      # REQUIRED before tests — see §3.1
pnpm test                             # expect: 679 passed, 2 skipped

# server
cp server/.env.example server/.env    # then fill real secrets (§5.1)
cd server && pnpm dev                 # build + run against server/.env

# client — runs fully local on mocks, no backend needed
cp client/.env.example client/.env    # EXPO_PUBLIC_USE_MOCKS=true is the dev default
pnpm --filter @aura/client ios:sim    # xcodebuild workaround; plain `expo run:ios` fails on signing
pnpm --dir client exec expo start --port 8081
```

Client conventions, simulator tooling, and the accumulated gotchas (AsyncStorage layout, tab-bar
quirks, inverted-FlatList behavior, port-8081 collisions) are in [`../CLAUDE.md`](../CLAUDE.md) —
read it before touching the client.

**Doc hygiene rule:** everything indexed in [`README.md`](README.md) is maintained and authoritative.
Everything in [`archive/`](archive/README.md) is **frozen history — never trust or edit it**. When a
doc stops being true, fix it in the same PR or move it whole into `archive/` with a line in that
README. Docs in this repo are reliable for *intent* and drift on *as-built* — when the two disagree,
the code wins, and §3 above is what happened when that was actually checked.

---

## 9. Ownership and the one thing you must not delegate

| Area | Owner | Notes |
|---|---|---|
| Frontend / client | Jason | Expo app |
| Backend / server | Jason + collaborators | Lands on `redesign`; recorded in [`CHANGELOG.md`](CHANGELOG.md) |
| **Safety labels / eval corpus** | **Jason only** | Others may run the eval runners and tune non-safety prompts, but **must not author or freeze `safetyCritical` labels**. Tune prompts to labels; never labels to prompts. |
| Contract boundary | `@aura/shared` | Zod DTOs, enums, policy constants |

**Do not guess these — they are for counsel:** exact retention windows (current numbers are
defaults), whether `safety_events.flagged_content` is retained in full or scrubbed to metadata, and
the served jurisdictions (US-only vs. EEA/UK).
