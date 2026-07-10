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

## Locked / in-progress
| Persona | Voice | Delivery mode | Notes |
|---|---|---|---|
| **Aurora** | **Deborah** ✓ | `CREATIVE` | BALANCED read as "customer support" in testing; CREATIVE is warmer. (Olivia rejected — middle-aged + accented.) |
| **Orion** | **Edward** ✓ | `STABLE` | Tags emphatic / companion / character → fits "direct and grounded." |
| **Lyra** | **recast** ⟳ | `CREATIVE` | Ashley rejected (too customer-service even on CREATIVE). Needs a bright, expressive, non-corporate voice. |
| Sage…Wren | open | see table | Audition against the criteria below. |

Env for the two locked: `INWORLD_VOICE_ID_AURORA=Deborah`, `INWORLD_VOICE_ID_ORION=Edward` (restart the server).

## The levers (why "3 settings" isn't the whole story)
Inworld's stock catalog skews game/commercial, and the delivery **mode** (STABLE / BALANCED / CREATIVE)
alone can't reshape a voice with strong baked-in character. Full lever set:
- **Delivery mode** — STABLE (consistent/calm) · BALANCED (natural, can read "corporate") · CREATIVE (expressive/warm).
- **Style tag** — a bracket tag prepended to every line (e.g. `[warm and gentle]`), finer than mode. Per-persona in `voice-tuning.ts`.
- **Speaking rate** — per-persona base × the user's pace multiplier (relaxed/natural/quick).
- **Accent steering** — pass a **BCP-47 locale in the `language` field** (`en-GB`, `en-AU`, `en-IN`, …) to steer a voice's accent without re-cloning. **NOT wired in our pipeline yet** ([`inworld-tts.ts`](../../server/src/services/voice/inworld-tts.ts) sends no `language`) — see "Accent steering" below.
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

**Delivery modes in code:** Aurora `CREATIVE` · Orion `STABLE` · Lyra `CREATIVE` · Sage `STABLE` ·
Amara `CREATIVE` · Eli `BALANCED` · Selene `BALANCED` · Soren `STABLE` · Juno `CREATIVE` · Thea
`BALANCED` · Cyrus `STABLE` · Wren `BALANCED`. → The four **BALANCED** (Eli, Selene, Thea, Wren) are
most at risk of the "customer support" flatness — test CREATIVE (or STABLE for the calmer ones).

**Base rates:** aurora .98 · orion .95 · lyra 1.05 · sage .88 · amara 1.05 · eli 1.0 · selene .9 ·
soren .98 · juno 1.1 · thea .95 · cyrus .9 · wren .98 (× the user's pace multiplier, clamped 0.5–1.5).

## Accent steering
`Realtime TTS-2` can steer accent via the **`language`** field (BCP-47), e.g. `language: "en-GB"`.
- **Steerable** to standard English locales: `en-US`, `en-GB`, `en-AU`, and likely `en-IN`.
- **† Uncertain** (may not exist as steer targets): `en-NG` (Nigerian), `en-PH` (Filipino) — verify in the playground.
- **‡ No standard English locale** (Greek, Danish, Persian, Japanese, African-American, Latino) — these
  accents must come from the **voice's native accent** (pick a voice cloned that way) or be accepted as
  neutral. Heritage is primarily the **avatar's**; a neutral/General-American voice for these is normal
  for a US-first app. Don't force a bad-fit accented voice to match heritage.
- **Pipeline gap:** `synthesizeSpeech` doesn't send `language` today. To use steering in-app, add a
  per-persona `PERSONA_LOCALE` map + pass `language` in the request (a small, additive change).

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
