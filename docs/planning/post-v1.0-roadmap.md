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
- **Vendors:** ElevenLabs / Cartesia (expressive, per-companion voices mapped to the warmth/energy/
  verbosity traits); Groq also offers TTS.

### Companion voice call (real-time conversation) — 🧊 🔗

A live, turn-taking voice "call" with a companion — distinct from push-to-talk voice messages (this is
Tier 2/3 from the voice-feasibility research).

> **Research + spike plan:** [realtime-voice-call-research.md](realtime-voice-call-research.md) — framework
> decided (**LiveKit Agents, Node SDK**), streaming-moderation design, Render + LiveKit-Cloud hosting,
> cost runway, and TTS vendor options. Scoped as a 2-week flag-gated spike; TTS vendor still open.

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

---

## (add future deferred features below)
