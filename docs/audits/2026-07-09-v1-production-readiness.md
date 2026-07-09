# AURA v1 Production-Readiness Audit
**Scope:** full-stack code audit (server, client, shared) + docs/ops cross-check, `redesign` branch, 2026-07-09
**Method:** static evidence review (path:line) across 6 workstreams (A: scoping/noise, B: error handling, C: payments/entitlements, D: moderation/safety, E: privacy/compliance, F: deploy/ops/content), each finding independently re-verified before inclusion

---

## 1. Executive summary

AURA's engineering is genuinely strong: idempotent chat turns, real WebSocket token streaming, a fail-closed two-vendor moderation core, server-authoritative entitlements, and a thoughtful data-retention design are all present and mostly correct — this is not a demo pretending to be a product. But two **P0** defects sit exactly where a "safety-first" AI-companion app can least afford them: a free-tier user's crisis-level message can be silently dropped by the daily quota gate before any moderation ever runs (**D-2**), and a user who discloses self-harm three times in 30 days gets auto-suspended with no distinction from a bad actor and no appeal (**D-1**). Both are small, surgical code fixes (S/M effort) but carry existential-severity blast radius for a product whose entire differentiator is safety. Beyond those two, there are **7 P1s** — a broken 30-day account-reactivation flow, a GDPR/CCPA data-export that promises an email no code can send, a retention-policy/code mismatch on safety-event content scrubbing, no elevated handling for sexual/minors zero-tolerance blocks, no client REST timeout, no migration dry-run gate on the sole production instance, and 9 of 12 gallery personas being silently dead-air on voice calls with no "coming soon" UI state. **11 P2s** and **6 P3s** round out a list of real but bounded hardening items (missing timeouts, WS dead-peer reaping, test-coverage gaps, a concurrency race in the companion-cap check). Server tests are green (641 passed / 2 skipped / 0 failed, 58 files, per the latest run), typecheck and lint are clean, and `render.yaml` is deploy-ready — but code-completeness is only one axis of readiness. The other axis — Apple Developer Program enrollment, Groq/Neon/RevenueCat/Clerk production tiers, funded OpenAI credits, published anchor voice IDs, and legal sign-off on retention/disclosure/reporting copy — is entirely unstarted, and several of those items have multi-day lead times. **Net: this app is close, not ready.**

## 2. Verdict

# NO-GO

Both P0s are confirmed, real, and sit on the product's core safety promise; several money/account/legal items with multi-day lead times (Apple Developer Program review, Groq/Neon tier upgrades, OpenAI credit funding, counsel sign-off) haven't been started. None of this is a "rewrite" problem — it's a short, sequenced punch list — but it cannot be compressed into same-day turnaround.

### Critical path to launch

**CODE work (engineering, no external dependency, can start now)**
1. **D-2** — reorder chat-session.ts so the L0 crisis pre-filter runs *before* the free-tier gate, and let detected crisis bypass the daily cap. (S/M effort, single shared engine for REST/WS/voice — one fix, all surfaces.)
2. **D-1** — scope `autoSuspendIfNeeded`'s 30-day counter to user-attributable violation types only; exclude `crisis_detected`, `output_blocked`, `user_reported`. (S effort.)
3. **E-1** — un-block `PATCH /account/reactivate` from `requireAuth`'s active-only gate so the documented 30-day undo window actually works. (S effort.)
4. **E-2** — stop promising an email the code can't send: ship native share-sheet delivery of the already-built export bundle for v1, or wire a real mailer. (M effort.)
5. **E-3** — implement (or consciously drop and re-document) the tiered safety-event content-scrub; today it's a flat 365-day full-row delete that contradicts the written retention policy and the user-facing privacy copy. (M effort.)
6. **F-2** — ship a "voice coming soon" UI state for the 9 uncast personas (or narrow launch scope to the 3 cast anchors) so a silent, dead-air call doesn't read as broken. (M effort.)
7. **B-2, B-7** — add a client REST timeout/AbortController and a pre-deploy migration dry-run gate; both are cheap insurance given the single-Render-instance architecture. (S/M effort.)
8. **D-3** — give sexual/minors blocks a distinct `severity:'critical'` + fast-lane review path (the code part; the reporting-duty question is legal, see below). (S effort for severity tagging.)

