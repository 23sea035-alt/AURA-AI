# Aura AI — Legal & Compliance Research

> **Not legal advice.** This is an engineering-side research artifact to inform document
> drafting and a licensed-attorney review. It captures the regulatory landscape for AI companion
> chatbots (as of **2026-07**), the tooling assessment, and a repo gap-map. Nothing here substitutes
> for counsel. Where a call depends on law, it is marked **[LEGAL-REVIEW]**.

## 0. The core reality

- **No document makes you immune from liability.** Terms/Privacy docs (a) keep you *compliant* with
  statutes, (b) make you *transparent* (defeats "deception" claims), and (c) *shift assumable risk*
  (disclaimers, limitation of liability, arbitration). They do **not** immunize you from statutory
  violations or safety-based negligence claims.
- **AI companion chatbots are, right now, one of the most heavily regulated/scrutinized software
  categories in the US.** Your **safety design controls matter as much as the paperwork** — and Aura
  already implements many of them (crisis detection, moderation, AI disclosure, break reminders).

## 1. Regulatory landscape for companion chatbots

### 1a. California SB 243 — Companion Chatbots (in effect 2026-01-01) — **highest priority**
Applies to **any operator making a companion chatbot available to California users** (no 18+ carve-out).
Core obligations:
- **AI disclosure** — clear/conspicuous notice that the bot is AI, where a reasonable person could be
  misled it's human.
- **Self-harm/crisis protocol** — prevent production of suicidal-ideation/self-harm content and **refer
  at-risk users to crisis services** (e.g. 988, Crisis Text Line).
- **Publish the crisis protocol on your website** (public page).
- **Minor-specific** (default-on for known minors): AI-notice, 3-hour break reminders, block sexually
  explicit content. Aura is 18+, but the general disclosure + crisis duties still apply.
- **Enforcement: private right of action — greater of actual damages or $1,000 per violation, plus
  injunctive relief and attorneys' fees.** Annual reporting to CA Office of Suicide Prevention from
  2027-07-01.
- Sources: Skadden (skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law),
  CA Legislature SB 243 (leginfo.legislature.ca.gov, bill 202520260SB243).

