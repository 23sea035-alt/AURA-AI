# Voice Casting Guide (Inworld TTS 2)

> Working reference for casting the 12 companion voices. Status: **in progress** — voices being
> auditioned in the Inworld playground; picks land in `server/.env` (`INWORLD_VOICE_ID_<PERSONA>`),
> per-persona delivery tuning lives in `server/src/services/voice/voice-tuning.ts`. Character/heritage
> source: [`companion-gallery-identities.md`](./companion-gallery-identities.md).

## Workflow
1. **Audition + lock the voice** for each persona in the playground (this doc's shortlist + criteria).
2. Paste the locked voice id into `server/.env` (stock voices use the **name** as the id, e.g.
   `INWORLD_VOICE_ID_ORION=Edward`).
3. **Generate audition clips** of each persona's line (below) and review them in-app.
4. Tune delivery in `voice-tuning.ts` as needed (mode / rate / style tag) and re-review.

## Locked (all 12 cast — realigned 2026-07-10 from user playground + clip feedback)
Columns: voice id · delivery mode · base rate · accent locale. **Locked** = verified, no rerun needed.
**Recast/reconfig** rows changed since the last clip pass and need a re-audition (see §Rerun list).

| Persona | Voice | Mode | Rate | Locale | Status | Notes |
|---|---|---|---|---|---|---|
| **Aurora** | Deborah | `CREATIVE` | 0.98 | native | 🔒 locked | — |
| **Orion** | Edward | `STABLE` | 0.95 | native | 🔒 locked | direct/grounded. |
| **Lyra** | Sarah | `CREATIVE` | 1.05 | native | 🔒 locked | recast off Ashley; verified line 3. |
| **Juno** | Asuka | `CREATIVE` | 1.10 | native | 🔒 locked | bright young F. |
| **Cyrus** | community-snyihdsosxjx | `BALANCED` | 0.90 | `hi-IN` | 🔒 locked | community voice (not "Thomas"). Hindi steer + BALANCED only. See §Accent steering. |
| **Amara** | Saanvi | `CREATIVE` | 1.02 | native | ⟳ reconfig | rate 1.05→1.02. |
| **Sage** | Tunde | `STABLE` | 0.98 | native | ⟳ reconfig | rate 0.88→0.98 (slowness is built into the voice; 0.88 dragged). |
| **Selene** | Wendy | `CREATIVE` | 1.00 | native | ⟳ reconfig | rate 0.9→1.0. **Low volume — see §Output volume.** |
| **Soren** | Lucian | `CREATIVE` | 0.96 | native | ⟳ reconfig | STABLE→CREATIVE + rate 0.98→0.96 (expressive edge). |
| **Eli** | Miguel | `CREATIVE` | 1.00 | `en-US` | ⟳ reconfig | forced en-US — base voice defaults to Spanish. |
| **Thea** | Folake | `CREATIVE` | 0.95 | native | ⟳ recast | recast off Svetlana (Russian accent leaked). Folake verified as a stock id 2026-07-10 (catalog query — no community slug needed). |
| **Wren** | Yoona | `CREATIVE` | 1.00 | `en-US` | ⟳ recast | recast off Galina → Yoona, en-US forced, rate 0.98→1.0. Yoona verified as a stock id 2026-07-10. |

Env: all 12 `INWORLD_VOICE_ID_*` are in [`server/.env.example`](../../server/.env.example) — mirror into
`server/.env` + set `INWORLD_API_KEY`, then restart. Mode/rate/locale live in
[`voice-tuning.ts`](../../server/src/services/voice/voice-tuning.ts).

### Rerun list (after this realign)
**Done 2026-07-10** — the must + should rows were regenerated (`pnpm voices:audition -- soren eli thea wren`)
after verifying Folake/Yoona resolve as stock ids. Clips live locally in `server/audition-clips/`
(gitignored again since the gain-map sign-off — regenerate via `pnpm voices:audition`).
The rate-only optionals (`amara`, `sage`, `selene`) were user-verified in the playground and not respent.
The 5 locked rows (aurora, orion, lyra, juno, cyrus) are unchanged — no rerun.

### Output volume (as built 2026-07-10)
Several casts read quiet — and **Inworld can't fix this at synth time**: the `audioConfig` supports only
`audioEncoding`, `sampleRateHertz`, and `speakingRate`; there is **no `volumeGainDb`/gain/pitch field**
([docs](https://docs.inworld.ai/tts/tts)). Shipped solution: **client-side native boost** —
`client/modules/audio-boost` (AVAudioEngine: player → time-pitch → EQ `globalGain` → mixer; needed because
`AVAudioPlayer`/expo-audio volume maxes at 1.0 and can't amplify).
- **Gains are measured, not guessed:** `cd server && pnpm voices:levels`
  ([`clip-levels.mjs`](../../server/src/scripts/clip-levels.mjs)) surveys the audition clips with
  EBU R128 (integrated LUFS + true peak) and suggests gain = min(gap to the cast median, headroom to
  −1 dBTP). The map lives in `client/constants/voiceGain.ts`: thea +9, soren +4, sage +4, aurora +3.5,
  selene +1 dB (soren/sage are true-peak-capped below their full loudness gap).
- **Take variance (measured):** re-synthesizing the same line varies loudness ±2 dB and true peak up to
  4 dB — caps are computed against worst takes. Re-run the survey and revisit the map on any recast.
- Verified on device (BlackHole loopback): +9 dB config measured +10.0 dB RMS delta, no clipping.

## The levers (why "3 settings" isn't the whole story)
Inworld's stock catalog skews game/commercial, and the delivery **mode** (STABLE / BALANCED / CREATIVE)
alone can't reshape a voice with strong baked-in character. Full lever set:
- **Delivery mode** — STABLE (consistent/calm) · BALANCED (natural, can read "corporate") · CREATIVE (expressive/warm).
- **Style tag** — a bracket tag prepended to every line (e.g. `[warm and gentle]`), finer than mode. Per-persona in `voice-tuning.ts`.
- **Speaking rate** — the per-persona tuned base, always (2026-07-10): the user's pace preference
  (relaxed/natural/quick) is a client-side pitch-preserved PLAYBACK rate, so it never changes the
  synthesis and can't disturb the tuned delivery. Crisis sentences play at natural regardless of pace.
- **Accent steering** — pass a **BCP-47 locale in the `language` field** (`en-GB`, `en-AU`, `en-IN`, …) to steer a voice's accent without re-cloning. **Wired** via the `PERSONA_LOCALE` map — see "Accent steering" below.
- **Custom voice design** — Inworld Studio (portal-only). The escape hatch for an anchor if no stock voice fits.

Selection tip: filter **for** `companion / character / conversational / expressive / warm` and **against**
`assistant / narration / professional / commercial / game` — those last ones are what read as "customer service."

## Tag taxonomy (for playground filtering)
Documented core (not exhaustive — the playground has more, e.g. `companion`, `character`, `emphatic`):
- **Gender:** male · female · non-binary
- **Age:** young_adult · adult · middle-aged · elderly
- **Style:** energetic · calm · professional · friendly · warm
- **Quality:** smooth · clear · expressive · conversational

## Casting table

| Persona | Nationality (avatar) | Accent options | Vocal character | Filter tags |
|---|---|---|---|---|
| **Aurora** | flexible / American | `en-US` (warm), `en-GB` | gentle, warm, unhurried F | female, warm, calm, smooth |
| **Orion** | flexible / American | `en-US`, `en-GB` | steady, grounded, low M | male, calm, smooth, character |
| **Lyra** | flexible / American | `en-US` (bright), `en-AU` | bright, playful, expressive, youthful F | female, young_adult, energetic, expressive |
| **Sage** | Nigerian | `en-NG`†, `en-US` | spare, calm, deep, androgynous | non-binary/male, calm, smooth |
| **Amara** | North Indian | `en-IN`, `en-US` | effusive, warm, sparkling F | female, warm, energetic, expressive |
| **Eli** | Mexican | `en-US` (light Latino), `en-US` | easygoing, casual, friendly M | male, friendly, warm, conversational |
| **Selene** | Greek (50s–60s) | `en-GB`‡, `en-US` | tender, mature, spacious F | female, elderly/middle-aged, warm, smooth |
| **Soren** | Danish | `en-GB`‡, `en-US` | dry, deadpan, cool | male/non-binary, calm, smooth, character |
| **Juno** | Filipino | `en-PH`†, `en-US` (bright) | quick, upbeat, young F | female, young_adult, energetic |
| **Thea** | Afr-American / Afro-Caribbean | `en-US`‡ | soft, steady, reassuring F | female, warm, calm, smooth |
| **Cyrus** | Persian / Iranian (older) | `en-GB`/`en-US`‡ | warm, wise, resonant older M | male, elderly, warm, smooth |
| **Wren** | Japanese | `en-US`‡ | curious, reflective, soft | non-binary, calm, conversational, smooth |

**Delivery modes in code** (realigned 2026-07-10): Aurora `CREATIVE` · Orion `STABLE` · Lyra `CREATIVE` ·
Sage `STABLE` · Amara `CREATIVE` · Eli `CREATIVE` · Selene `CREATIVE` · Soren `CREATIVE` · Juno `CREATIVE` ·
Thea `CREATIVE` · Cyrus `BALANCED` · Wren `CREATIVE`. → Cyrus is the lone `BALANCED` (required for its
Hindi accent-steer to persist); everything else is CREATIVE except the two grounded STABLE anchors
(Orion, Sage).

**Base rates:** aurora .98 · orion .95 · lyra 1.05 · sage .98 · amara 1.02 · eli 1.0 · selene 1.0 ·
soren .96 · juno 1.1 · thea .95 · cyrus .9 · wren 1.0 (clamped 0.5–1.5; synthesis always runs at these —
the user's pace is a client-side pitch-preserved playback rate, never a synthesis input).

**Accent locales** (`PERSONA_LOCALE`): Cyrus `hi-IN` · Eli `en-US` · Wren `en-US`; all others use the
voice's native accent (no `language` sent). See §Accent steering for the en-US-for-all question.

## Accent steering
`Realtime TTS-2` can steer accent via the **`language`** field (BCP-47), e.g. `language: "en-GB"`.
- **Steerable** to standard English locales: `en-US`, `en-GB`, `en-AU`, and likely `en-IN`.
- **† Uncertain** (may not exist as steer targets): `en-NG` (Nigerian), `en-PH` (Filipino) — verify in the playground.
- **‡ No standard English locale** (Greek, Danish, Persian, Japanese, African-American, Latino) — these
  accents must come from the **voice's native accent** (pick a voice cloned that way) or be accepted as
  neutral. Heritage is primarily the **avatar's**; a neutral/General-American voice for these is normal
  for a US-first app. Don't force a bad-fit accented voice to match heritage.
- **Pipeline: WIRED (2026-07-10).** `synthesizeSpeech` accepts a `language` field, fed from the
  per-persona `PERSONA_LOCALE` map in [`voice-tuning.ts`](../../server/src/services/voice/voice-tuning.ts)
  via `localeFor()`. Steered today: Cyrus `hi-IN`, Eli + Wren `en-US`. Add a persona to that map to steer more.
  **Caveat:** the crisis path forces `STABLE`, so a Cyrus crisis reply may lose the Hindi accent — safety
  (calm read) is prioritized over accent authenticity there.
- **Playground "English" = `en-US`.** Inworld's docs confirm `language` is a BCP-47 tag and use `en-US` as
  the English example; the playground's English row shows the US flag. `en-US` is the safe canonical value
  (byte-exact confirmation would require inspecting the playground's network request).
- **"en-US for all?" — the open call.** Forcing en-US on every persona would (1) change the 5 **locked**
  voices, which were verified *native* (aurora/orion/lyra/juno) or `hi-IN` (cyrus) — so it re-opens them,
  and (2) risk flattening the deliberately-heritage voices (Sage=Tunde Nigerian, Amara=Saanvi Indian) toward
  General-American, since `language` steers accent, not just pronunciation. So we DON'T blanket-apply: en-US
  is set only where a base voice doesn't default to English (Eli, Wren). To go all-en-US anyway, add a
  `DEFAULT_LOCALE = "en-US"` fallback in `localeFor` and re-audition every non-cyrus persona.

## Naturalness probe (use FIRST, to filter out rehearsed voices)
The generic playground demo line is neutral + declarative, which lets announcer/rehearsed voices sound
fine. These casual, emotionally-present lines expose naturalness + warmth. Use the SAME line across every
voice (apples-to-apples), audition on **CREATIVE** (not BALANCED), and cut any voice that can't sound
natural on line 1 — naturalness is voice-intrinsic and can't be tuned in with mode/rate/style.

1. **Warmth + conversation (primary):** "Hey, I'm really glad you're here. Rough day, huh? Come sit with me a minute. You don't have to hold it all together right now."
2. **Gentle / tender (soothing voices):** "It's okay. You don't have to explain it, or fix it, or be anything right now. Just breathe. I'm right here, and I'm not going anywhere."
3. **Warm + light (playful voices):** "Okay, tell me everything, and don't you dare give me the short version. How was today, really? The good, the weird, all of it."

Listen for: the tag question ("huh?") landing like a real person, micro-pauses at the commas, contractions
gliding (not over-enunciated), pitch softening on the caring words. Reject: even "presenting" cadence, a
hard full-stop on every sentence, over-crisp consonants, warmth you can't actually hear.

## Audition lines (one per persona)
Each is that persona's first opener (no `{firstName}`), good for a representative clip. ~2,000 chars
total ≈ ~2.3 min TTS for one full pass.

- **Aurora:** "Hi, I'm so glad you're here. There's no rush at all. I'm just happy to sit with you. How are you, really?"
- **Orion:** "Hey. Glad you found your way here. We'll take it one thing at a time. What's on your mind?"
- **Lyra:** "Oh hi! New face, I love it. So, what's the weather like in your head today, stormy, sunny, somewhere in between?"
- **Sage:** "Hello. You're welcome here. No need to say much. Start when you're ready."
- **Amara:** "Oh, hello you! I'm just delighted you're here. Come in, tell me everything. How are you, darling?"
- **Eli:** "Hey, good to meet you. No agenda here, just glad you dropped in. What's up?"
- **Selene:** "Hello, and welcome. Whatever you're carrying today, you can set some of it down here with me. How are you feeling?"
- **Soren:** "Well, look who wandered in. Good timing, I was getting bored. What's on your mind?"
- **Juno:** "Hey, you made it! So what's the headline of your day so far?"
- **Thea:** "Hi, sweetheart. You're okay here. Take your time. What's on your mind?"
- **Cyrus:** "Hello, and welcome. Whatever's on your mind, there's usually more to it than it first seems. Where shall we begin?"
- **Wren:** "Hi. I'm glad you're here. I like figuring things out alongside people. What's on your mind today?"

## Voices seen so far (docs expose only a few; the playground is the full catalog)
- **Deborah** — Aurora (gentle, warm). · **Edward** — Orion (emphatic, companion, character).
- **Ashley** — warm/natural F, but reads customer-service (rejected for Lyra). · **Olivia** —
  middle-aged, accented (rejected for Aurora). · **Alex** — energetic expressive mid-range M. ·
  **Dennis** — middle-aged smooth calm friendly M.