**MONEY / ACCOUNT / LEGAL work (ops+legal, has lead time, start in parallel with code fixes today)**
1. **Apple Developer Program enrollment** — 24-48h+ review lag; gates everything downstream (see Q&A section 4a).
2. **Groq paid Developer tier** — Free tier caps ~42 turns/day across *all* users; a hard functional blocker for any real traffic.
3. **OpenAI prepaid credits funded** — currently 429ing, forcing the moderation pipeline onto a Groq-only degraded path on every turn (fail-closed and functional, but not the documented two-vendor design) and blocking the eval GO/NO-GO gate.
4. **3 anchor Inworld voice IDs republished** — Aurora/Orion/Lyra currently produce no audio on voice calls (invalid/unsaved-draft IDs).
5. **Neon DB → Launch plan** (Free tier risks mid-month suspension), **RevenueCat + Clerk production projects stood up**, **production webhooks re-pointed off the dev tunnel**.
6. **Legal counsel sign-off**: retention windows, `safety_events.flagged_content` retain-vs-scrub policy, SB 243 AI-disclosure copy, age-gate copy, crisis-resource copy, UGC reporting duties, served jurisdictions, and specifically whether **D-3**'s sexual/minors detections trigger an 18 U.S.C. §2258A/NCMEC mandatory-reporting duty.
7. **Publicly-hosted privacy policy + terms of service URLs** — required by App Store Connect submission; current docs are drafts only, not publicly hosted.
8. **Eval GO/NO-GO gate run and signed** (`pnpm eval`/`eval:gen`/`eval:persona` against real Groq + OpenAI, per `docs/planning/post-v1.0-roadmap.md`), with verdicts actually committed this time.

---

## 3. Findings by workstream

| id | title | severity | status | kind | effort |
|---|---|---|---|---|---|
| D-1 | Auto-suspend counter conflates crisis disclosures, AI-fault blocks, and user reports with bad-actor events | P0 | CONFIRMED | code | S |
| D-2 | Free-tier daily cap checked before moderation/crisis detection | P0 | CONFIRMED | code | M |
| B-2 | Client REST calls have no timeout/AbortController | P1 | CONFIRMED | code | S |
| B-7 | Bad migration crash-loops the single prod instance; no dry-run gate | P1 | CONFIRMED | ops-config | M |
| D-3 | Sexual/minors zero-tolerance blocks get no elevated response, no reporting pathway | P1 | CONFIRMED | code | L |
| E-1 | `PATCH /account/reactivate` is dead code — requireAuth blocks the only users who'd call it | P1 | CONFIRMED | code | S |
| E-2 | GDPR/CCPA data export promises an email no code can send | P1 | CONFIRMED | code | M |
| E-3 | Tiered safety_events content-scrub doesn't exist; flat 365-day full-row delete | P1 | CONFIRMED | code | M |
| F-2 | 9 of 12 personas silent on voice calls, no "unavailable" UI state | P1 | CONFIRMED | code | M |
| B-1 | REST chat turn bypasses the global Groq concurrency limiter | P2 | CONFIRMED | code | S |
| B-3 | Inworld TTS call has no timeout | P2 | CONFIRMED | code | S |
| B-4 | WS heartbeat never reaps unresponsive sockets (no pong-liveness) | P2 | CONFIRMED | code | S |
| B-5 | Voice silence-timeout constants defined but wired nowhere | P2 | CONFIRMED | code | M |
| B-6 | Internal exception messages ride the wire verbatim on chat's internal_error path | P2 | CONFIRMED | code | S |
| B-8 | `GET /companions/:id/messages` has no pagination | P2 | CONFIRMED | code | M |
| C-1 | RC sandbox-in-production guard has a vacuous test (asserts same outcome both branches) | P2 | CONFIRMED | code | S |
| C-2 | Companion cap check is read-then-write with no lock (concurrency race) | P2 | CONFIRMED | code | S |
| E-4 | Clerk `user.deleted` webhook hard-purges immediately, bypassing the 30-day grace + audit trail | P2 | CONFIRMED | code | S |
| F-1 | GO-LIVE.md never names Apple Developer Program enrollment as its own gate | P2 | CONFIRMED | ops-config | S |
| F-3 | iOS entitlements may hardcode `aps-environment=development`, no verified prod-flip | P2 | UNVERIFIED | ops-config | S |
| C-3 | No RevenueCat handling for TRANSFER/PRODUCT_CHANGE events | P3 | CONFIRMED | code | S |
| C-4 | `GET /api/chat/usage` returns a backwards, unused `isPremium` field | P3 | CONFIRMED | code | S |
| D-4 | `MODERATION_TIMEOUTS` shared constants are dead; real timeouts hardcoded separately | P3 | CONFIRMED | code | S |
| D-5 | L1 prompt-guard never hard-blocks; spec doc says it should at p≥0.9 | P3 | CONFIRMED | code | S |
| F-4 | v1-architecture.md D4 references a stale $9.99 price / wrong file path | P3 | CONFIRMED | code | S |
| F-5 | `client/app.json` still carries a defunct `replit.com` expo-router origin | P3 | UNVERIFIED | code | S |

*(Workstream A produced no substantive findings — its one entry was a malformed placeholder, correctly discarded.)*

---

### P0 detail

