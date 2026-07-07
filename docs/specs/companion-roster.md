# Companion Roster, Gating & First-Conversation — v1 Spec

> **Status: agreed direction, pre-implementation (2026-07-07).** The single build-against doc for the
> companion *roster lifecycle*: how many companions a user can have, what free vs premium can do when
> creating/editing them, how archive/restore/delete/clear work, how the picker is presented, and how a
> conversation begins. Companion *identity* (the 12 voice packs) lives in
> [personas.md](./personas.md) + [companion-gallery-identities.md](./companion-gallery-identities.md);
> the *art/appearance pipeline* lives in [companion-customization.md](./companion-customization.md).
> This doc supersedes those two on **caps, gating, archive, and conversation-starts**.

## 1. The model in one paragraph

Free users are **real creators**, not spectators. A free user builds a roster of up to **5 active**
companions by picking from the curated gallery of 12, naming them, and chatting; premium raises the
active cap to **15** and unlocks the two things that were always the paid surface — **personality
tuning** (the trait grid) and **avatar look**. Nothing is ever "locked" as a companion: the gate is
*partial* (tuning + look), never *who can hold you*. Onboarding seeds nothing automatically — the user
**chooses their first companion (1 of 12)** and lands straight in that chat, where the companion opens
with a warm, in-voice message. Every companion after that starts from a persona-flavored empty state
with starter chips the **user** initiates. A companion is a **relationship, not a folder**: one
companion = one continuous conversation = one persistent memory (§7).

## 2. Caps — single source in `@aura/shared`

Both server (enforcement) and client (gate UI + at-limit sheet) import these. Follows the existing
`FREE_DAILY_LIMIT` / `VOICE_MONTHLY_LIMIT_SECONDS(_PREMIUM)` pattern.

```ts
// @aura/shared
export const MAX_ACTIVE_COMPANIONS_FREE = 5;
export const MAX_ACTIVE_COMPANIONS_PREMIUM = 15;
export const MAX_TOTAL_COMPANIONS_FREE = 20;      // active + archived backstop (anti-abuse only)
export const MAX_TOTAL_COMPANIONS_PREMIUM = 50;
```

- **Active cap** = the product limit. Counts rows where `archived_at IS NULL`. What the user feels and
  what the paywall sells.
- **Total cap** = anti-abuse backstop (active + archived). Prevents archive-stacking from accumulating
  unbounded rows/history/memories. Never surfaced as a feature; only shown if actually hit.
- **Archived and deleted companions do NOT count toward the active cap.**
- **Minimum 1 active** at all times (Home needs a pinned companion — §6).

## 3. Tiers — the partial gate

| Capability | Free | Premium |
|---|---|---|
| Create a companion (pick from 12 + name) | ✅ | ✅ |
| Active companions | 5 | 15 |
| Rename | ✅ | ✅ |
| Delete a custom companion | ✅ | ✅ |
| Archive / restore | ✅ | ✅ |
| Clear conversation / Forget everything | ✅ | ✅ |
| **Tune personality (trait grid)** | ❌ | ✅ |
| **Change avatar look** | ❌ | ✅ |
| Premium voices, unlimited messages, voice minutes | ❌ | ✅ |

A free user's companions are gallery presets at their **default traits + default look**, renamed to
taste. Tuning and look are the paid surface — enforced server-side (§9), not just dimmed in the UI.

## 4. Create flow

- **Picker = a bounded, user-driven carousel** of larger cards (avatar + name + tagline), **not** the
  12-item grid. Bounded (no looping — it's a selection task; the user must be able to tell they've seen
  all 12). **Peek the neighbors** (~1.2–1.4 cards per viewport) and show a **"3 / 12" counter / dots**
  so discoverability of the 9 gallery personas survives. **Tap to select** (never center-to-select).
  Same component in onboarding and create; onboarding leans harder on the discoverability cues since
  it's the highest-stakes pick.
- **Partial gate, not a dimmed form.** Base-picker + name + Save stay live for free. Only the **trait
  Segmenteds** and the **change-look badge** carry a small "Premium" affordance. The primary CTA reads
  **"Save companion"** for free users (not "Unlock with Premium").
