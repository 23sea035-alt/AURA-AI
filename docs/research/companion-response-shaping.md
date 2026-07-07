# Research: Shaping Companion Responses (length, warmth, human-likeness)

> Deep-research report (fan-out web search → source fetch → 3-vote adversarial verification →
> synthesis), 2026-07-08. Question: how should an AI companion size/shape text replies to feel warm
> and human rather than verbose, and what prompt changes follow. 104 agents, all findings cited +
> verified. Motivating data: our probe replies average **57 words / 3 sentences** (64% > 40 words;
> Cyrus/Selene/Amara 73-93 words) to one-line user messages.

## Findings (all adversarially verified; confidence + vote noted)

1. **Human texts are ~14 words, median 1 sentence — we're ~4x too long.** `[HIGH 3-0]`
   Lyddy et al. 2014 (JCMC 19(3), 936 msgs): mean 14.3 words, 70 chars, **median 1 sentence**;
   corroborated Thurlow & Brown 2003 (~14 words). → Target 1-3 sentences; treat a one-sentence reply
   as normal, not terse.
   Source: https://academic.oup.com/jcmc/article/19/3/546/4067601

2. **Turn-length matching is the dominant warmth channel.** `[HIGH 3-0]`
   Gao, Ver Steeg & Galstyan (PLOS ONE 2015): conditioning on length dropped other style-coordination
   scores ~4.8-6.7x — "longer utterances tend to be followed by longer responses." CAT (Giles) lists
   utterance length among convergence dimensions. → **Matching the user's message length is the single
   most human-feeling lever**; a one-line message should get a one-line reply.
   Sources: https://pmc.ncbi.nlm.nih.gov/articles/PMC4483141/ ,
   https://en.wikipedia.org/wiki/Communication_accommodation_theory

3. **Empathy is carried by brief backchannels, not sentences.** `[HIGH 3-0]`
   "oh," "oh no," "yeah," "hmm," "right," "I see" signal attention/understanding/sympathy without
   propositional content; a one-syllable "oh" does surprise + sympathy (Heritage 1984 change-of-state).
   → Give personas a small interjection lexicon so warmth is brief, not explanatory.
   Sources: https://en.wikipedia.org/wiki/Backchannel_(linguistics) ,
   https://www.iiste.org/Journals/index.php/RHSS/article/download/41978/43221

4. **Backchanneling has an optimal middle — more is NOT better.** `[HIGH 3-0]`
   Li, Cui & Wang 2010 (40 dyads): backchannel frequency negatively correlated with enjoyment
   (r(40)=-0.20, p<.05); too much reads "too eager to please," too little reads cold. → Use
   interjections **sparingly**; do not open every reply with "aw"/"oh no."
   Source: https://www.researchgate.net/publication/43968975

5. **Competitors manufacture warmth — and it shades into engineered sycophancy/deception.** `[MED 3-0]`
   TechPolicy Press: deception lives "in human-like conversational responses"; bots are "relentlessly
   agreeable, and specifically personalized." Corroborated by Science 2026 (sycophancy → dependence) +
   Stanford 2026 (flattery → more returns). → Brief emotive tokens are legitimate, but **avoid
   pretending to feel / have a biography, and avoid pure sycophancy** — the exact behavior regulators
   target.
   Source: https://www.techpolicy.press/ai-chatbots-are-emotionally-deceptive-by-design/

6. **OSS character-card levers control length far better than prose.** `[HIGH 3-0]`
   SillyTavern: "The model is more likely to pick up the style and length constraints from the first
   message than anything else"; FAQ advises "short spoken"/"doesn't talk much" + brief first message +
   lower Response Length; example-dialogue "more effective than lengthy explanations"; card-spec v2
   defines `post_history_instructions` (placed after chat history). → **Rewrite each pack's exemplars +
   greeting to BE the target 1-3 sentence length** (strongest lever); move the length/in-character rule
   to a post-history slot.
   Sources: https://docs.sillytavern.app/usage/core-concepts/characterdesign/ ,
   https://docs.sillytavern.app/usage/prompts/ ,
   https://github.com/malfoyslastname/character-card-spec-v2/blob/main/spec_v2.md

7. **Naive "reply in N words" directives are unreliable.** `[HIGH 3-0]`
   arXiv 2508.13805: exact-length compliance <30% (GPT-4.1) vs >95% with structured methods. → Our
   "keep to 2-4 sentences" line is a weak lever; rely on **exemplar sizing + range guidance + a soft
   token cap**, treat any word target as a nudge.
   Source: https://arxiv.org/html/2508.13805v1

8. **Honest-AI disclosure is legally mandated.** `[HIGH 3-0]`
   California SB 243 (Cal. Bus. & Prof. Code 22602(a), signed Oct 2025): clear/conspicuous notice that
   the chatbot is not human whenever a reasonable person could be misled. → Standing rule: warm and
   personal, but answer truthfully and plainly "I am an AI" whenever asked; never claim to be human.
   Source: https://www.skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law

## Synthesis

Warmth in text is carried by **turn-length matching** + **sparing brief backchannels**, not word count.
The reliable brevity levers are **short in-persona exemplars** (the single strongest), a **turn-matching
rule**, an **anti-assistant-brain** instruction, and a **soft** token cap as backstop; naive
sentence-count directives are unreliable. Keep warmth honest (no faked feelings/biography, honest-AI
disclosure).

## Mapping to our system

| Lever | Current | Change |
|---|---|---|
| Exemplars (strongest) | teach ~40-90 word replies | rewrite short + in-persona for all 12 |
| Length rule | "keep to 2-4 sentences" (weak) | turn-matching + "give room when asked for a story/detail" |
| Assistant-brain | unaddressed | add "companion, not assistant; don't over-explain/summarize/list" |
| Backchannels | none | small per-persona lexicon, used sparingly |
| Rule position | mid-prompt | post-history (survives long chats) |
| Token cap | `GENERATION_MAX_TOKENS=512` | **keep generous** — turn-matching (adaptive) handles length-on-demand; a hard cut would truncate legitimate long/story requests |
| Honest-AI | "never claim human" ✓ | keep + guardrail against faked feelings/biography |

## Pitfalls

- Soft range + generous cap, not a brutal hard cap (avoid mid-thought truncation, esp. story requests).
- Mirror **length only**, not vocabulary/dialect (over-mirroring breaks persona).
- Over-backchanneling reads needy (finding 4).
- Warmth must stay honest — no sycophancy, no pretending to be human (finding 5, 8).