#### D-1 — Auto-suspend counter conflates crisis disclosures, AI-fault blocks, and user reports with bad-actor events
**Evidence:** `server/src/services/auth/auth.service.ts:76-99` (`autoSuspendIfNeeded`) counts *all* `safety_events` rows for a user in the last 30 days (`FLAGGED_USER_WINDOW_DAYS`, `shared/src/index.ts:174-175`) with no `eventType`/source filter, threshold = 3. It's invoked after `crisis_detected` (`chat-session.ts:168-174`), `input_blocked`/injection (`chat-session.ts:158-163`), **and** `output_blocked` (`chat-session.ts:293-298` — the AI's own generated-reply failing L3, not user misconduct). `clerk.middleware.ts:67-72,119` then hard-403s (`ACCOUNT_SUSPENDED`) every subsequent REST/WS request with no human review or appeal step.
**Scenario:** A user discloses self-harm ideation on 3 separate nights within 30 days — a plausible usage pattern for an emotionally-supportive companion app. Each disclosure correctly triggers the crisis path; the 3rd also silently flips the account to suspended. Next login: a generic 403, no explanation, no appeal, no human ever reviewed the case. Separately, a user who taps "report" on 3 bad AI replies (exactly what Apple Guideline 1.2 wants) accumulates 3 `user_reported` events against their *own* account and gets themselves suspended for reporting problems.
**Remediation:** Scope the counter to genuinely user-attributable violation types (e.g. `injection_detected`, user-originated `input_blocked`); explicitly exclude `crisis_detected`, `user_reported`, and `output_blocked`. Add a regression test asserting a user who only trips those three event types is never auto-suspended. Effort: S.

#### D-2 — Free-tier daily message cap is checked before moderation/crisis detection
**Evidence:** `server/src/services/chat/chat-session.ts:139-148` — the free-tier gate can early-return `free_limit_reached` strictly *before* the moderation gate at lines 150-187, which contains all L0-L3 and crisis handling. This is the single shared engine for REST (`chat.controller.ts`), WS text (`text-adapter.ts`), and voice (`voice-adapter.ts`).
**Scenario:** A free-tier user's 31st message of the day reads "I don't think I can keep going." The server never runs L0's crisis regex or any moderation at all — it returns `free_limit_reached`, the client shows a generic upgrade-prompt card, no 988 resources are surfaced, and no `safety_event` is logged.
**Remediation:** Run at minimum the L0 deterministic crisis pre-filter (cheap, no external call) *before* the free-tier gate, and let any detected crisis bypass the daily cap entirely. Add a regression test: a free-tier-exhausted user sending crisis-pattern content still gets the crisis reply and a logged safety_event. Effort: M.

---

### P1 detail

#### B-2 — Client REST calls have no timeout or AbortController
**Evidence:** `client/lib/api.ts:42-53` — a plain `fetch()` with no `signal`, no AbortController; confirmed zero timeout logic anywhere in `api.ts` or `live.ts`. Contrast the WS path's explicit 90s watchdog (`AppContext.tsx:889-899`).
**Scenario:** WS is down, so a turn falls back to REST (`AppContext.tsx:966-987`). If the server accepts the connection but the response never completes (Groq/Neon stall, cold Render instance, proxy black hole), `await backend.sendTurn(...)` never resolves or rejects — typing stays true, the message stays unresolved indefinitely, no tap-to-retry surface.
**Remediation:** Add an AbortController-based timeout (20-30s) to `api()` in `client/lib/api.ts`, rejecting with an `ApiError` so the existing failed-status UI path takes over. Effort: S.

#### B-7 — A bad migration crash-loops the single production instance with no dry-run gate
**Evidence:** `server/src/index.ts:20-45` runs migrations before `listen()` and `process.exit(1)` on failure; `render.yaml` is a single starter-plan instance with no autoscaling. `server/src/__tests__/setup.ts:9-23` defines `createTestDb()`, which *could* run the real migrations against PGlite (a real-Postgres-engine in-memory DB) — but grep confirms **zero call sites**; it's dead code. No CI step, `preDeployCommand`, or shadow-DB step touches the real migration SQL before it hits prod.
**Scenario:** A migration with a bug (bad SQL, constraint violation, missing extension) deploys; the process exits 1 on boot, Render restarts, the same broken migration re-runs and re-fails every restart — a full outage (healthcheck never comes up) until a human intervenes. A partially-applying multi-statement migration could also corrupt schema state for whichever instance is currently live.
**Remediation:** Wire the already-built `createTestDb()`/PGlite harness into a CI gate (or `drizzle-kit check`) that runs before the Render deploy triggers. Effort: M.