### 1b. It's a multi-state wave (not one law)
Future of Privacy Forum tracks **98 chatbot bills across 34 states**. Notable live/near:
- **New York** — GBL Article 47 (eff. ~2025-11): self-harm/suicidal-ideation safety protocols.
- **Utah HB 452** — "mental health chatbot" disclosure; no selling user health info without consent.
- **Oregon SB 1546**, **Washington HB 2225** — companion-chatbot disclosure + minor safety.
- **Tennessee SB 1580** (eff. 2026-07-01) — AI may **not present itself as a licensed mental-health
  professional**. (Aura's prompt already deflects medical specifics — keep this.)
- **Nebraska LB 525** — Conversational AI Safety Act (eff. 2027-07-01).
- **FTC** — 6(b) inquiry into companion chatbots (consumer-protection / deception lens).
- Sources: FPF 2026 Chatbot Legislation Tracker (fpf.org/2026-chatbot-legislation-tracker),
  Orrick "2026 State Chatbot Laws" (orrick.com).

### 1c. Privacy law baseline (CCPA/CPRA + US state laws + GDPR if EU)
Privacy policy must disclose: data collected, purposes, **third-party processors/subprocessors**,
retention, and **data-subject rights** (access/delete/correct/portability/opt-out). Intimate companion
conversations likely qualify as **"sensitive personal information" (CPRA)** → heightened handling +
"limit use of sensitive PI" right. Sign **DPAs** with each processor. EU/EEA/UK adds GDPR + EU AI Act
transparency (chatbots = limited-risk, must tell users they're talking to AI). **[LEGAL-REVIEW]**:
served jurisdictions (US-only vs EEA/UK), GDPR Art. 9 special-category data, SCCs for transfers.

### 1d. Apple App Store (App Review gate — blocks release, not a law)
- **Guideline 5.1.2(i) (Nov 2025)** — must get **explicit, unbundled consent and clearly disclose
  before sharing personal data with third-party AI.** Aura streams messages to Groq/OpenAI/Inworld →
  **this is a required consent moment**, not a blanket ToS accept. (See gap G4.)
- **In-app account deletion** mandatory; **privacy policy link** in App Store Connect *and* in-app.
- **Guideline 1.2 (UGC)** — content filtering, report mechanism w/ timely response, user blocking,
  published contact. Aura already reports messages → `safety_events`.
- Source: TechCrunch 2025-11-13 (apple new app review guidelines third-party AI).

## 2. Tooling assessment (what's actually usable for Aura's stack)

| Option | Good for | Cost / License | Verdict for Aura |
|---|---|---|---|
| Open-source policy templates — [basecamp/policies](https://github.com/basecamp/policies) (CC-BY), [Automattic/legalmattic](https://github.com/Automattic/legalmattic) (CC BY-SA), [github/site-policy](https://github.com/github/site-policy) (CC0), [ankane/awesome-legal](https://github.com/ankane/awesome-legal) | Reputable **drafting skeleton** for the standard 80% | Free | ✅ Use as base; **none cover AI-companion / SB 243 clauses** |
| Commercial generators — [Termly](https://termly.io) (US/CCPA-CPRA + state), [iubenda](https://www.iubenda.com) (EU/multilingual, ISO 27001), GetTerms | Structured **first-pass** privacy/cookie/EULA/DSAR scaffolding | ~$10–40/mo | ⚠️ Good cross-check; **won't write crisis/AI-companion clauses** |
| [Privado](https://github.com/Privado-Inc/privado) — OSS privacy **code scanner** (data-flow map → Apple Privacy Manifest / RoPA) | Auto data-flow mapping | LGPL/GPL, free | ❌ **OSS is Java/Python only today** — no JS/TS, can't scan the Node backend |
| **Code-grounded inventory (this repo)** | The real data-flow map / RoPA basis for Aura | — | ✅ **Best fit** — done manually; see the compliance inventory |

**Workflow:** code inventory (data map) → draft on OSS skeleton + bespoke AI-companion clauses →
optional Termly cross-check → publish SB 243 crisis page → **attorney review before launch**.

## 3. Repo gap-map (what Aura has vs. needs)

**Already in place (strong):** AI disclosure (onboarding + 25-turn in-chat notice + system-prompt
"say you're an AI when asked"); crisis protocol enforced in-prompt (mandatory 988 + Crisis Text Line)
+ L0 detection + resources; deletion lifecycle (soft-delete → 30-day grace → hard purge → Clerk
propagation → `deletion_audit`); data export; 18+ age gate; break reminders; message reporting →
`safety_events`; voice metering with **no audio/transcript stored**; ToS-acceptance capture.

> **Correction to the 2026-06 audit:** finding **C3** (system prompt forbids AI self-disclosure) is
> **already fixed** — `prompt-assembler.ts` now says "you are an AI … say so plainly and warmly."
> H4/H5/H6 also appear remediated in current code. **The remaining work is documents, not engineering.**

| ID | Gap | Priority |
|---|---|---|
| **G1** | **No Terms of Service / EULA exists** (only referenced via `tosAcceptedVersion` + onboarding copy). Needs AI disclaimer, not-professional/medical/mental-health-advice, not-a-licensed-professional (TN SB 1580), assumption of risk, 18+, acceptable use, warranty disclaimer, **limitation of liability**, **arbitration + class-action waiver**, DMCA/UGC, governing law. | **Highest** |
| **G2** | **Privacy Policy is a draft** with counsel TODOs; also **omits OpenAI (moderation) processor** and Neon/Render/Sentry infra subprocessors, and says "Llama 3.1" (actual: `llama-3.3-70b-versatile`). | High |
| **G3** | **SB 243 crisis protocol not published** on a public page. | High |
| **G4** | **Apple 5.1.2(i)** — onboarding lacks explicit unbundled disclosure/consent that messages go to third-party AI; the "your conversations are private" card is potentially misleading. | High |
| **G5** | **DPAs not executed** with processors (Groq no-training, OpenAI, Inworld, Clerk, RevenueCat, Neon, Render, Sentry). | High (counsel/ops) |
| **G6** | Confirm multi-state coverage (NY/UT/OR/TN) — mostly satisfied by existing safety design + a "not a licensed professional" disclaimer. | Medium |

## 4. Third-party processors (data map — for the privacy policy)

| Processor | Data received | Purpose | DPA |
|---|---|---|---|
| Groq | Conversation text; voice audio (STT) | LLM generation (`llama-3.3-70b-versatile`) + Whisper STT | **[LEGAL-REVIEW]** no-training |
| OpenAI | User/assistant message text | Moderation (omni-moderation, gpt-oss-safeguard) | **[LEGAL-REVIEW]** |
| Inworld | Text replies | TTS 2 synthesis | **[LEGAL-REVIEW]** |
| Clerk | Email, password, OAuth `sub` | Auth (Aura stores only `clerk_user_id`) | **[LEGAL-REVIEW]** deletion propagation |
| RevenueCat / Apple | Subscription status, entitlements | IAP entitlements (no card data to Aura) | standard |
| Apple APNs | Push token | Push notifications | standard |
| Neon | All personal data at rest | Postgres host | **[LEGAL-REVIEW]** |
| Render | App process | Hosting | **[LEGAL-REVIEW]** |
| Sentry (optional) | Error messages/stack traces | Error monitoring | **[LEGAL-REVIEW]** |

## 5. Documents in this workstream (status)

1. ✅ `terms-of-service-draft.md` (G1) — drafted (was wholly missing).
2. ✅ `privacy-policy-draft.md` (G2) — finalized against the code data map (added OpenAI + Neon/Render/Sentry, fixed model name, sensitive-PI).
3. ✅ `crisis-protocol.md` (G3) — drafted (public SB 243 page).
4. ✅ `apple-third-party-ai-consent.md` (G4) — remediation spec drafted (consent copy is `[PRODUCT]`-pending; client change not yet implemented).
5. ⏳ DPA execution + subprocessor list (G5) — counsel/ops, tracked in GO-LIVE Gate 5.
6. ⏳ Multi-state coverage confirmation (G6) — counsel.

All drafts carry **[LEGAL-REVIEW]** tags and remain planning artifacts until a licensed attorney reviews.
