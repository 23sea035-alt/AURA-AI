# Post-v1.0 Roadmap — Deferred Features

Living backlog of features intentionally scoped **out of v1.0** to keep the release tight. Each
entry records what it is, why it was deferred, and what scaffolding already exists, so a future
session can pick it up cleanly. **Add deferred ideas here** rather than letting them live only in
chat history.

Status legend: 🔜 next-up after v1.0 · 🧊 parked (revisit when a trigger hits) · 🔗 has scaffolding already in the repo

---

## Voice

### AI voice replies (TTS read-back) — 🔜 🔗

The companion speaks its replies aloud (text → TTS → audio), not just the user dictating in. Deferred
from the Tier-1 push-to-talk work; user input STT ships in v1.0, AI talk-back does not.

- **Decided design (do not relitigate):** text stays canonical (`Message.content`); voice is a
  *rendering* of it. Modality policy = **mirror the user** (user spoke → reply auto-plays; user typed
  → text with a quiet tap-to-play), with a global override in `voice-preferences`
  ("Companion replies aloud: Always / Match me / Never"). The model never chooses modality — it's a
  deterministic UX policy. TTS is generated **lazily and cached** to the message's `audioUri`. The
  crisis / `CrisisSupport` card always renders **visually** regardless of modality (never let 988/741741
  resources exist only as audio that scrolls away).
- **Why deferred:** keeps v1.0 voice scope to user-input STT only.
- **Already in place:** the `Message` model carries `audioUri` + `inputModality` (added with
  push-to-talk); `voice-preferences.tsx` is the home for the toggle; one `MessageBubble` already
  renders text and can carry an audio affordance.
- **Vendors:** ElevenLabs / Cartesia / Inworld (expressive, per-companion voices mapped to the warmth/energy/
  verbosity traits); Groq also offers TTS. **2026-07-02 — as-built: Inworld TTS 2** (`inworld-tts-2`) is the
  chosen TTS provider (`INWORLD_API_KEY` / `INWORLD_VOICE_ID_*` in `env.ts`). *(Supersedes the earlier
  2026-06-30 "Cartesia" pick; Cartesia/Deepgram/LiveKit were removed. The `/api/voice/tts` endpoint no
  longer exists — TTS audio is delivered over binary WebSocket frames.)*

### Companion voice call (real-time conversation) — 🔜 🔗

A live, turn-taking voice "call" with a companion — distinct from push-to-talk voice messages (this is
Tier 2/3 from the voice-feasibility research).

> **2026-07-02 — partial backend.** The voice stack was reworked to **binary WebSocket frames + Inworld
> TTS 2 (`inworld-tts-2`) + Groq Whisper STT** (LiveKit/Cartesia/Deepgram removed; `/api/voice/token` +
> `/api/voice/tts` deleted). The Inworld/Groq clients and the `voice_usage` metering table exist, but the
> **end-to-end audio path is not yet wired** (WS handler drops binary frames; `/voice/start`+`/stop` not
> implemented; metering not recorded). Only `GET /api/voice/limits` is live. **TTS = Inworld, STT = Groq.**

> **Research + spike plan:** [realtime-voice-call-research.md](realtime-voice-call-research.md) — framework
> decided, streaming-moderation design, cost runway, and TTS vendor options. **As-built superseded the
> research:** transport = binary WebSocket frames (no LiveKit), TTS = **Inworld TTS 2**, STT = **Groq Whisper**.

- **What it is:** continuous mic + voice-activity-detection + streaming STT → LLM → streaming TTS, with
  barge-in (interrupt). Optionally via a managed realtime stack (Vapi / Retell / LiveKit / Pipecat /
  ElevenLabs Conversational AI) pointed at our own Claude/Groq brain.
- **Why deferred:** materially harder than push-to-talk. The two blockers are (1) latency tuning
  (~<800ms round-trip) and (2) the real one — **real-time moderation of speech** for a
  mental-health-adjacent companion: the 988/crisis path must hold inside a streaming loop, not just
  the turn-based text pipeline. Per-minute cost also adds up over long companion sessions.
- **Already in place:** `app/voice-call.tsx` + `app/voice-preferences.tsx` exist (cosmic-era UI, kept
  but currently **orphaned** — no nav entry, fall back to system fonts). They're the eventual home;
  they need the Warm Sanctuary redesign port + a real entry point.
- **Models:** keep Claude/Groq as the text brain (Claude has no native audio I/O). Use a fast LLM tier
  for the loop — Haiku 4.5 / Sonnet 4.6, or Opus 4.8 Fast Mode.

### STT engine upgrade: on-device → Groq Whisper — 🧊

v1.0 push-to-talk uses **on-device** STT (`expo-speech-recognition`: free, private, live partial
transcripts). If transcription quality on real companion speech (accents, background noise, long
rambling messages) or **Android parity** disappoints in testing, swap the single "audio → text" call
for a **server-side Groq `whisper-large-v3-turbo`** endpoint (~$0.0006/min ≈ $30 per 100k 30-second
messages, ~220× real-time). Because text is canonical, nothing downstream (moderation, memory, the
bubble UI) changes. **Never put the Groq key on the client** — it must be a backend endpoint.

> **2026-07-02 note:** the as-built voice path uses **Groq Whisper (`whisper-large-v3-turbo`, batch)** for
> STT on both push-to-talk and the (not-yet-wired) call loop — the hybrid Apple-VAD design sends complete
> utterance chunks, so batch STT suffices and no streaming-STT vendor (Deepgram) is used.

---

## (add future deferred features below)

---

## Triage from archived plans (2026-07-07)

When `planning/backend-fixlist-v1.md` and `planning/v1-tasklist.md` were archived, their remaining
unchecked boxes were audited: nearly all were verified **done or superseded** (coverage thresholds
enforced in `vitest.config.ts`; the L0–L3 moderation stack shipped; Metro resolves `@aura/shared`;
SSO buttons shipped via Clerk; the "silent local-user fallback" became the deliberate
`DEV_USE_MOCKS` seam). Two genuinely-open items survive:

### Pre-release eval sign-off — 🔜
Run the full eval suite (`pnpm eval`, `eval:gen`, `eval:persona`) against the release candidate and
record a GO/NO-GO per dimension (safety FN=0, persona, memory, payments). This is the last gate
before the [GO-LIVE checklist](../GO-LIVE.md) ops steps — it was the final phase of the archived
fixlist and has no standing owner since.

### Live-mode route guard for `(tabs)` — 🧊 🔗
In live mode, an unauthenticated boot currently relies on `hydrate()` returning null →
`setUser(null)` → welcome redirect. A hard `useAuth()`-style guard on the `(tabs)` group would make
the invariant structural instead of behavioral. Scaffolding: `lib/clerk.ts` exposes
`clerkHasSession()`. Revisit when live-mode testing resumes.
