# What stands between `redesign` and v1.0

> Living checklist, updated 2026-07-10 after the audit-remediation pass (all P0/P1 code findings
> fixed — `docs/CHANGELOG.md` 2026-07-10) and the full voice casting (12/12, `docs/specs/
> voice-casting-guide.md`). Everything below is OPEN; done work lives in the logs, not here.

## Jason-only (credentials & dashboards)

- [ ] **APNs credentials** — `APNS_KEY_FILE` (.p8), `APNS_KEY_ID`, `APNS_TEAM_ID` are empty in
      `server/.env`. Client + server push are fully wired and verified up to the send; this is
      the only missing piece for actual delivery. (Blocked behind the Apple Developer account.)
- [ ] **Apple Developer Program enrollment** ("Gate -1") — blocks StoreKit IAP products (RevenueCat
      can't configure offerings without them), code signing, prod APNs key, TestFlight, App Store
      Connect record + privacy labels. 24–48h+ review lag; start before everything else.
- [ ] **OpenAI prepaid credits** — the org 429s on `omni-moderation` (card on file isn't
      enough). Moderation currently runs the Groq-safeguard degraded path on every turn
      (works, logged + metered as `moderation.l2/l3_degraded`). Also blocks the eval gate below.

## Client phase (next up — the remaining code work)

- [ ] **Sim-verify the 12 portraits** — all wired in `portraits.ts` (2026-07-10); needs a relaunch
      pass on the sim (`/verify-ui`), never verified on device.
- [ ] **Voice clip re-audition** — rerun the changed personas per the casting guide's §Rerun list
      (`pnpm voices:audition -- soren eli thea wren` + verify Folake/Yoona ids resolve). Uses the
      TTS budget; owner-reviewed.
- [ ] **Data-export share sheet + copy** (E-2 client half) — fetch the (already rate-limited)
      bundle, write JSON, present the iOS share sheet; replace the "we'll email a link" copy.
- [ ] **Selene playback gain** — the voice reads quiet; Inworld has no synth-time gain, so this is
      a native client boost (AVAudioEngine), per-persona for the quiet voices.
- [ ] Look-customization reskins (appearance variants) — separate future session.

## Process gates

- [ ] **Eval GO/NO-GO** — run `pnpm eval` / `eval:gen` / `eval:persona` (server/, real Groq)
      once OpenAI credits land; assemble per `docs/testing/eval-report-layout.md`; Jason signs
      the GO/NO-GO (`docs/planning/post-v1.0-roadmap.md` calls it the last gate before ops).
- [ ] **GO-LIVE checklist** — `docs/GO-LIVE.md` gates 0–6 (App Store assets, prod
      Clerk/RC/Render config, webhook re-pointing, legal counsel on the compliance drafts).
      None of it is code; all of it is unchecked.
- [ ] **Legal sign-off items** — retention windows + the two documented E-3 divergences
      (injection→T3, no pseudonym-key layer), SB 243/crisis/age-gate copy, NCMEC/§2258A duty
      question (D-3), publicly hosted privacy + terms URLs. Handoff list:
      `docs/audits/2026-07-09-v1-production-readiness.md` §6.

## Engineering backlog (P2s from the audit — before or shortly after launch)

- [ ] B-1: REST chat turn bypasses the shared Groq turn-queue (WS respects it).
- [ ] B-3: no timeout on the Inworld TTS call.
- [ ] B-4: WS pings sent but pongs never verified — dead sockets linger.
- [ ] B-5: voice silence timers (`VOICE_SILENCE_*` in `@aura/shared`) still wired nowhere.
- [ ] B-6: chat's `internal_error` path sends raw exception text (client discards it today).
- [ ] B-8: transcript pagination — `GET /companions/:id/messages` returns the whole thread.
- [ ] C-1: RC sandbox-guard test is vacuous (asserts same outcome both branches).
- [ ] C-2: companion-cap check is read-then-write (concurrency race; advisory lock).
- [ ] E-4: Clerk `user.deleted` webhook hard-purges immediately (bypasses grace + audit row).
- [ ] Duplicate `voice_start` while the shared socket is dialing (cosmetic duplicate `voice_ready`).
- [ ] Mock reply banks cover only the 3 anchors (mock-mode demo blemish only).

## Post-v1.0 (explicitly deferred)

- Barge-in / resume-after-interrupt on voice (spec §3 as-built note); WS `busy` back-pressure
  frames; client-driven silence prompts UX; the full roadmap lives in
  `docs/planning/post-v1.0-roadmap.md`.
