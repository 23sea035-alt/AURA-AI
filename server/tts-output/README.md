# Voice TTS A/B — provider casting for the "Aurora" voice

Sample clips comparing TTS providers for the Aurora persona across five emotional registers:
`warm-welcome`, `gentle-laugh`, `concerned`, `joyful`, `whisper-intimate`.

| Provider / model | Format | Clips |
|---|---|---|
| Cartesia `sonic-3.5` | `.wav` | `cartesia-<register>.wav` |
| Inworld `tts-1.5-max` | `.mp3` | `inworld-inworld-tts-1.5-max-<register>.mp3` |
| Inworld `tts-1.5-mini` | `.mp3` | `inworld-inworld-tts-1.5-mini-<register>.mp3` |
| Inworld `tts-2` | `.mp3` | `inworld-inworld-tts-2-<register>.mp3` |

**Outcome (updated 2026-07-02):** **Inworld TTS 2 (`inworld-tts-2`) was selected** and is the as-built
voice stack (`INWORLD_API_KEY` / `INWORLD_VOICE_ID_*` / `services/voice/inworld-tts.ts`). The earlier
"Cartesia Sonic-3.5" outcome is superseded — Cartesia/Deepgram/LiveKit were removed.

## Regenerate

The `.wav` / `.mp3` clips are **git-ignored** (regenerable, see `.gitignore`). To recreate them:

```bash
# from server/, with keys set
INWORLD_API_KEY=...        node test-tts-inworld.mjs
```

> Note: `test-tts-cartesia.mjs` is a stale A/B artifact from the removed Cartesia provider and can be deleted.

Both scripts write into this folder.

> Note: this is a narrower, provider-specific cut of the broader harness in
> [`../../spikes/voice-ab/`](../../spikes/voice-ab/) (which also covers OpenAI + ElevenLabs and
> records latency + a blind scorecard). Prefer folding future TTS casting work into that harness.