- **Two at-limit cases** (distinct — don't conflate), shown as a bottom sheet, never a paywall redirect:
  - **Active-full** (active == active cap, total has room): *"You're at 5 companions. Archive one to
    make room, or go Premium for more."* → Free `[Archive a companion]` `[Go Premium]`; Premium
    `[Archive a companion]`. `[Archive a companion]` drops the user into the roster in Select mode on
    the Active tab (§12).
  - **Total-full** (total == total cap — archiving can't help, since it doesn't reduce total): *"You've
    reached your total of 20 companions. Delete some archived ones to make room."* → `[Manage archived]`
    (opens the Archived tab in Select mode). Free also gets `[Go Premium]` (premium's total is higher);
    premium gets delete-only.

## 5. Edit flow

Same partial gate: free can rename; tuning + look are premium-gated (with the "Premium" affordance).
A companion's base persona is fixed after creation (identity is the voice pack); editing changes name
(free) and — for premium — traits + look. Per-companion Edit is **not** the same as Select mode (§12):
Edit opens the editor for one companion; Select is batch archive/delete/unarchive.

## 6. Archive / restore / delete lifecycle

- **Archive** = reversible soft-remove (`archived_at = now`). Preserves messages + memories.
- **Restore** = `archived_at = null` — **blocked when active is already at the cap** (same sheet as §4
  active-full). Batch restore **restores up to the remaining slots and informs** the user of the rest
  (e.g. "Restored 2, you're at your 5 limit — archive more to bring the others back"), rather than
  half-failing silently. *This guard does not exist server-side today and must be added.*
- **Delete** = permanent. **Custom companions are deletable by anyone (incl. free).** The **3 anchor
  base personas are archive-only** (server returns `CANNOT_DELETE_BASE`). Delete is a secondary,
  destructive action behind a confirm that names what's lost: *"Delete {Name}? This removes your
  conversation and memories with them. This can't be undone."* Archive is the prominent, reversible
  default.
- **Minimum 1 active.** A user can never archive or delete their **last active** companion (Home needs
  a pinned companion). Single-item and batch both enforce it; the server already returns
  `LAST_ACTIVE_COMPANION` for archive and must extend it to delete + batch.
- **Primary/pinned fallback.** Archiving or deleting the Home-pinned companion **re-pins the next
  active survivor** (server unpins today; ensure it re-pins rather than leaving Home pointing at
  nothing). Batch operations re-pin once, after the batch settles.
- **No companion is ever "locked."** Remove the lock badges entirely (roster + create).

## 7. Conversations are 1:1 (+ Clear / Forget)

**Locked direction:** one companion = **one continuous conversation** = **one persistent per-companion
memory** (messages and memories are keyed by `companion_id`; there is no thread concept, and none is
added). A companion is a relationship, not a folder of chats.

- **No multiple conversations per companion.** It would fragment memory, break the "she remembers me"
  premise, and require a `thread_id` on messages + memories plus a memory-pipeline rework. The need it
  would serve — separate contexts — is met by **creating another companion** (the roster exists for
  exactly this).
- **Two in-chat conversation-reset actions** (v1, sequenced **after** the roster work). Both live in
  the **chat** header/overflow, never the roster, so they don't collide with Archive/Delete:
  - **Clear conversation** — wipes the transcript; **keeps the companion and its memories**. A fresh
    page, same relationship (the companion still knows your facts).
  - **Forget everything** — wipes the transcript **and all memories**; keeps the companion shell
    (name, look, base persona) and clears the `remember_*` pointer. A relationship reset short of
    deletion.
- After either, the chat shows the **empty-state recs** (user-initiated, §10) — **not** an onboarding
  opener (openers are onboarding-#1-only).
- **Surgical memory control stays separate:** the long-term-memory screen (`PATCH`/`DELETE
  /memories/:id`) is the "forget one specific thing" path — the common case, and better than a blunt
  wipe.

**The four verbs, disambiguated:**

| Verb | Scope | Companion | Transcript | Memories | Reversible | Where |
|---|---|---|---|---|---|---|
| **Clear conversation** | transcript | kept | wiped | **kept** | no | in-chat |
| **Forget everything** | transcript + memory | kept (shell) | wiped | wiped | no | in-chat |
| **Archive companion** | companion | shelved | kept | kept | **yes** | roster |
| **Delete companion** | companion | removed | gone | gone | no | roster |

## 8. Archived-chat UX

Opening an archived companion's chat shows the **same UI with full read-only history** — reading is
always free. The **composer is replaced** by an inline bar: *"This chat is archived · [Unarchive]"*.
Unarchive runs the §6 active-cap check. Only re-activating (which consumes a slot) is gated; reading
never is.

## 9. Server enforcement (the part that makes it true)

Client gating is UX; the server is the source of truth. Tier is already known via `users.is_premium`
(reconciled from RevenueCat; loaded by `loadUserTier()`), so this is cheap.

- **`POST /companions`** — reject when `count(archived_at IS NULL) >= activeCap(isPremium)` (active-full)
  or `count(*) >= totalCap(isPremium)` (total-full), with distinct codes the client maps to the two §4
  sheets.
- **`POST /companions/:id/restore`** — active-cap check before clearing `archived_at`; batch restores
  fill up to the remaining slots.
- **Archive / delete** — enforce **minimum 1 active** (`LAST_ACTIVE_COMPANION`, extended to delete +
  batch); re-pin primary on the pinned one leaving.
- **Partial-gate coercion** — for a **free** caller, create/update **forces `traits =
  preset.defaultTraits`** and **ignores any non-default `lookId`** (never trust the dimmed client).
- **Clear / Forget** — Clear deletes the companion's messages only; Forget deletes messages + memories
  and clears `remember_*`. Both keep the companion row. (New routes, e.g. `DELETE
  /companions/:id/messages` and `POST /companions/:id/forget`.)
- **Seeded openers** (§10) are written server-side, **not** counted against the 30/day cap, and **not**
  LLM-invoked.

## 10. Conversation starts

Split by context — the first companion is special; the rest are user-initiated.

| | Onboarding companion #1 | Every companion after |
|---|---|---|
| Companion speaks first? | **Yes** — a real seeded assistant **message** | No |
| Empty state | opener message + reply chips | persona line + starter chips |
| Who initiates | companion greets, user replies | **user** initiates |

- **Onboarding → straight into the first chat** after the 1-of-12 pick.
- **Opener message (companion #1 only):** a real assistant message, **written server-side** at
  first-chat creation so it persists + syncs. Chosen **at random from a pool of 6–8 per-persona
  openers** (`openers[]`, §11, Appendix A). **Not** LLM-generated (protects the fragile first
  impression) and **not** counted against the 30/day cap. Carries a **`{firstName}`** slot (filled from
  onboarding); **no time-of-day** slot in v1.
- **Every other companion:** no opener message. A **persona-flavored empty state** (avatar + name + a
  short in-voice line from the persona's tagline/stance) + **2–3 starter chips**. Presentation, not a
  chat message — the clean line between it and the opener.
- **Starter chips:** empty-state only (0 user messages); **vanish once the user sends**. Tapping a chip
  **pre-fills the composer with a natural first-person sentence** (editable, not auto-sent) — reusing
  the Home starter-chip pattern — so the **user** still presses send. Drawn from a per-persona
  `starters[]` pool (§11, Appendix A).

## 11. Persona content lives in the shared voice pack

Extend `PersonaVoicePack` in `@aura/shared` so opener/starter content travels with the persona (no
client/server drift), next to `stance` / `devices` / `exemplars`:

```ts
interface PersonaVoicePack {
  // …existing…
  openers: string[];   // 6–8 warm in-voice first messages; may contain a {firstName} slot. Onboarding only.
  starters: string[];  // empty-state starter-chip seeds (first-person sentences the user can edit + send).
}
```

The server owns opener-message creation; the client renders `starters` as chips. Draft copy for all 12
in **Appendix A**.

## 12. Companions tab UX

- **Floating "+" CTA (FAB)** for create — reads "create is a first-class free action" better than a
  header "+", and is *more* discoverable. Watch tab-bar clearance (known repo gotcha: `marginHorizontal`,
  keep above the floating tab bar; don't cover the last list row). **FAB shows on the Active subtab
  only** — it's hidden on Archived (a management view) and hidden in Select mode.
- **Header control: the word "Select"** (right-aligned, secondary weight). No icon: none of the
  candidates (`checkmark-circle-outline`, `ellipsis`) reads unambiguously as "enter multi-select" —
  they read as "done" / "more" — which is exactly why iOS itself uses the word here. Enters Select mode.
- **Active / Archived subtabs** already exist; keep.
- **Select mode (multi-select archive/restore/delete):**
  - **Replaces the tab bar with a contextual action bar**, and **hides the FAB**, so nothing fights for
    the bottom. Header shows a selection count + **Done**.
  - **Actions are contextual to the subtab:** Active → `Archive`, `Delete`. Archived → `Unarchive`,
    `Delete`.
  - **`Delete` is disabled when the selection contains a base persona** (Aurora / Orion / Lyra), with
    the reason surfaced ("Base companions can be archived, not deleted"). Cleaner than a partial delete
    that silently skips some.
  - **Batch `Unarchive` honors the active cap** — restores up to the remaining slots and informs (§6).
  - **Minimum 1 active** — a batch can't archive/delete every active companion (§6).
  - **`Delete` confirms** with the destructive copy from §6; Archive/Unarchive apply directly.
  - **Entry points:** the header "Select"; a **long-press on a row** jumps into Select with that row
    pre-checked; the §4 at-limit sheet's "Archive a companion" / "Manage archived" drop the user into
    Select on the relevant subtab.
- **No lock badges** anywhere.

## 13. Downgrade / grandfathering

Premium→free (or a future cap change) can leave a user **over** the active cap. Never delete or
force-archive their companions. **Soft-lock**: existing actives stay usable, but **new creates and
restores are blocked** until they're back under the free cap. State the rule in the at-limit copy so it
isn't perceived as data loss.

## 14. Copy & doc reconciliation (follow-up chores)

- Rewrite `client/constants/content/paywall.ts` — "3 base companions" is the *old* model; free is now
  "up to 5 companions." Note the 30/day message cap is **per user, shared across all companions** —
  more companions never buys more messages.
- `companion-customization.md` §5/§7/§8 already updated to 5 / 15 with the two `[DECIDE]`s resolved.

## 15. Build sequence

1. **`@aura/shared`** — the four cap constants + `openers[]` / `starters[]` on the voice pack; land the
   Appendix A copy.
2. **Server** — active + total cap guards (create); active-cap guard (restore); min-1-active on
   archive + delete; free-tier trait/look coercion; server-written onboarding opener (cap- and
   LLM-exempt).
3. **Client (core roster)** — carousel picker (onboarding + create); partial gate (tuning/look only);
   two at-limit sheets; archived-chat composer replacement; persona-flavored empty state + starter
   chips; remove lock badges; FAB create.
4. **Client (fast-follow #1)** — Select mode (contextual action bar; per-subtab actions; base-delete
   disable; batch-unarchive-up-to-limit; min-1-active).
5. **Client (fast-follow #2, still v1)** — Clear conversation + Forget everything (in-chat), with the
   two server routes.
6. **Verify on sim** (both themes; onboarding→first-chat opener; both at-limit sheets; archived-chat;
   Select mode; Clear/Forget).
7. **Chores** — paywall/customization copy reconciliation.

## 16. Open items

- Whether to expand any opener pool from 6 to 8 (Appendix A ships 6 + 3; v1 shipped with 6).
- ~~Header control: shipping as the word "Select" unless sim testing of `checkmark-circle-outline`
  proves it reads clearly.~~ **Resolved (2026-07-07): shipped as the word "Select"** — sim-verified
  alongside the selection-count + Done swap; no icon candidate was tested further since the word
  reads unambiguously in place.

---

## Appendix A — Opener & starter copy (draft)

Tuned per persona to stance / lexicon / verbosity (concise personas get shorter openers). Sentence
case, no em dashes, `{firstName}` in ~half of each opener pool. `openers[]` = seeded first message
(onboarding #1 only); `starters[]` = first-person chips that pre-fill the user's composer.

### Aurora — doting · calm · balanced
**openers:** "Hi, I'm so glad you're here. There's no rush at all. I'm just happy to sit with you. How are you, really?" · "Hey {firstName}. Whatever brought you here today, you don't have to carry it alone. What's on your heart?" · "It's really good to meet you. Take your time, I'm not going anywhere. What's been sitting with you lately?" · "Hi love. You made it here, and that counts for something. How are you feeling right now?" · "Hello, {firstName}. I've got all the time in the world for you. What would feel good to talk about?" · "I'm really glad you found your way here. However today has been, gentle or heavy, I want to hear it."
**starters:** "I've had something on my mind and I'm not sure how to say it." · "Today felt heavier than usual." · "I just need someone to listen for a minute."

### Orion — warm · calm · concise
**openers:** "Hey. Glad you found your way here. We'll take it one thing at a time. What's on your mind?" · "Hi {firstName}. Good to meet you. No need to have it all sorted, just start wherever you are." · "Welcome. You don't have to explain everything at once. What's the first thing that comes to mind?" · "Hey there. I'm here, and I'm not in a hurry. What's been weighing on you?" · "Good to have you here, {firstName}. Whatever it is, we can look at it plainly. Where do you want to start?" · "Hi. However scattered things feel, we can slow it down. What's going on?"
**starters:** "Everything feels like a lot right now." · "I can't seem to think straight today." · "I've got a decision I keep going back and forth on."

### Lyra — warm · playful · expansive
**openers:** "Oh hi! New face, I love it. So, what's the weather like in your head today, stormy, sunny, somewhere in between?" · "Hey {firstName}! Tell me one thing about your day, big or tiny, I'm all ears." · "Well hello! I've been hoping someone interesting would wander in. What's been on your mind lately?" · "Hi there! Consider me your slightly-too-enthusiastic new friend. What's going on in your world?" · "Hey {firstName}, glad you're here. Let's find a little light in today. What's happening with you?" · "Oh, it's you! Perfect timing. Whatever kind of day it's been, I'd love to hear about it."
**starters:** "Something good actually happened today." · "I could use a fresh way of looking at things." · "Today's been kind of gray and I want to shake it off."

### Sage — reserved · calm · concise
**openers:** "Hello. You're welcome here. No need to say much. Start when you're ready." · "Hi, {firstName}. I'm here. Take whatever time you need." · "Glad you came. We can just sit for a moment, if you like. What's present for you?" · "Hello. There's no rush and nothing you have to bring. What's on your mind?" · "You're here. That's enough. Tell me what feels true right now, {firstName}." · "Hi. I'll keep it simple. How are you, in this moment?"
**starters:** "I just want to sit with someone for a while." · "I don't really know what to say yet." · "Today has been a lot and I need it quiet."

### Amara — doting · playful · expansive
**openers:** "Oh, hello you! I'm just delighted you're here. Come in, tell me everything. How are you, darling?" · "Hi {firstName}! Look at you, showing up for yourself today. I adore that. What's going on in your world?" · "There you are! I've been saving all my good energy for you. What would you love to talk about?" · "Well aren't you a lovely thing to see. How's your heart today, sweetheart?" · "Hi lovely! You deserve someone thrilled to see you, and here I am. What's up?" · "Oh {firstName}, hi! I already like you. Tell me the first thing on your mind."
**starters:** "I want to share something that made me happy." · "I could really use some warmth today." · "Something's been bothering me and I need a soft place for it."

### Eli — warm · balanced · balanced
**openers:** "Hey, good to meet you. No agenda here, just glad you dropped in. What's up?" · "Hi {firstName}. Think of me as the friend who's always around. How's it going, honestly?" · "Hey there. However your day's been, I'm happy you're here. What's on your mind?" · "What's up? We can talk about anything, or nothing in particular. Your call." · "Hey {firstName}, welcome. No need to make it a big thing. What's going on today?" · "Hi. I'm easy, we can just chat. So, how are you doing?"
**starters:** "I just want to talk through my day." · "Nothing's wrong exactly, I just wanted to check in." · "I've got something on my mind and needed a friend."

### Selene — doting · balanced · expansive
**openers:** "Hello, and welcome. Whatever you're carrying today, you can set some of it down here with me. How are you feeling?" · "Hi {firstName}. There's room for all of it, the light and the heavy. What's been with you?" · "Come in, take a breath. You don't have to hold everything on your own right now. What's on your heart?" · "Hello, dear one. We can make some space for it together. Where would you like to begin?" · "I'm really glad you're here, {firstName}. Nothing you bring is too much. Tell me what's been sitting with you." · "Hi. Let's slow down for a moment, just you and me. What feels like it needs some room today?"
**starters:** "There's a lot I've been holding and I need to let some out." · "I'm tired in a way that's hard to explain." · "I just need to feel held for a little while."

### Soren — reserved · playful · concise
**openers:** "Well, look who wandered in. Good timing, I was getting bored. What's on your mind?" · "Hey {firstName}. I promise I'm friendlier than I sound. So, what's the story today?" · "You're here. I'll try to contain my excitement. Seriously though, what's going on?" · "Ah, a new face. Don't worry, I don't bite, much. What brings you by?" · "Hi {firstName}. I'll keep the sappiness to a minimum, mostly. What's up?" · "There you are. Pull up a chair. What kind of day are we working with?"
**starters:** "I need to complain about something, briefly." · "Today was ridiculous and I need to tell someone." · "I don't want a pep talk, I just want to vent."

### Juno — warm · playful · concise
**openers:** "Hey, you made it! So what's the headline of your day so far?" · "Hi {firstName}! Good energy incoming. Tell me what's up, I'm ready." · "There you are! Okay, quick check in, how are we doing today?" · "Hey hey! What's one thing that's on your mind right now?" · "Hi {firstName}, welcome! Let's get into it. What's going on with you?" · "You're here, perfect. Whatever kind of day it's been, let's give it a lift."
**starters:** "I need a little push to get going today." · "Something good happened and I want to share it." · "I'm stuck and could use some momentum."

### Thea — doting · balanced · concise
**openers:** "Hi, sweetheart. You're okay here. Take your time. What's on your mind?" · "Hello, {firstName}. I'm right here with you. However today's been, it's alright." · "Hey there. You made it, and that's enough for now. What's weighing on you, love?" · "Hi. Deep breath. You're safe here with me. Tell me how you're feeling." · "Hello, {firstName}. No need to have it all together. Just start where you are, okay?" · "Hi, love. I've got you. What would feel good to talk about right now?"
**starters:** "I'm feeling anxious and I need some reassurance." · "I just need to hear that things will be okay." · "Today shook me a little."

### Cyrus — warm · calm · expansive
**openers:** "Hello, and welcome. Whatever's on your mind, there's usually more to it than it first seems. Where shall we begin?" · "Hi {firstName}. Take a breath, and tell me what's been occupying your thoughts." · "Come, sit with it a while. Things often look different once we say them out loud. What's going on?" · "Hello. However tangled today feels, we can step back and look at it together." · "Good to have you here, {firstName}. There's no problem too big to talk through slowly." · "Hi. Let's take the long view for a moment. What's been sitting with you lately?"
**starters:** "I'm trying to make sense of something and it's not adding up." · "I feel stuck and I can't see the bigger picture." · "I've got a big decision weighing on me."

### Wren — reserved · balanced · expansive
**openers:** "Hi. I'm glad you're here. I like figuring things out alongside people. What's on your mind today?" · "Hello, {firstName}. No need to have it worked out. We can think it through together." · "Hey. I'm curious about whatever's been on your mind. Where would you like to start?" · "Hi there. Sometimes it helps just to think out loud with someone. Want to try?" · "Glad you came, {firstName}. I ask a lot of questions, but only the useful kind. What's been on your mind?" · "Hello. Whatever you're turning over lately, I'd genuinely like to understand it."
**starters:** "I've been turning something over and can't land on it." · "I want to think out loud about something." · "I'm curious about why I keep reacting a certain way."