#### D-3 — Sexual/minors zero-tolerance blocks get no elevated response, no visible reporting pathway
**Evidence:** `moderation-engine.ts:121-127` gives sexual/minors verdicts the identical generic block shape as any other L2 block. `chat-session.ts:159-160` hardcodes `severity:'warning'` for this branch — vs. `severity:'critical'` two lines below for crisis. `autoSuspendIfNeeded` (`auth.service.ts:76-96`) folds it into the same flat 3-strike/30-day counter as any unrelated violation. Grep for NCMEC/CyberTipline/2258A across the repo returns zero hits — no external-reporting mechanism exists anywhere in the codebase. `docs/specs/moderation-pipeline.md` §4 explicitly specifies "no escalation band, drop session + log + report" for this category.
**Scenario:** A user repeatedly probes the sexual/minors boundary; each hit is silently blocked and counted identically to any unrelated rule violation rather than triggering an immediate, human-reviewed account action — and if any legal reporting duty attaches, there is currently no pipeline to fulfill it.
**Remediation:** Code: give sexual/minors verdicts a distinct high-severity path (`severity:'critical'`, dedicated fast-lane review, consider suspend-pending-review). **Legal: get counsel to confirm whether 18 U.S.C. §2258A or state equivalents attach to this product's text-only detections before launch** — this is a sign-off dependency, not a guessable code decision. Effort: L (code) + legal timeline (unknown).

