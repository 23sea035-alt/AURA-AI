# Aura AI — Voice Pricing & Unit Economics

> Decision record + cost model for voice call limits and subscription pricing. Grounds the tiering in
> real backend costs (Groq STT + Inworld TTS + Groq LLM) and 2026 competitor benchmarks. Numbers are
> estimates pending real call-log validation. **The daily→monthly metering change (§8) is implemented
> as of 2026-07-02.**

## 1. Unit cost model (per voice-minute)

| Component | Rate | Per voice-minute |
|---|---|---|
| **Inworld TTS-2** (dominant cost; ~450 AI-spoken chars/min) | $25 / 1M chars on-demand | ~$0.011 |
| **Groq Whisper STT** (`whisper-large-v3-turbo`) | $0.04 / hr | ~$0.0007 |
| **Groq LLM** (generation, ~2–3 turns/min) | ~$0.0005 / turn | ~$0.002 |
| **All-in — on-demand** | | **≈ $0.015/min (~$0.90/hr)** |
| **All-in — Inworld $300/mo commit ($15/1M)** | | **≈ $0.008/min (~$0.48/hr)** |

TTS is ~75% of voice cost, so **Inworld's volume tier is the biggest margin lever** (see §7). Sources:
Inworld pricing (inworld.ai/pricing), Groq Whisper on GroqCloud (groq.com).

## 2. The metering unit

`voice_usage` rows record `durationSeconds` for both `stt` (user audio) and `tts` (estimated speech
seconds, ~14 chars/sec) directions. The budget = **sum of stt + tts seconds ≈ real conversation
seconds**. So a limit of `1200 s` ≈ 20 minutes of conversation. This unit is a good cost proxy because
the expensive TTS side is counted directly.

## 3. Why the *current* (daily) limits are unsafe

