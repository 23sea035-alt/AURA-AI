# D-1 Suspension Policy — Industry & Regulatory Research

**Date:** 2026-07-09 · **Purpose:** validate the D-1 fix (scope the auto-suspend counter to genuine
user violations; exclude crisis disclosures, AI-fault output blocks, and user-reports).
**Method:** deep-research harness — fan-out web search, source fetch, 3-vote adversarial verification
per claim. **Note:** the automated synthesis step failed (session usage limit hit mid-run); the 22
verified claims below are hand-assembled from the completed verification pass. Vote = refute-panel
result (`3-0` = unanimously survived; `2-1` = survived a split).

---

## Bottom line

Our D-1 direction is **well-aligned with both industry practice and current US regulation.** The
consensus across Character.AI, Kindroid, and California law is: **a crisis disclosure is met with
support (crisis-line referral), never an account penalty.** Two findings go *further* than our current
plan and are worth folding in (see "Implications").

---

## 1. Crisis disclosure → support, not punishment (the core question)

- **Character.AI** routes self-harm/suicide phrases to a **988 / National Suicide Prevention Lifeline
  pop-up**, not an account penalty. It draws an explicit line between *prohibited content* ("promotion
  or depiction of self-harm") and a *user's crisis disclosure*, which is routed to help. `[3-0]`
  (character.ai/community-guidelines, venturebeat.com)
  - Caveat: its Safety Center page frames self-harm as a "prohibited" category with no mention of
    crisis routing — so its own public framing is internally inconsistent. `[3-0]`
- **Kindroid**: disclosing self-harm/ideation is **explicitly not a violation**; only *concrete,
  imminent planning* flags, and that flag routes to mental-health resources. It draws a bright line
  between "venting hopelessness" (protected) and a described plan ("60 sleeping pills … this Friday",
  a violation). `[3-0] / [2-1]` (kindroid.ai/docs)
- **RAND** commentary: responding to a distressed user with a canned refusal/cutoff ("I can't help
  with that") is *itself* a harmful design choice — reaching out creates an obligation to respond.
  `[3-0]` (rand.org) — direct support for not treating crisis as violation-and-cutoff.
- **Counterexample (what not to do): Nomi.ai** does *not* filter/redirect self-harm; its bot supplied
  explicit suicide methods and the company framed guardrails as "censorship." `[3-0]`
  (technologyreview.com) — the cautionary tale, not a model.

## 2. Punishing the person who reports is a documented harm

- **Nomi.ai**: a user who reported the bot's harmful self-harm output was **suspended from the
  company Discord for a week with no explanation** — the reporter punished for surfacing a crisis-
  related AI failure. `[3-0]` (technologyreview.com) → direct validation for excluding `user_reported`
  from our counter.
- **Nomi complaints policy**: reports are confidential and enforcement targets the *offending*
  account (content removal → warning → restriction → suspension) — **but filing *false/misleading*
  reports can get the *reporter* penalized.** `[3-0]` (nomi.ai/complaints-policy) → nuance: excluding
  good-faith reports is right; a separate abuse-of-reporting signal is legitimate.

## 3. Enforcement models & thresholds

- **Kindroid**: **warning-first, no instant lockouts** — first violation = in-app warning; only
  *continued* violations in later scans → automatic lock. No published numeric strike threshold.
  `[3-0]` (kindroid.ai/docs)
- **Nomi**: graduated outcomes — content removal, warnings, restrictions, suspensions. `[3-0]`
- No app in the sample publishes a hard "3 strikes / 30 days"-style number; the norm is
  **graduated + warning-first**, not a silent hard cutoff.

## 4. Regulatory / legal pressure (raises the stakes, US-first)

- **California SB 243** *mandates* that a companion-chatbot operator maintain a protocol to **refer a
  user expressing suicidal ideation/self-harm to crisis-service providers**, and to publish that
  protocol — i.e. crisis referral is a **legal duty**, wholly separate from any user-violation regime.
  `[3-0]` (skadden.com)
- **Samaritans** industry guidance: platforms should **never use AI/automated moderation as the sole
  decision-maker** for self-harm/suicide content — automation should *triage for human review.*
  `[3-0]` (samaritans.org) → bears directly on our **fully-automated** auto-suspend with no human in
  the loop.
- **FTC 6(b) inquiry** (Sept 11, 2025) into 7 companion-chatbot companies (incl. Character
  Technologies, OpenAI, Meta, Snap, xAI, Alphabet, Instagram) — companion-app safety practices are
  under active federal scrutiny. `[3-0]` (ftc.gov)
- **Character.AI wrongful-death (Sewell Setzer III, 14, d. Feb 2024)** settled in the M.D. Fla.;
  drove Character.AI's safety clampdown and its ban on under-18 open-ended chat. `[3-0] / [2-1]`
  (cbsnews.com, futurism.com, venturebeat.com)
- **Google Play** AI policy makes the *developer* (not the user) responsible for preventing AI output
  that encourages self-harm. `[3-0]` (support.google.com)

---

## Implications for D-1

1. **Our plan is validated.** Excluding `crisis_detected`, `output_blocked`, and `user_reported` from
   the suspend counter — and counting only genuine user violations (`input_blocked`,
   `injection_detected`) — matches the industry norm and is *reinforced* by SB 243 (crisis = referral,
   not penalty) and by the documented Nomi harm (don't punish the reporter). Allowlist approach stands.
2. **Consider graduated / warning-first enforcement** (Kindroid model) instead of a silent hard
   auto-suspend at a fixed count. A warning before a lock is the sampled norm.
3. **Consider a human-in-the-loop / appeal step** for any account action touching safety-adjacent
   signals (Samaritans: never fully automate self-harm decisions). Our current silent, appeal-less
   auto-suspend is the piece most out of step with guidance — worth at least an appeal path and a
   notice, even if the counter itself is scoped correctly.

*(2 & 3 are enhancements beyond the minimal P0-adjacent D-1 fix — flag for product decision, not
required to make the counter correct.)*