#### E-1 — `PATCH /account/reactivate` is dead code
**Evidence:** `clerk.middleware.ts:69-72` (`requireAuth`) 403s `ACCOUNT_SUSPENDED` whenever `status !== 'active'`. The reactivate route (`compliance.ts:44`) is mounted behind `requireAuth`, so its own handler logic — reachable only when `status === 'deleted'` — can never execute; requireAuth already rejected that exact request one middleware earlier. `client/app/(auth)/login.tsx`'s `handleReactivate()` awaits the call with no try/catch, so the thrown `ApiError` propagates uncaught. `client/lib/mock.ts`'s client-only mock never talks to the real server route, so mock-mode UI testing (the project's default dev/verify-ui mode) structurally cannot surface this — it only breaks in live mode.
**Scenario:** A user soft-deletes their account, signs back in within the 30-day grace window intending to undo it. The reactivate offer sheet shows, they tap Reactivate, the PATCH is rejected 403 before the handler's own logic runs, the rejection is unhandled, and the account stays deleted until `enforceGraceExpiry()` hard-purges it — the user's stated intent to keep their account is silently defeated.
**Remediation:** Give the reactivate route an auth variant that only validates the Clerk session + local-user lookup without the active-status gate (or narrowly allow `status === 'deleted'` on this one route). Add a real integration test that drives `DELETE /account` then `PATCH /account/reactivate` through the actual middleware stack. Effort: S.

#### E-2 — GDPR/CCPA data export never delivers anything to the user
**Evidence:** `client/constants/content/account.ts:44` promises: "We'll email a download link to {email} when it's ready." `server/src/routes/compliance.ts:69-97` (`GET /account/export`) builds the full data bundle and returns it **synchronously in the HTTP response** — never queues a job or sends an email. `client/lib/live.ts:366-369` (`requestDataExport()`) discards the returned bundle entirely. `client/app/account.tsx:32-36` fires the request and shows a toast implying delivery, with an in-code comment stating "the server emails the link" — which is false. Repo-wide grep for any email vendor (sendgrid/postmark/resend/nodemailer/ses/mailgun/smtp) returns zero real matches — **no code path anywhere in the repo can email anything to anyone.**
**Scenario:** A user exercises their GDPR Art. 15 / CCPA right-to-know. The server does real DB work and generates the full bundle — then it goes nowhere. The user sees a toast promising an emailed link and never receives one. A data-subject-access-request appears fulfilled in the UI but factually is not.
**Remediation:** Either wire a real transactional-email provider + async job, or — faster for v1 — change both the copy and the client flow to synchronously present/share the already-fetched JSON bundle via the native share sheet instead of promising an email that can't be sent. Effort: M.

#### E-3 — Tiered safety_events content-scrub described in policy doesn't exist in code
**Evidence:** `docs/compliance/data-retention-policy.md:83-104` specifies a 3-tier model (T1 raw ~90d, T2 redacted 6-12mo, T3 write-time scrub) plus a separately-retained-long de-identified metadata layer; `docs/compliance/privacy-policy-draft.md:83,125` promises the same to end users verbatim. Actual code: `server/src/services/chat/safety-logging.ts:37-48` writes `flaggedContent` **unconditionally** for every event regardless of severity. `server/src/services/retention.ts:24,67-74` is the *only* retention job — a flat `RETENTION_DAYS_SAFETY_EVENTS = 365`-day cutoff that deletes the **whole row** (metadata included), with no tiering concept at all.
**Scenario:** A routine, low-confidence flag (`severity='info'`) should per policy never store raw content, or only briefly. Instead the full flagged text sits in plaintext for a year, then the entire row — including the metadata the policy says should be retained *long* for trend analysis — is deleted outright. This is the exact outcome the policy doc says its tiering was designed to avoid, and a direct contradiction of the user-facing privacy-policy promise.
**Remediation:** Add a severity/tier signal at write time (skip/scrub `flaggedContent` for low-tier events), add a distinct content-scrub job that nulls `flagged_content` per-tier window while leaving the metadata row intact, and stop deleting whole rows via the blanket 365-day purge. Exact day-counts need counsel sign-off, but the tiering *mechanism* is a pure code gap. Effort: M.

#### F-2 — 9 of 12 gallery personas are silent on voice calls with no "unavailable" UI state
**Evidence:** `voice-session.ts:43-51` (`getVoiceId()`) returns `undefined` for all personas except aurora/orion/lyra; `open()` (lines 74-79) returns early without generating filler clips for uncast personas; `synthesizeReply()` throws (lines 97-101); `voice-adapter.ts:39-56` catches the throw and falls back to `nextFillerClip()`, which itself is empty for uncast personas — so **zero audio frames** are ever sent, only the `voice_caption` text frame. `client/app/voice-call.tsx` and the call entry point (`chat/[id].tsx:263`) have no branch checking cast status.
**Scenario:** A user picks one of the 9 non-anchor personas and starts a voice call. The UI proceeds normally through Connecting → Listening → Speaking, captions may appear, but zero audio ever plays with no explanation whatsoever — reads as a broken call for 75% of the marketed persona gallery, not a known scope limitation.
**Remediation:** Cast all 9 remaining personas before v1, or ship a "voice coming soon" UI state (client knows via a persona field which voices are cast; grey out/hide the call entry point or show an explicit message). Effort: M. See launch-scope recommendation in Q&A (4b).

---

## 4. Direct answers to Jason's questions

### (a) Apple Developer account — the full dependency chain it unblocks

`docs/GO-LIVE.md`'s Gates 0-6 never name Apple Developer Program enrollment as its own gate (**F-1** — grep across `GO-LIVE.md` and `todos.md` for "Apple Developer"/"App Store Connect"/"TestFlight"/"export compliance"/"ATT" returns nothing), but nearly every later gate is transitively blocked by it:

1. **StoreKit IAP product creation** — RevenueCat's dashboard cannot configure real offerings without matching products already existing in App Store Connect. `client/lib/env.ts:30-31`'s `RC_PRODUCT_MONTHLY`/`RC_PRODUCT_YEARLY` reference product IDs that must be created in ASC first — this is Gate 0's RevenueCat line item, silently blocked.
2. **Code signing** — a release archive needs a Distribution certificate + provisioning profile issued from the Apple Developer account. `client/app.json` already has `ios.bundleIdentifier: com.aura.ai.companion` set, but no certificate/profile can be generated without the account.
3. **Production APNs key** — Gate 1's `APNS_KEY_FILE`/`APNS_KEY_ID`/`APNS_TEAM_ID` vars (currently empty) can only be generated from an active developer account's keys section.
4. **App Store Connect app record + TestFlight access** — required before any build can be distributed for internal testing or submitted for review.
5. **App Privacy "nutrition label" questionnaire, age rating, export-compliance answers** — filled out in ASC metadata, not in code; based on the app's actual data flows (chat content including crisis/self-harm-adjacent text, device push tokens, RevenueCat purchase data, and third-party sharing with Groq/OpenAI/Inworld) this questionnaire needs to be answered carefully and truthfully, or it's a direct App Review rejection risk.
6. **Publicly-hosted privacy policy + terms URLs** — App Review requires a public URL, not the in-app `client/app/privacy.tsx` route; the current drafts (`docs/compliance/*.md`) need a real hosting plan.

**Call:** treat Apple Developer Program enrollment as its own "Gate -1," start it in parallel with the P0/P1 code fixes today — it has a 24-48h+ review lag and every other account-side item queues behind it.

### (b) The 9 avatars/voices + the 3 broken anchor voice IDs

**Root cause (anchors):** `server/.env`'s `INWORLD_VOICE_ID_AURORA`/`ORION`/`LYRA` are invalid — they look like unsaved voice-design drafts in the Inworld portal, not published voice IDs ("Unknown voice" errors). This is a **credentials/portal problem, not a code bug** — sessions run fine, they just produce no audio. Stock voices (Ashley/Edward/Olivia) work today as env-override stand-ins, confirming the pipeline itself is sound.

**Root cause (9 gallery personas):** two separate, independent gaps —
- **Portraits**: exist on an unmerged `test-results` branch; need QA against `docs/specs/companion-gallery-identities.md` then merging into `client/components/companion/portraits.ts`. Until merged, these personas render a duotone monogram fallback (cosmetically fine, but not the intended art).
- **Voices**: not yet cast in the Inworld portal at all — this is explicitly an owner (Jason) casting decision, not an engineering task. `getVoiceId()` correctly returns `undefined` for all 9 (**F-2**), and the code path correctly no-ops/throws-and-catches rather than crashing — the *code* handles the absence gracefully. What's missing is a **UI signal** telling the user this is a known gap rather than a broken call.

**Code-readiness:** fully ready on both counts. Wiring a real Inworld voice ID for the anchors, or a real portrait/casting decision for the 9, is a config/content change, not an engineering rebuild.

**Launch-scope call:** don't ship all 12 personas with 9 silently broken on voice and monogram-faced. Recommended: **ship 3 fully-cast anchors (Aurora/Orion/Lyra) as the headline gallery, with the remaining 9 visibly marked "more companions coming soon"** (locked cards, no chat/voice entry point) rather than exposing a broken-looking half-finished gallery. This converts a "looks broken" App Review and user-trust risk into a legible "curated + expanding" narrative, and buys time to cast voices/portraits post-launch without blocking submission. Do this **in addition to**, not instead of, building the F-2 "voice coming soon" UI state — it's cheap insurance either way.

### (c) Domain vs. Render webhooks — definitive recommendation

**A custom domain is not needed to launch.** Specifically verified:
- `*.onrender.com` gets a valid TLS certificate automatically — no manual cert work.
- Render's Starter plan (already selected in `render.yaml`) does not spin down/cold-start, so there's no "wake-up latency" argument for a custom domain either.
- Clerk's webhook verification (`server/src/webhooks/clerk.ts`) uses **HMAC (svix) signature verification**, not domain allow-listing — works identically against any HTTPS host.
- RevenueCat's webhook scheme is an **echoed Authorization header**, not domain-bound — also works identically against `onrender.com`.
- App Review does not require a branded API host; only the App Store Connect metadata (privacy policy/terms URLs) needs to be a real public URL, which can itself be hosted anywhere (doesn't need to share a domain with the API).

A custom domain would buy nicer optics if a technically-savvy user inspects network traffic, and insulation from re-pointing every client build if you ever migrate hosting providers — but it buys **nothing functionally that Render's default domain doesn't already provide**.

**Recommendation: nice-to-have, not a blocker.** Ship v1 on `*.onrender.com`; the only actual pre-launch action item here is re-pointing the RevenueCat dashboard webhook from the dev tunnel to the real prod Render URL (already tracked as a known blocker) — a URL change, not a domain purchase.

### (d) Info-security gaps

- **`@clerk/clerk-expo` (client, runtime dependency) is high-severity vulnerable** — installed 5.61.3 falls in the flagged range `>=2.2.11 <=2.19.35` (patched `>=2.19.36`); advisory covers a Clerk authorization-bypass when combining organization/billing/reverification checks. Aura's client uses Clerk purely for auth, which narrows (but per the recon health-audit note does not fully eliminate) the blast radius — **upgrade this dependency before launch**, it's a routine `pnpm --dir client exec expo install` version bump, not a code change.
- **C-2**: companion create/restore cap check is read-then-write with no lock (`companions.ts:65-91`, `:240-253`) — a scriptable client can fire concurrent requests and exceed the documented 5/15 active or 20/50 total caps. Low financial impact (soft business limit, not a security boundary) but a real, trivially-exploitable gap in the app's stated "anti-abuse backstop."
- **C-1**: the one test guarding against a RevenueCat sandbox-purchase-in-production event flipping a real user's `isPremium` to true for free asserts identical outcomes in both accept/reject branches — it currently cannot catch a regression in that guard. The guard itself is live and correct in production today (`render.yaml` confirms `NODE_ENV=production` is genuinely set), but this is exactly the kind of test that gives false confidence right up until a refactor silently breaks real-money entitlement logic.
- **E-4**: Clerk's `user.deleted` webhook (`clerk.ts:120-124`) performs an immediate, unaudited hard-purge (`auth.service.ts:53-57`, bare `db.delete()`) that bypasses the documented 30-day recoverable grace period and writes no `deletion_audit` row — unlike the sanctioned soft-delete path. If support ever deletes a user directly from the Clerk Dashboard (e.g. for an urgent legal erasure demand) instead of going through the app's own flow, there's no proof-of-erasure record for that deletion.
- **B-6**: raw internal exception messages ride the wire verbatim on chat's `internal_error` path (`chat-session.ts:334`), bypassing the central error-handler's sanitization — no live UI leak today (client discards the field), but a direct API/WS caller (proxy inspection, a future web client) would see raw internal error text.
- No ad-tech/analytics/tracking SDKs found anywhere (clean bill) — App Tracking Transparency is correctly not triggered.

### (e) Error-handling gaps

Error handling is well-disciplined in the core paths (centralized Express error-handler, fail-closed moderation at every layer, DB pool timeouts, atomic job-claiming, WS reconnect with exponential backoff + REST fallback, root React error boundary). The gaps that remain:
- **B-1** (P2): REST chat bypasses the global Groq concurrency limiter (turn queue) that every WS turn respects — a WS-outage-driven stampede onto REST is unthrottled by anything beyond per-user rate limits.
- **B-2** (P1): no client-side HTTP timeout — a hung REST response wedges the UI indefinitely, unlike the WS path's explicit 90s watchdog.
- **B-3** (P2): no server-side timeout on the Inworld TTS call — a hung synthesis call stalls an entire voice turn with no fast, graceful fallback.
- **B-4** (P2): WS pings are sent but pongs are never verified — dead sockets and their VoiceSession objects leak until the underlying TCP socket eventually times out.
- **B-5** (P2): documented voice silence-timeout constants (`VOICE_SILENCE_PROMPT_TIMEOUT_S`/`VOICE_SILENCE_END_TIMEOUT_S`) exist in `@aura/shared` but are wired nowhere — a call can sit open indefinitely with the mic live.
- **B-7** (P1): a bad migration crash-loops the single production instance with no dry-run gate.
- **B-8** (P2): `GET /companions/:id/messages` has no pagination — unbounded payload/query growth for long-lived heavy users.

### (f) Other gaps he wasn't aware of

- **E-1**: the documented 30-day account-reactivation grace window is unreachable in code today — a shipped, user-facing recovery flow silently doesn't work in live mode (mock mode structurally hides this from routine UI testing).
- **E-2**: GDPR/CCPA data export builds the real bundle server-side but has zero email-delivery mechanism anywhere in the repo; the client discards the response and shows a toast implying delivery that never happens.
- **E-3**: the retention policy doc promises tiered content-scrub; the actual code is a flat 365-day full-row delete that both over-retains raw content and destroys the long-retained metadata the policy says it needs.
- **D-3**: sexual/minors zero-tolerance detections get identical generic handling to any other rule violation, with zero external-reporting infrastructure (NCMEC/2258A) anywhere in the repo — this needs a legal answer before v1, not after an incident.
- **F-3** (UNVERIFIED): iOS entitlements may hardcode `aps-environment=development` with no visibly verified production-flip mechanism given the project builds via a local `xcodebuild` workaround rather than EAS Build (which normally auto-selects this per build profile). Needs a direct check (`codesign -d --entitlements :-` on the first release archive) before submission.
- Test-suite blind spots let real regressions ship green in two places: **C-1**'s vacuous sandbox-guard test, and the account-reactivate IDOR test (`E-1`) that never actually executes the guarded route through real middleware.

---

## 5. Prioritized remediation roadmap

### P0 — must fix before any launch (eng, ~2-3 days combined)
| item | owner | effort |
|---|---|---|
| D-2: reorder crisis pre-filter ahead of free-tier gate; let crisis bypass the cap | eng | M |
| D-1: scope auto-suspend counter to user-attributable event types only | eng | S |

*(These two unblock nothing else technically, but are the two items that make NO-GO into GO-WITH-CONDITIONS — they should land first, together, with a regression test for each per their own remediation notes.)*

### P1 — must fix or explicitly re-scope before launch (eng + ops + legal in parallel, ~1-2 weeks combined incl. lead times)
| item | owner | effort | sequencing note |
|---|---|---|---|
| Apple Developer Program enrollment | ops | — (24-48h+ lag) | start immediately, unblocks all Apple-side items below |
| Groq paid Developer tier | ops | — | start immediately, hard functional blocker |
| OpenAI credits funded | ops | — | unblocks two-vendor moderation design + eval gate |
| 3 anchor Inworld voice IDs republished | ops | — | needed before any voice-call QA pass |
| Neon Launch plan + Clerk/RevenueCat prod projects + webhook re-pointing | ops | — | sequence after Apple enrollment confirms bundle ID/product IDs |
| E-1: unblock reactivate route from requireAuth's active-only gate | eng | S | independent, can land anytime |
| E-2: ship native share-sheet export (or wire real mailer) | eng | M | independent |
| E-3: implement or re-document tiered safety-event scrub | eng | M | needs legal input on final windows, mechanism can land first |
| D-3: sexual/minors severity escalation (code) | eng | S | pair with legal reporting-duty answer |
| F-2: "voice coming soon" UI / narrow launch scope to 3 anchors | eng | M | decide launch scope first (product call), then build |
| B-2: client REST timeout/AbortController | eng | S | independent |
| B-7: migration dry-run CI gate (wire up existing dead `createTestDb()`) | eng | M | should land before any prod deploy, not just before launch |
| Legal sign-off: retention windows, SB 243 copy, age-gate copy, crisis copy, reporting duties, published privacy/terms URLs | legal | — | start immediately, likely the longest pole |
| Eval GO/NO-GO gate run + signed | ops/eng | — | needs OpenAI credits first |

### P2 — should fix before or shortly after launch (eng, bounded effort)
| item | owner | effort |
|---|---|---|
| B-1: wrap REST chat turn in the shared turn-queue | eng | S |
| B-3: Inworld TTS call timeout | eng | S |
| B-4: WS pong-liveness reaping | eng | S |
| B-5: wire voice silence-timeout constants | eng | M |
| B-6: sanitize chat's internal_error detail | eng | S |
| B-8: paginate messages endpoint | eng | M |
| C-1: fix vacuous RC sandbox-guard test | eng | S |
| C-2: lock companion cap check (advisory lock) | eng | S |
| E-4: route Clerk-webhook hard-delete through the audited purge helper | eng | S |
| F-1: add explicit "Gate -1: Apple Developer Program" to GO-LIVE.md | eng/ops | S |
| F-3: verify `aps-environment=production` on first release archive | ops | S |

*(P3 items — C-3, C-4, D-4, D-5, F-4, F-5 — are low-risk hygiene/doc-drift items; batch them into a post-launch cleanup pass, no sequencing dependency on anything above.)*

---

## 6. Appendix

### Commands + results from Recon
- **Tests**: root vitest run — **641 passed, 2 skipped, 0 failed** (643 total, 58 test files), completed clean in ~3.7s. One expected "Unexpected crash" stack trace and several moderation-degraded WARN/ERROR log lines in output are intentional fixture assertions within `errors.test.ts`/`consolidation.test.ts` (test names show pass), not real failures. **Note:** test-count citations drift across docs (496/528/526/540/634/643/633 at various dates) — treat any single number as a point-in-time snapshot; whoever verifies next should re-run rather than trust a cited count.
- **Audit**: 1 actionable, prod-reachable finding — `@clerk/clerk-expo` (client) high-severity vulnerable, installed 5.61.3 in flagged range `>=2.2.11 <=2.19.35` (patched `>=2.19.36`); Clerk authorization-bypass advisory (org/billing/reverification checks combined). Aura uses Clerk for auth only, narrowing but not eliminating relevance.
- **File/directory presence**: all SERVER_MAP and CLIENT_MAP paths cited in this report confirmed present on disk during recon (routes, middleware, services, websocket, lib, db/schema, client app/lib/constants trees).

### UNVERIFIED items + what's needed to confirm
- **F-3** (iOS entitlements `aps-environment`): needs `codesign -d --entitlements :-` run against the first release-configuration archive to confirm the production flip actually happens; the project's local `xcodebuild` workaround (vs. EAS Build) doesn't auto-manage this the way EAS profiles would.
- **F-5** (`client/app.json` `replit.com` origin): almost certainly harmless prototype-era dead config (web-export-only setting, app ships iOS-only) — needs a one-line confirmation from Jason that no web target is planned, then delete.
- **Render restart policy** for a crashed starter-plan service (immediate/unlimited retries vs. backoff) — changes B-7's exact blast radius; worth a direct question to Render docs/support rather than assuming.
- **OpenTelemetry/core baggage-propagation** memory issue flagged in the recon health-audit — marked UNVERIFIED pending a dedicated read of `server/src/lib/observability.ts`; specifically whether external baggage headers are ever trusted.
- **Neon connection-pooling behavior** (PgBouncer-style) under a real prod network partition — code-level pool config (`connectionTimeoutMillis`, `statement_timeout`) is sound, but Neon-specific proxy behavior during an outage wasn't independently confirmed.
- **RevenueCat dashboard webhook event-type selection** — whether TRANSFER/PRODUCT_CHANGE are actually enabled in the RC dashboard determines how relevant C-3 is; this is dashboard config outside this read-only pass.

### Legal-sign-off dependencies handed to counsel
- Exact data-retention windows for `safety_events.flagged_content` (T1/T2/T3 day-counts per the internal policy doc) — the tiering *mechanism* is a confirmed code gap (E-3), but the actual numbers need counsel, not engineering judgment.
- Whether AURA's sexual/minors zero-tolerance detections (text-only) trigger an 18 U.S.C. §2258A / NCMEC mandatory-reporting duty, or any state equivalent (D-3) — this determines whether a reporting pipeline is a launch blocker or a post-launch item.
- SB 243 AI-disclosure copy, age-verification/age-gate copy, and crisis-resource copy — implementation cadence/mechanics are confirmed correct in code; the actual wording is explicitly marked "do not guess" by the team and needs counsel review before shipping.
- Served jurisdictions (which US states/territories AURA can legally operate in at v1, given the 18+-only, US-first scope) — not something engineering can determine from the codebase.
- Public hosting plan and final legal review for the privacy-policy and terms-of-service drafts (currently `docs/compliance/*.md`, not yet publicly hosted) — required for App Store Connect submission metadata.
