# Real-time Voice Call — Research & Spike Plan

**Status (2026-06-29):** research complete; framework + architecture + hosting **decided**, TTS vendor **open**.
Scoped as a **2-week, 2-engineer, flag-gated spike** — NOT a v1.0 GA commitment. Expands the deferred
"Companion voice call (real-time conversation) 🧊" entry in [post-v1.0-roadmap.md](post-v1.0-roadmap.md).

> **Why this is harder for us than for competitors:** Aura is mental-health-adjacent with a 988/crisis
> obligation. The entire L0–L3 moderation pipeline ([specs/moderation-pipeline.md](../specs/moderation-pipeline.md))
> is built for *turn-based text*. Real-time voice's difficulty is concentrated almost entirely on
> preserving that safety guarantee inside a streaming loop — not on the audio plumbing. A roleplay app
> can ship a leaky call; we cannot. **Do not put "voice calls" on the v1 GA marketing surface until a
> dedicated streaming-safety eval passes.**

---

## 1. Decisions

### D-V1 — Cascading pipeline (STT → LLM → TTS), NOT native speech-to-speech
Speech-to-speech models (OpenAI Realtime `gpt-audio`) are lower-latency but **disqualified**: they
generate audio directly (no text checkpoint to moderate before it's spoken), use their own brain
(breaks the Groq lock), and make the crisis path uncontrollable. The cascading pipeline keeps **text
canonical at every hop**, which means the existing moderation engine runs on real text exactly as it
does today. ~90% of production voice agents in 2026 use cascaded STT→LLM→TTS for exactly this
controllability/observability reason.

### D-V2 — Framework: LiveKit Agents, **Node SDK**
Chosen over Pipecat. Both are excellent; the tiebreaker is **keeping the safety gate in-process**.

| Axis | LiveKit Agents | Pipecat | Notes |
|---|---|---|---|
| E2E latency (same stack) | 750–900ms | 800–950ms | LiveKit ~50–100ms edge, from **transport**, not language |
| Robustness / scale | Go SFU, 10k+ concurrent proven; runs **OpenAI Advanced Voice, Meta, Character.AI** | v1.0 (Apr 2026), ~7k★, BYO infra, no published scale benchmarks | LiveKit decisively |
| Cost (managed, ~100k min/mo) | ~$4–6k (Cloud) | ~$1.5–3k | Pipecat cheaper at scale |
| Cost (self-host) | OSS Go server, free + infra | OSS Python, free + infra | tie |
| Moderation insertion | `ttsNode` / `llmNode` hooks | `FrameProcessor` (first-class) | Pipecat slightly nicer; **both work** |
| Language | Python + **Node** + Go | Python only (agent) | LiveKit lets us stay in TS |

**The clincher:** our moderation engine is TypeScript, and the 2026-06 audit specifically credited us
for *consolidating* the safety logic. With **LiveKit + Node**, the `ttsNode` gate calls
`screenOutputChunk()` as an in-process function. With Pipecat (Python) we'd either HTTP-call the Node
moderator per sentence (latency + a new failure surface **on the crisis hot path**) or reimplement
L0–L3 in Python (**forking** the safety logic the audit told us not to fork). In-process wins.

**Latency myth settled:** a voice agent is I/O-bound (awaiting STT/LLM/TTS). LLM inference is 60–70%
of total latency; the orchestration loop isn't in the critical path. Python's GIL never engages on
`await`-ed sockets — "Python is slower" is irrelevant here.

**Caveat to de-risk on spike Day 1:** LiveKit's Python Agents SDK is the flagship; Node reached rough
parity at Agents 1.0 (Aug 2025) and *has* the `ttsNode`/`llmNode` hooks, but a few plugins (notably
the turn-detector model) are Python-first. Prove in Node: (1) `ttsNode` can hold a sentence, run an
async moderation call, and drop/replace it before synthesis; (2) barge-in + turn detection are good
enough without the Python-only turn model. **Fallback if Node disappoints:** LiveKit *Python* agent
that HTTP-calls the Node moderator — keeps the transport win, concedes only the in-process gate.

### D-V3 — Hosting: media plane on **LiveKit Cloud**, agent worker on **Render**
Render accepts external traffic over **HTTPS only — no raw UDP ingress on any plan** (long-standing
limitation). The LiveKit **media server (SFU)** needs UDP 50000–60000 + UDP 7882 + TCP 7880–7881, so
it **cannot run on Render**, and the $7 Starter is far too small for media forwarding regardless.
The **agent worker** (our Node code) connects *outbound* to the SFU as a participant — no inbound UDP —
so it runs fine on Render.

```
LiveKit Cloud (free Build tier)  ── media/transport plane (UDP-heavy SFU, managed)
        ▲ outbound WS/WebRTC
Render: Express backend  +  LiveKit Agent worker (separate always-on Background Worker)
```

- Agent worker = a **separate, always-on** Render service (Background Worker, not a sleeping web
  service; not the same process as Express — so a crashed call can't take the API down).
- Starter is fine for the spike (a few concurrent calls); size up / run multiple workers for prod
  (LiveKit dispatches across workers).
- **Self-hosting the SFU later** (for cost/control) goes on a **UDP-capable host** (Fly.io, Hetzner,
  DO, AWS) — never Render, never co-located with the backend on a tiny instance.

---

## 2. Streaming moderation design

Preserve the text invariant ("screen the complete output before display") at **sentence granularity**.

1. **Output gate (core).** Don't stream raw tokens to TTS. Buffer to the next sentence/clause; gate
   each chunk *before* it reaches TTS via `ttsNode`:
   - **L0 deterministic** — instant, synchronous, every chunk.
   - **L2 omni** (OpenAI moderation, ~100–300ms) — `sexual/minors` (hard block), `self-harm` (crisis).
   - **`gpt-oss-safeguard-20b` stays OFF the hot path** — too slow per-sentence; async escalation/audit only.
   - Flagged chunk → never synthesized → safe fallback or escalate. TTFB ≈ first-sentence gen + ~200ms;
     the gate on sentence *N* overlaps TTS playback of *N-1*, so steady-state latency hides it.
2. **Rolling input gate.** On streaming-STT partials: L0 on the accumulated transcript every delta
   (instant); L1 prompt-guard + L2 omni on each *stable* segment.
3. **Deterministic crisis interrupt.** On any L0 crisis match (either side): fire LiveKit's
   interruptible-frame cancel → cut in-flight TTS → play a **pre-synthesized, cached** warm crisis
   script → **push the visual `CrisisSupport` card** (988/741741 must never be audio-only) → log a
   `critical` safety_event **on a separate connection** (the H8 pattern — never let logging roll back
   the user's reply).
4. **Fail-closed in-stream** = if the gate errors or can't keep pace, stop audio + safe fallback;
   never "let it through to keep the call smooth."

```
user audio ─▶ WebRTC (LiveKit Cloud) ─▶ streaming STT
   ├─ L0 on every transcript delta ───────────────▶ crisis? ▶ INTERRUPT (cut + crisis script + visual card)
   └─ L1+L2 on stable segment ────────────────────▶ block?  ▶ safe fallback
        ─▶ Groq brain (generate, emit by sentence)
              └─ ttsNode OUTPUT GATE  L0 + omni  per sentence ─▶ flagged? ▶ drop / fallback / crisis
                    ─▶ TTS (only gated sentences) ─▶ WebRTC ─▶ companion audio
                          ▲ user speaks → interruptible-frame cancel (barge-in)
```

---

## 3. Backend changes (all additive — the text path is untouched)

1. **New agent worker** (Node, LiveKit Agents) — separate Render service; session lifecycle, the
   `ttsNode` gate, STT/LLM/TTS orchestration, per-minute limit enforcement.
2. **Streaming moderation adapters** over the existing primitives — add `screenOutputChunk()` /
   `screenTranscriptDelta()` to [moderation-engine.ts](../../server/src/services/moderation/moderation-engine.ts)
   that call the **same L0–L3** `screenInput`/`screenOutput` use. **Do not fork the safety logic.**
3. **Schema (3 changes):**
   - `voice_call_sessions` (id, userId, companionId, startedAt, endedAt, durationSec, costCents, status).
   - **`safety_events.modality`** (`text` | `voice`) — also cleanly separates text-vs-voice incidents.
   - Call turns persist as `messages` with `inputModality='voice'` + optional `audioUri` (fields exist).
4. **Per-minute voice limits** in the **PG-backed rate-limit store** (the durable one from the CRITICAL
   fix): free tier = no calls or tiny daily cap; premium = capped minutes; hard server-side ceiling.
5. **Compliance:** **audible AI disclosure at call start** (SB 243), mic/recording consent, transcript/
   audio retention wired into the tiered retention policy; crisis stays visual.
6. **Observability:** per-call moderation latency, interrupt/cut-audio events, cost-per-call →
   `/api/admin/metrics`.

---

## 4. Cost runway (LiveKit Cloud)

The **Build tier is permanent-free** (no trial/expiry, no card). You pivot on **usage**, driven by
**actual call-minutes** — not by whether the app is deployed (text chat never touches LiveKit).

| Limit | Build (free) | Binding? |
|---|---|---|
| Agent session minutes | **1,000 / mo** (≈100–200 calls) | yes — main one |
| WebRTC participant minutes | 5,000 / mo | secondary |
| Concurrent agent sessions | **5** | yes — caps simultaneous calls |
| Inference credits ($2.50) | ~50 min | **no — we BYO STT/LLM/TTS keys** |
| At cap | **hard stop, no overage** | important |
| Between sessions | **agent sleeps → 10–20s cold start** | important (UX) |

**Pivot triggers, soonest first:** (1) **cold-start UX** — the first call after idle waits 10–20s;
this pushes you to **Ship ($50/mo)** the day real users arrive (warm agents + overage instead of hard
cutoff), *before* you hit the minute cap. (2) >1,000 min or >5 concurrent → Ship. (3) >20 concurrent
or **HIPAA/SOC 2** → **Scale ($500/mo)** (pin for later — relevant to a mental-health app).

> **Free Build tier ≠ free voice calls.** LiveKit's tier governs only transport/orchestration. The real
> per-minute cost — **STT + LLM + TTS via our own keys (~$0.05–0.15/min)** — is billed by those vendors
> from call #1, on every tier, and **dwarfs** LiveKit's cost. Model unit economics + the free-vs-premium
> minute caps on the vendor spend, not on LiveKit.

---

## 5. Voice/TTS vendor — narrowing: Inworld vs Cartesia

> **Decision status (2026-06-29):** field narrowed to **Inworld** (value/quality winner) vs **Cartesia**
> (latency + reliability all-rounder); coworker demoing both free tiers to compare audio output.
> gpt-4o-mini-tts and ElevenLabs set aside (latency / price). Remember the tiebreakers a pure listen
> won't surface — latency, reliability/SOC2 maturity, price — see §5c.

Real-time needs the **low-latency "agent" tier** (sub-150ms TTFB is the natural-turn ceiling), not the
expressive-offline tier. **All four candidates have a confirmed LiveKit Agents plugin** (incl. Inworld).
Priorities for a *companion*: warmth/expressiveness first, then latency, per-persona voice variety,
cost, reliability. Costs normalized to **$/min of audio** (≈ how voice calls bill; ~900 chars/min).

| Vendor / model | Latency (TTFB) | Cost (~$/min) | Strength | Fit for a companion |
|---|---|---|---|---|
| **ElevenLabs Flash v2.5** | ~75ms | ~$0.045 ($0.05/1k chars) | **voice realism + cloning, 5,000+ voices** | strongest persona *character* |
| **Cartesia Sonic-3.5** | ~40–90ms (fastest) | ~$0.03 | **latency + reliability (99.9%, SOC2, 20M calls/mo)** | excellent; ops-grade |
| **Inworld Realtime TTS** | <130ms (Mini) / <250ms (Max) | ~$0.009–0.0225 ($5–25/1M) | **#1 Speech Arena; beat EL/Cartesia/OpenAI 59–61% blind**; instant cloning | expressive *and* cheap — dark horse |
| Deepgram Aura-2 | ~90–200ms | ~$0.027 ($0.03/1k) | tightest latency spread; consolidates if STT=Deepgram | neutral/call-center tone — less warm |
| OpenAI `gpt-4o-mini-tts` | higher (~300ms+) | **~$0.015** | **we already hold the key**; prose-steerable emotion; 13 voices, no cloning | cheap proxy / possible ship |
| Rime Arcana/Mist | ~120–200ms | ~$0.03–0.04 ($30–40/1M) | conversational (trained on real speech, not audiobooks) | utility-leaning |

**Competitor research (2026-06-29):** **Inworld** is the surprise — ranked #1 on the Artificial
Analysis Speech Arena, with blind-test win rates of 59–61% over ElevenLabs / Cartesia / OpenAI, at
**$10/1M chars (Max) or $5/1M (Mini)** — i.e. expressive-tier quality at utility-tier price, with
<130ms latency (Mini), WebSocket streaming, and instant 5–15s voice cloning — and it **has an official
LiveKit plugin**, so the earlier caveat is cleared; the only flag is that it's a newer/smaller vendor
than ElevenLabs. **Deepgram Aura-2** is the cleanest
*vendor-consolidation* play (one provider for STT **and** TTS), but its voices read professional/neutral
— the wrong register for warmth. **Rime** is conversational but utility-leaning. **gpt-4o-mini-tts** is
the cheapest serviceable option and we already pay OpenAI for omni-moderation.

**Leaning:** **ElevenLabs Flash v2.5** for the spike (fastest path to three distinct, characterful
persona voices; best docs), **A/B `gpt-4o-mini-tts`** (near-zero onboarding, may be good *and* cheap
enough to ship) and **add Inworld + Cartesia** to the same listen if time allows — Inworld's price/quality
is too good to ignore. Because text stays canonical and LiveKit has plugins for most candidates,
**TTS is swappable with nothing downstream changing** — a low-risk, deferrable decision. Make the final
call by *listening* in the harness (§5b), not from the table.

### 5a. Persona → voice config (draft)

Voice = deterministic rendering of canonical text; the model never picks how it sounds. Two layers:
a **base voice per persona** (identity) and **trait-driven delivery** (how). Control surfaces differ by
provider — ElevenLabs uses numeric sliders, Cartesia uses speed + emotion tags, OpenAI uses a **prose
instruction** — so we keep one provider-neutral *intent* and resolve it per provider. Voice IDs are
**placeholders** until cast by ear in the A/B harness.

```ts
// server/src/services/voice/persona-voice.ts  (SPIKE DRAFT — voiceIds are placeholders)
import type { PersonaKey, PersonaTraits } from "@aura/shared";

export type TtsProvider = "elevenlabs" | "cartesia" | "openai";

// ── Layer 1: base voice identity per persona ────────────────────────────────
interface PersonaVoice {
  brief: string;                              // casting brief — pick a voice that matches this
  voiceId: Record<TtsProvider, string>;       // provider-specific base voice ("the who")
}

export const PERSONA_VOICE: Record<PersonaKey, PersonaVoice> = {
  aurora: { brief: "warm feminine, soft-spoken, slightly breathy, unhurried, soothing; mid-low pitch",
            voiceId: { elevenlabs: "TODO", cartesia: "TODO", openai: "shimmer" } },
  orion:  { brief: "grounded masculine, clear & steady, warm but direct; mid pitch, measured pace",
            voiceId: { elevenlabs: "TODO", cartesia: "TODO", openai: "onyx" } },
  lyra:   { brief: "bright, lively, curious; light & expressive; mid-high pitch, quicker cadence",
            voiceId: { elevenlabs: "TODO", cartesia: "TODO", openai: "nova" } },
};

// ── Layer 2: traits → provider-neutral delivery intent ──────────────────────
// warmth & energy modulate delivery. verbosity is a TEXT-length trait (handled in
// generation) — it does NOT touch voice.
interface DeliveryIntent { warmth: number; energy: number; pace: number; } // 0..1, pace 0.85..1.1

const WARMTH = { reserved: 0.25, warm: 0.6, affectionate: 0.9 } as const;
const ENERGY = { calm: 0.2, balanced: 0.5, playful: 0.85 } as const;

export function deliveryIntent(t: PersonaTraits): DeliveryIntent {
  const energy = ENERGY[t.energy];
  return { warmth: WARMTH[t.warmth], energy, pace: 0.85 + energy * 0.25 }; // calm→slower, playful→quicker
}

// ── Layer 3: resolve intent to each provider's control surface ──────────────
export function resolveElevenLabs(d: DeliveryIntent) {
  return {
    stability: 0.65 - d.energy * 0.25,        // calmer = steadier; playful = more variation
    similarity_boost: 0.75,
    style: 0.2 + (d.warmth + d.energy) / 2 * 0.5, // warmer/livelier = more expressive
    speed: d.pace,
  };
}
export function resolveCartesia(d: DeliveryIntent) {
  return { speed: d.pace, emotion: [
    ...(d.warmth > 0.5 ? ["positivity:high"] : ["positivity"]),
    ...(d.energy > 0.6 ? ["curiosity:high"] : []),
  ] };
}
// OpenAI gpt-4o-mini-tts: delivery is a natural-language instruction, NOT sliders.
export function resolveOpenAIInstruction(d: DeliveryIntent): string {
  const warmth = d.warmth > 0.7 ? "tender and affectionate" : d.warmth > 0.4 ? "warm and caring" : "calm and attentive";
  const energy = d.energy > 0.6 ? "lively, with a light, playful lift" : d.energy < 0.35 ? "slow, steady, and grounding" : "an even, natural energy";
  return `Speak in a ${warmth} tone with ${energy}. Sound human and present, never robotic.`;
}

// ── Crisis override: pinned calm config regardless of persona/traits ────────
// The 988 line is delivered steady & warm, never playful. Pre-synthesize + cache.
export const CRISIS_DELIVERY: DeliveryIntent = { warmth: 0.7, energy: 0.15, pace: 0.9 };
```

### 5b. A/B test plan (provider-pluggable preview harness)

Goal: pick the voice **by ear + latency**, not by spec sheet — and de-risk the cross-provider concern
(§ below). A tiny standalone script (no LiveKit needed) loops `persona × line × provider`, synthesizes,
writes audio + a manifest, and logs **TTFB**. Then blind-listen and score.

- **Free to run — all four have a free demo path:** [openai.fm](https://www.openai.fm/) (gpt-4o-mini-tts,
  **no signup**, pick voice + "vibe" instruction + download), ElevenLabs free tier (10k chars/mo ≈ 12–15
  min + Speech Synthesis playground), Cartesia free tier (20k credits ≈ 15–20 min, no card + playground),
  Inworld (free ~70 min TTS + TTS Playground, even instant cloning). **Web playgrounds settle quality +
  expression; TTFB needs the API harness.** Two fairness notes: pick the *realtime* model in each
  playground (Flash/Turbo, Sonic) — flagship models flatter quality you won't ship — and free tiers use
  stock voices (no cloning). Even with no free tier, the full corpus (~15 short clips/provider) costs pennies.

- **Sample lines** (fixed, same across all runs — cover the registers a companion hits):
  1. *Greeting:* "Hey, it's good to hear your voice. How's your day been?"
  2. *Warm reflection:* "That sounds like it's been weighing on you. I'm here — take your time."
  3. *Playful:* "Okay, okay — bold choice. I kind of love it. Tell me everything."
  4. *Boundary/deflection:* "I really care, but I'm not the right one for medical advice — let's get you to someone who is."
  5. *Crisis (use `CRISIS_DELIVERY`):* "I'm really glad you told me. You matter. Please reach the 988 Suicide & Crisis Lifeline — call or text 988 — right now; I'll stay with you."
- **Score each clip 1–5 (blind):** naturalness · warmth / persona match · expressiveness · intelligibility · consistency across lines. Record **TTFB** separately (real-time feel ≠ quality).
- **Pass bar:** persona match ≥4, naturalness ≥4, **crisis line reads calm & sincere (not chirpy)**, TTFB within budget (≤~250ms for the shipping candidate; gpt's higher latency is acceptable only if gpt is the *ship* choice).
- **Harness (built):** [`spikes/voice-ab/`](../../spikes/voice-ab/) — a zero-dependency Node 22 script
  (`ab-harness.mjs` + editable `config.mjs`) that loops persona × line × all 4 providers, writes
  `out/<provider>__<persona>__<line>.mp3` + a `scorecard.csv` + `manifest.json`, and logs first-audio
  latency. Keys via env (providers without a key are skipped); voice IDs are cast in `config.mjs`. See its
  [README](../../spikes/voice-ab/README.md).

**Is voice the only difference across providers? No.** What changes when you swap TTS provider:
voice *identity*; the **tuning/control surface** (sliders vs prose instructions — configs don't port
1:1); **latency/TTFB** (gpt is slower than EL/Cartesia); **streaming/chunk behavior** (affects the
moderation gate + barge-in); pronunciation stability; **voice cloning** (EL/Cartesia/Inworld yes, gpt
no). **Transfers from a gpt test:** the persona→trait→delivery *concept*, the pipeline integration, the
scripts, and "does a talking companion feel right." **Does NOT transfer:** the exact voice identity, the
tuning params, and the real-time latency feel. **Key:** if gpt-4o-mini-tts is a *ship candidate*, testing
it IS testing what ships — the concern dissolves; only if you test on gpt but ship EL/Cartesia does the
gap bite. Either way, make the **final** quality call across *all* candidates in this one harness.

**gpt-4o-mini-tts cost (after any free playground):** token-based — **$0.60/1M text-input + $12/1M
audio-output tokens ≈ ~$0.015/min** of speech (billed on audio *output*, so slow/expressive speech
costs more). Among the cheapest options — though Inworld's 1.5 Mini/Max tiers can run lower per minute
(see §5c). Context: TTS is one slice of a call
(STT + LLM + TTS + LiveKit); a 10-min call's TTS ≈ **$0.15 on gpt vs ~$0.30 Cartesia vs ~$0.45
ElevenLabs** — real, but small next to LLM+STT. So gpt being cheapest shouldn't *by itself* win the
decision; "good enough warmth" should.

**Related — STT (also needed for a call):** a real-time call needs server-side *streaming* STT (v1
push-to-talk uses on-device STT). Full treatment + rankings in **§5d** — note **Groq Whisper is
batch-only**, so it's out for the live loop despite being the cheapest.

### 5c. Rankings — price / value / latency (approximate; 2026-06, normalized to ~900 chars/min)

Ballparks — vary by model tier, plan, and volume; **validate quality by ear in the §5b harness**.

**Price** (cheapest → priciest):

| # | Provider | ~$/min | Note |
|---|---|---|---|
| 1 | Inworld (1.5 Mini / Max) | ~$0.0045 / $0.009 | price leader at usable quality |
| 2 | OpenAI gpt-4o-mini-tts | ~$0.015 | flat token pricing; key already held |
| 3 | Cartesia Sonic-3.5 | ~$0.03 | |
| 4 | ElevenLabs Flash v2.5 | ~$0.045+ | credit/subscription; overage ~$0.18–0.24/min |

**Performance-per-cost** — perf = (quality + latency)/2; **value floor-adjusted** (best → worst):

| # | Provider | Quality /10 | Latency /10 | Perf | $/min | Value | Read |
|---|---|---|---|---|---|---|---|
| 1 | Inworld | 9.5 | 8.5 | 9.0 | 0.009 | ★★★★★ | top quality at bottom price |
| 2 | Cartesia | 8.5 | 10 | 9.25 | 0.03 | ★★★★ | best all-round perf, mid price |
| 3 | gpt-4o-mini-tts | 6.5 | 5.0 | 5.75 | 0.015 | ★★★ | cheap, but lowest quality + slowest |
| 4 | ElevenLabs | 9.0 | 9.5 | 9.25 | 0.045 | ★★★ | premium: pay for realism/voice library |

> Raw quality-per-dollar would rank gpt **above** Cartesia (it's half the price), but a **quality floor**
> applies — a voice below "warm enough" has ~zero value at any price — so for a companion gpt is discounted
> and Cartesia rises. ElevenLabs ranks last on *value* only (priciest); on absolute quality it's a co-leader.
> Quality scores synthesize blind-test data (Artificial Analysis Speech Arena / MOS) — confirm with your ears.

**Latency** (TTFB, fastest → slowest; **sub-150ms = natural-turn ceiling**):

| # | Provider | TTFB | Note |
|---|---|---|---|
| 1 | Cartesia Sonic-3.5 | ~40–90ms | fastest (Turbo ~40ms) |
| 2 | ElevenLabs Flash v2.5 | ~75ms | |
| 3 | Inworld | ~130ms (Mini) / ~250ms (Max) | Mini clears the ceiling |
| 4 | gpt-4o-mini-tts | ~300ms+ | the only one over the ceiling |

**Verdict:** **Inworld** wins price *and* value with near-top quality (use 1.5 Mini for <130ms);
**Cartesia** is the latency-safe all-rounder; **ElevenLabs** is the pay-for-character premium;
**gpt-4o-mini-tts** is the cheap, already-integrated baseline but its latency makes it weak for *live*
calls (fine for async TTS read-back). The §5b blind listen confirms quality, then pick.

### 5d. STT vendor — streaming is the gate (rankings; approximate, 2026-06)

A real-time call needs **streaming STT** (incremental partial transcripts + turn detection) — a
different capability than batch transcription.

> **Hard constraint:** **Groq `whisper-large-v3-turbo` is batch-only (no streaming).** It's the cheapest
> (~$0.04/hr, 216× real-time) and stays Groq-aligned, but you send a finished clip and wait — great for
> **v1 push-to-talk** and the roadmap's on-device→Groq STT-upgrade path, **not** for a live turn-taking
> call. The live-loop candidates are **Cartesia Ink** and **Deepgram Nova-3** (AssemblyAI as alt).

**Price** ($/min):

| # | Provider | ~$/min | Streaming? | Note |
|---|---|---|---|---|
| 1 | Groq Whisper v3-turbo | ~$0.0007 | ❌ batch | push-to-talk / async only |
| 2 | Cartesia Ink-Whisper | ~$0.0022 ($0.13/hr) | ✅ | cheapest streaming |
| 3 | AssemblyAI Universal-3 | ~$0.0025+ | ✅ | bundles intelligence we don't need |
| 4 | Deepgram Nova-3 | ~$0.0077 ($0.0065 Growth) | ✅ | priciest streaming, most proven |

**Latency** (first-partial P50; streaming only):

| # | Provider | P50 | Note |
|---|---|---|---|
| 1 | Cartesia Ink-Whisper | <100ms | latency leader |
| 2 | Deepgram Nova-3 | 90–130ms | |
| 3 | AssemblyAI Universal-3 | 100–150ms | |
| — | Groq Whisper | n/a | batch: full-utterance wait |

**Performance-per-cost** (streaming candidates):

| # | Provider | Read |
|---|---|---|
| 1 | Cartesia Ink | lowest WER claim + lowest latency + cheapest streaming + **native turn detection (Ink-2)** = best value |
| 2 | Deepgram Nova-3 | most proven/accurate, mature; pricier; **Flux** adds turn detection — the reliability pick |
| 3 | AssemblyAI | solid, but bundled speech-intelligence we don't need |

**Verdict — and it depends on the TTS pick:**
- **TTS = Cartesia → use Cartesia Ink.** One-vendor STT+TTS consolidation (single SDK/plugin/bill), and
  **Ink-2's native turn detection** (turn.start/end, eager-end) removes a whole VAD integration — a real
  spike simplifier. Cost: STT+TTS both on a newer vendor (concentration risk).
- **TTS = Inworld → use Deepgram Nova-3** (Inworld is TTS-only, so STT must come from elsewhere).
  Best-of-breed: the industry-default streaming STT + the value-winning TTS. Slightly pricier STT, two
  vendors, but each is best-in-class.
- **Groq Whisper stays** for v1 push-to-talk + the async STT-upgrade path (batch is fine there).

All candidates have a LiveKit Agents plugin. Net: the STT choice falls out of the TTS tie-break — Cartesia
TTS pulls Cartesia Ink (consolidate); Inworld TTS pulls Deepgram Nova-3 (best-of-breed).

---

## 6. Spike plan (2 weeks, 2 engineers)

- **Engineer A — transport:** LiveKit Cloud project + Node agent worker on Render; STT/TTS wiring;
  barge-in; the orphaned `client/app/voice-call.tsx` ported + given a nav entry (premium-gated, flagged).
- **Engineer B — safety core:** `screenOutputChunk` / `screenTranscriptDelta` adapters over L0–L3;
  the `ttsNode` gate; deterministic crisis interrupt + visual card + separate-connection logging;
  `voice_call_sessions` + `safety_events.modality` migration; per-minute limit.
- **Day 1:** prove the D-V2 Node caveat (`ttsNode` hold-and-gate; turn detection).
- **Integrate mid-week-2.** Demo = one persona, premium-only, flagged.
- **GA gate (post-spike):** a streaming-moderation safety eval (extend the eval harness with
  voice/streaming cases, FN=0) must pass before voice appears on the GA marketing surface.

---

## Sources

- LiveKit vs Pipecat: [latency benchmarks](https://sellerity.co/blog/livekit-pipecat-web-voice-agents) · [cost/maturity](https://www.channel.tel/blog/pipecat-vs-livekit-voice-framework-decision)
- LiveKit: [Node Agents SDK](https://github.com/livekit/agents-js) · [llmNode/ttsNode hooks](https://docs.livekit.io/agents/start/v0-migration/nodejs/) · [OpenAI Advanced Voice partnership](https://livekit.com/blog/openai-livekit-partnership-advanced-voice-realtime-api) · [pricing](https://livekit.com/pricing) · [Build-tier breakdown](https://www.cekura.ai/blogs/livekit-pricing) · [self-host UDP ports](https://github.com/livekit/livekit)
- Render: [HTTPS-only / no UDP ingress](https://feedback.render.com/features/p/support-udp)
- TTS: [ElevenLabs pricing](https://elevenlabs.io/pricing) · [Cartesia Sonic + pricing](https://www.cartesia.ai/pricing) · [real-time TTS comparison 2026](https://www.cekura.ai/blogs/best-tts-for-ai-voice-agents) · [latency benchmark 2026](https://gradium.ai/content/tts-latency-benchmark-2026) · [LiveKit TTS plugins](https://docs.livekit.io/agents/models/tts/)
- Voice agent latency breakdown: [Telnyx](https://telnyx.com/resources/voice-ai-agents-compared-latency) · [real-time vs cascading](https://softcery.com/lab/ai-voice-agents-real-time-vs-turn-based-tts-stt-architecture)
