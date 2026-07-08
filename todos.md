# What stands between `redesign` and v1.0

> Living checklist, updated 2026-07-08 after the live-mode pass + WS-streaming + voice arcs
> (session record: `docs/redesign/fable5-rebuild-notes.md` 2026-07-07/08 entries +
> `docs/CHANGELOG.md`). Everything below is OPEN; done work lives in those logs, not here.

## Jason-only (credentials & dashboards)

- [ ] **Inworld voice ids** — all three `INWORLD_VOICE_ID_*` in `server/.env` are invalid
      (Inworld 404 "Unknown voice"; they look like unsaved voice-DESIGN draft ids). Save/publish
      the three designs in the portal and paste the SAVED ids. Until then the server runs only
      with stock-voice env overrides (e.g. `INWORLD_VOICE_ID_ORION=Edward pnpm dev`).
- [ ] **APNs credentials** — `APNS_KEY_FILE` (.p8), `APNS_KEY_ID`, `APNS_TEAM_ID` are empty in
      `server/.env`. Client + server push are fully wired and verified up to the send; this is
      the only missing piece for actual delivery.
- [ ] **OpenAI prepaid credits** — the org 429s on `omni-moderation` (card on file isn't
      enough). Moderation currently runs the Groq-safeguard degraded path on every turn
      (works, logged + metered as `moderation.l2/l3_degraded`). Also blocks the eval gate below.

## Content & casting

- [ ] **9 gallery portraits** — art exists on the `test-results` branch; QA the batch-3 set
      against `docs/specs/companion-gallery-identities.md`, merge, add the nine to
      `client/components/companion/portraits.ts` (pipeline: `docs/redesign/companion-avatar-pipeline.md`).
      Until then those personas render the duotone monogram fallback.
- [ ] **9 gallery voice castings** (owner decision 2026-07-08: before v1.0 release) — cast in
      the Inworld portal, extend `getVoiceId` / env beyond the three anchors. Uncast personas
      are silent on calls today.

## Process gates

- [ ] **Eval GO/NO-GO** — run `pnpm eval` / `eval:gen` / `eval:persona` (server/, real Groq)
      once OpenAI credits land; assemble per `docs/testing/eval-report-layout.md`; Jason signs
      the GO/NO-GO (`docs/planning/post-v1.0-roadmap.md` calls it the last gate before ops).
- [ ] **GO-LIVE checklist** — `docs/GO-LIVE.md` gates 0–6 (App Store assets, prod
      Clerk/RC/Render config, webhook re-pointing, legal counsel on the compliance drafts).
      None of it is code; all of it is unchecked.

## Engineering (small, known, non-blocking)

- [ ] "Voice coming soon" state for uncast personas — the call currently opens and listens
      but the companion is silent (server sends no audio when `getVoiceId` is undefined).
- [ ] Duplicate `voice_start` possible while the shared socket is dialing (idempotent
      server-side; cosmetic duplicate `voice_ready`).
- [ ] Voice silence timers — `VOICE_SILENCE_PROMPT_TIMEOUT_S` / `VOICE_SILENCE_END_TIMEOUT_S`
      exist in `@aura/shared` but nothing implements them; the client keeps listening forever.
- [ ] Transcript pagination — `GET /companions/:id/messages` returns the whole thread; an old
      companion's payload grows unbounded (watch item; fine at demo scale).
- [ ] Mock reply banks cover only the 3 anchors — the 9 gallery personas answer in the generic
      `custom` voice in mock mode (demo blemish only).

## Post-v1.0 (explicitly deferred)

- Barge-in / resume-after-interrupt on voice (spec §3 as-built note); WS `busy` back-pressure
  frames; client-driven silence prompts UX; the full roadmap lives in
  `docs/planning/post-v1.0-roadmap.md`.
