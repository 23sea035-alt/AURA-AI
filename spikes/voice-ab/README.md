# Voice A/B harness

Synthesize the **same sample lines** across the 4 candidate TTS providers, write the audio + a
scorecard, and measure first-audio latency — so you can blind-listen and pick on **quality + expression**.

Spike tooling for [`../../docs/planning/realtime-voice-call-research.md`](../../docs/planning/realtime-voice-call-research.md)
(§5a config, §5b plan). **Not shipped code:** lives outside the pnpm workspace, has **zero npm
dependencies**, and runs on plain **Node 22+** (uses global `fetch`). It does not touch the `server` package.

## 1. Get free API keys

All four have a free path (see research doc §5b). Create a key for each provider you want to test:

| Provider | Where | Env var | Notes |
|---|---|---|---|
| OpenAI `gpt-4o-mini-tts` | platform.openai.com | `OPENAI_API_KEY` | You already use this for moderation. Preset voices, no setup. |
| ElevenLabs Flash v2.5 | elevenlabs.io (free 10k chars/mo) | `ELEVENLABS_API_KEY` | Copy a voice ID from the Voices page → put in `config.mjs`. |
| Cartesia Sonic-3.5 | cartesia.ai (free 20k credits) | `CARTESIA_API_KEY` | Copy a voice ID from the voice library → `config.mjs`. |
| Inworld Realtime TTS | inworld.ai (free ~70 min) | `INWORLD_API_KEY` | Paste the **Base64 "Basic" key** from the portal as-is. Voice = a name (e.g. `Ashley`). |

> No key for a provider → it's skipped automatically. Start with just `OPENAI_API_KEY` (it runs out of
> the box, since OpenAI voices are presets and already filled in `config.mjs`).

## 2. Cast the voices (`config.mjs`)

`PERSONA_VOICE[*].voiceId` has **`"TODO"`** placeholders for ElevenLabs / Cartesia / Inworld. A provider
won't run for a persona until you replace its `"TODO"` with a real voice ID/name. Use each persona's
`brief` to pick a matching voice from that provider's library. (OpenAI's `shimmer`/`onyx`/`nova` are
already set.)

## 3. Run

```bash
# from the repo root — set the keys you have, then run
OPENAI_API_KEY=sk-... ELEVENLABS_API_KEY=... node spikes/voice-ab/ab-harness.mjs

node spikes/voice-ab/ab-harness.mjs --provider=openai,cartesia   # subset of providers
node spikes/voice-ab/ab-harness.mjs --persona=aurora --line=greeting,crisis
node spikes/voice-ab/ab-harness.mjs --list                       # preview, synthesize nothing
```

(Windows PowerShell: set keys with `$env:OPENAI_API_KEY="sk-..."` first, then `node spikes/voice-ab/ab-harness.mjs`.)

Output → `spikes/voice-ab/out/` (git-ignored):
- `<provider>__<persona>__<line>.mp3` — the clips
- `scorecard.csv` — one row per clip with latency, and empty 1–5 columns to fill while listening
- `manifest.json` — full run record incl. any errors

## 4. Score (blind)

Open `scorecard.csv`, listen, fill each clip **1–5**: **naturalness · warmth / persona match ·
expressiveness · intelligibility · consistency** (across that provider's clips). For a true blind test,
have one person rename/shuffle files and reveal providers only after scoring.

**Pass bar (from research doc §5b):** persona match ≥4, naturalness ≥4, the **crisis line reads calm and
sincere (not chirpy)**, and — for the provider you'd actually ship — latency within budget.

## What the latency numbers mean

- **OpenAI, ElevenLabs** use streaming endpoints → the number is a real **time-to-first-byte (TTFB)**.
- **Cartesia `/tts/bytes`, Inworld `/tts/v1/voice`** return the whole clip at once → the number is
  **total synthesis time**, not a streaming TTFB. For a true real-time latency comparison, use each
  provider's streaming endpoint (Cartesia SSE/WebSocket, Inworld `:stream`). For **quality + expression**
  (the point of this harness), the clips are identical regardless.

## Fairness / gotchas

- **Cast comparable voices.** A weak voice pick will sink a strong provider. Match the `brief`.
- **Stock voices only** on free tiers (no cloning) — fine for the initial cast; custom persona voices come later (paid).
- **Tuning differs by provider** (this is the cross-provider caveat): ElevenLabs uses numeric sliders,
  Cartesia speed/emotion, OpenAI a **prose instruction** — all derived from the one delivery intent in
  `config.mjs`. So the *concept* transfers; exact params don't.
- API shapes were verified 2026-06-29 but providers change. If one 400s, check the inline comment in
  `ab-harness.mjs` for that adapter against current docs (model id, version header, voice-settings fields).
- **Keys via env only.** Never hardcode or commit them; `out/` is git-ignored.