| Current limit | Max min/month | Worst-case cost/user (on-demand) |
|---|---|---|
| Free: 10 min/**day** (`VOICE_DAILY_LIMIT_SECONDS = 600`) | 300 | **$4.50/mo** on a $0 user |
| Premium: 60 min/**day** (`…_PREMIUM = 3600`) | 1,800 | **$27/mo** — exceeds any sane price |

A **daily** reset makes tail exposure **30× the monthly bucket**. Free daily voice is the #1 margin
killer; premium 60 min/day can cost more than the subscription. This is the core reason to switch voice
to a **monthly** bucket.

## 4. Competitor benchmark (2026)

| App | Free voice? | Monthly | Annual (eff.) | Voice policy |
|---|---|---|---|---|
| Character.AI | ✅ 3 calls/day | $9.99 | — | unlimited on c.ai+ (offsets via ads) |
| **Replika** (closest analog) | ❌ none | $19.99 | $69.99 (~$5.83/mo) | **voice is Pro-only** |
| Kindroid | ❌ (no free tier) | $14.99 | ~$8.33/mo | included in paid |
| Nomi | limited | $16 | ~$8.25/mo | included in paid |

**Signal:** nobody offers generous free voice. The emotional-companion leader gates it entirely behind
premium; the broad-catalog leader gives a tiny 3-calls/day taste + ads. Market band: **$10–20/mo,
~$70–100/yr.** Sources: aicompanionguides.com, support.character.ai, eesel.ai/blog/replika-ai-pricing.

## 5. Locked decisions (2026-07-02)

| Lever | Decision |
|---|---|
| **Free voice** | **20 min/month** (a taste + conversion hook), monthly reset |
| **Premium voice** | **600 min/month (10 hr)** cap — generous, *not* truly unlimited; monthly reset |
| **Per-call cap** | unchanged: **15 min free / 60 min premium** (runaway-mic guard) |
| **Reset period** | **monthly** for voice; **text stays daily** (30 msgs/day free) |
| **Price** | **$12.99/mo** + **$99.99/yr** (~$8.33/mo) as the pushed option |
| **Text (unchanged)** | free 30 msgs/day; premium unlimited |

Rationale for split reset periods: a text message costs ~$0.00007 (daily 30 is fine); a voice minute
costs ~200× that, so voice needs a monthly bucket to cap the tail to 1× (not 30×).

## 6. Margin analysis (premium)

Apple takes 15% (Small Business Program, <$1M) → **net ≈ $11.04/mo** ($12.99) or **~$7.08/mo** effective
($99.99/yr). Per-premium-user monthly cost:

- **Text (unlimited):** heavy ~50 msgs/day → ~$1.50/mo (conservative).
- **Voice:** average user uses a fraction of the cap (~90 min/mo) → ~$1.35/mo; **fully-capped** heavy
  user (600 min) → **$9/mo on-demand ($4.80 at volume)**.
- **Typical premium user total: ~$3–5/mo → healthy margin.** Fully-capped heavy user: ~$10–11/mo
  on-demand → near break-even, not a loss. At the Inworld volume tier, even the capped user is clearly
  profitable.

**Break-even:** fixed monthly floor is ~$40–70 (Neon + Render + Inworld base + Apple), so **~5–6
premium subs cover fixed cost.** The risk to profitability was never the price or fixed costs — it was
**uncapped/daily voice.** Capping voice monthly makes the model safe.

## 7. The Inworld volume lever

Committing to Inworld's **$300/mo tier ($15/1M chars)** roughly **halves** per-minute voice cost
(~$0.015 → ~$0.008/min). Trigger: once there are **~40+ active voice-premium users**, the commit pays
for itself and lets premium minutes stretch further at the same margin. Tracked as a scale action, not
a v1 launch requirement.

## 8. Code change — daily → monthly voice metering (IMPLEMENTED 2026-07-02)

Switched the voice budget from a per-UTC-day window to a per-calendar-month (UTC) window, with new
monthly limits. Per-call caps unchanged. What landed (kept as the record):

**`shared/src/index.ts`** — replace the daily constants (keep per-call as-is):
```ts
// was: VOICE_DAILY_LIMIT_SECONDS = 600 / _PREMIUM = 3600
export const VOICE_MONTHLY_LIMIT_SECONDS = 1_200;          // free: 20 min/month
export const VOICE_MONTHLY_LIMIT_SECONDS_PREMIUM = 36_000; // premium: 600 min/month (10 hr)
export const VOICE_CALL_MAX_DURATION_SECONDS = 900;         // unchanged (15 min/call, free)
export const VOICE_CALL_MAX_DURATION_SECONDS_PREMIUM = 3_600; // unchanged (60 min/call, premium)
```

**`server/src/services/voice/metering.ts`:**
- Rename `dailyLimitSeconds` → `monthlyLimitSeconds`; import the new constants.
- Rename `checkVoiceDailyLimit` → `checkVoiceMonthlyLimit`; change the window from UTC-midnight-today to
  **start of the current UTC month**:
  ```ts
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  // ...gte(voiceUsageTable.createdAt, monthStart)
  ```
- `VoiceMeteringResult` fields (`usedSeconds`/`limitSeconds`/`remainingSeconds`) are unchanged in shape.

**Callers to update** (rename + any "daily" wording): `server/src/routes/voice.ts` (`GET /api/voice/limits`,
`/start`), `server/src/websocket/handler.ts` (voice-start gate). The `GET /api/voice/limits` response
should label the period `"month"` for the client.

**Tests:** update `server/src/__tests__/*voice*`/metering tests — seed `voice_usage` rows across day
boundaries within the same month (still counted) and across month boundaries (excluded); assert the new
limits (1200 / 36000).

**Client copy** (product offering): free = "20 min of voice / month"; premium = "10 hrs of voice /
month". Price stays **store-driven** (RevenueCat renders the localized StoreKit price — never hardcode).

## 9. Assumptions, caveats & revisit triggers

- Assumes ~450 AI-spoken chars/min talk density and ~2–3 LLM turns/min — **validate against real call
  logs** once available; adjust caps if actual TTS density differs.
- Assumes most premium users use a fraction of the voice cap (standard for metered allowances). If the
  usage distribution skews heavy, either lower the premium cap or move to the Inworld volume tier sooner.
- **Revisit** if: Inworld/Groq pricing changes; voice attach-rate or per-user minutes exceed model;
  a feature-based multi-tier (voice-minutes-as-tier) is introduced (post-v1, per architecture §8).
