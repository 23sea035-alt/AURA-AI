# Aura AI — Internal Data Retention & Deletion Policy

> **DRAFT — internal policy pending legal counsel. Not legal advice. [Bracketed] values to confirm.**

**Audience:** Engineering / Ops (operational reference). **Not** the user-facing privacy policy.
**Status:** Draft · **Last updated:** 2026-06-30 · **Companion docs:** [v1-schema.md](../specs/v1-schema.md) (table definitions, FK behavior), [v1-architecture.md](../specs/v1-architecture.md), [v1-tasklist.md](../archive/planning/v1-tasklist.md) (archived) (Phase 6 retention jobs)
**Cross-reference:** Retention numbers here MUST stay in sync with the user-facing privacy-policy draft. If one changes, change both.

---

## 1. Purpose & Scope

This document is the operational schedule that tells the engineering/ops team **what data we keep, for how long, why, and how it is deleted**. It exists so that:

- Deletion requests are handled consistently and provably (audit trail).
- Retention windows are enforced by **scheduled jobs**, not by memory or ad-hoc SQL.
- A later legal review has a single, concrete artifact to mark up.

**In scope:** all 12 v1.0 Postgres (Neon) tables, database backups, and data mirrored to third parties (Groq — incl. Whisper STT for voice, RevenueCat/Apple, Clerk, and the voice TTS provider Inworld).

**Out of scope:** the user-facing privacy policy wording, marketing/analytics tooling (none in v1.0), and server/application logs beyond what is noted under §7.

**App context (why this is sensitive):** Aura AI is an iOS AI-companion chat app, **18+, US-first**. LLM is Groq (Llama 3.1); payments via RevenueCat. Conversations are intimate and personal — `messages` and `memories` are the highest-sensitivity bulk data and the primary target of erasure. `safety_events` and `banned_identities` are the narrow slices we deliberately retain.

### Tables at a glance

| Table | Holds |
|---|---|
| `users` | Identity (incl. `clerk_user_id`), age-gate, entitlement cache, account status. PII columns nullable so they can be anonymized on delete; email tombstoned. Auth credentials live at **Clerk**, not here. |
| `companions` | Per-user AI companions (persona, resolved traits, chat-list preview cache). |
| `messages` | Chat messages (user + assistant), grouped by `turn_id`. The intimate conversation bulk. |
| `memories` | Per-companion long-term facts extracted from conversations. Sensitive. |
| `safety_events` | Moderation/safety audit + review queue. Abuse/liability evidence. **Retained** on deletion, identity severed. |
| `subscriptions` | RevenueCat mirror (RC/Apple = system of record). Financial record. |
| `device_tokens` | APNs push tokens, one per device install. |
| `banned_identities` | Anti-evasion blocklist. **Salted/keyed hashes only** of email + OAuth `sub`. Survives deletion. |
| `memory_jobs` | Background memory-consolidation job queue/state. Operational; no conversation prose. |
| `voice_usage` | Voice metering rows (duration, `direction` stt/tts, `model_id`) per user/companion. **No audio or transcript content.** Cascade-purges with the account. |
| `rate_limits` | Per-user/route rate-limit counters. Operational; no conversation content. |
| `deletion_audit` | Proof-of-erasure records (request id + timestamp, **no content**). Retained long-term (see §3). |

---

## 2. Principles & The Retention Model

### Core principles

- **Data minimization** — collect and retain only what a documented purpose requires.
- **Purpose limitation** — every retained slice maps to a named purpose (§3 column). No "keep it just in case."
- **Storage limitation** — every category has a finite window enforced by a job (§8). Nothing is kept indefinitely except the content-free deletion audit record and the financial mirror (regulatory).
- **Decouple signal from content** — separate the long-lived (de-identified) safety signal from the short-lived raw content it was derived from. The signal we may keep for a long time; the raw flagged content we keep only as long as severity warrants.

### Right-to-erasure is NOT absolute

Erasure rights have explicit statutory carve-outs. We rely on these to retain narrow, time-bounded slices after an account is deleted:

- **GDPR Art. 17(3)(b)** — retention required for compliance with a legal obligation.
- **GDPR Art. 17(3)(e)** — retention for the establishment, exercise, or defense of legal claims.
- **CCPA §1798.105(d)(2)** — security incidents / protection against malicious, deceptive, fraudulent, or illegal activity (basis for `safety_events` and `banned_identities`).
- **CCPA §1798.105(d)(8)** — compliance with a legal obligation (basis for the financial mirror).

### Tiered deletion (the model in one paragraph)

On account deletion we **purge the intimate bulk** (conversations, memories, companions, live PII) and **retain minimal slices** for safety + ban-evasion. Mechanically: **soft-delete + anonymize** the `users` row; **cascade-purge** conversation data; **retain** safety/abuse evidence and a **hashed ban fingerprint with identity severed**. Backups follow the ICO **"beyond use"** doctrine — they are not individually edited; they expire on the normal cycle and are not accessed in the interim, with deletion re-applied if a backup is ever restored.

### Lawful bases for the retained slices

| Retained slice | Lawful basis (GDPR) | Statutory carve-out |
|---|---|---|
| `safety_events` (abuse/liability evidence) | Legitimate interest (Art. 6(1)(f)) — platform safety & legal defense | Art. 17(3)(b)/(e); CCPA §1798.105(d)(2) |
| `banned_identities` (salted hash) | Legitimate interest (Art. 6(1)(f)) — fraud/abuse prevention, ban evasion | Art. 17(3)(b); CCPA §1798.105(d)(2) |
| `subscriptions` / financial mirror | Legal obligation (Art. 6(1)(c)) — tax/accounting | CCPA §1798.105(d)(8) |
| Deletion audit record | Legal obligation / legitimate interest — proof of erasure | Art. 17(3)(b); accountability (Art. 5(2)) |

> **Pseudonymization note:** `banned_identities` stores salted/keyed hashes only. Per EDPB guidance, pseudonymized data is **still personal data** — so it remains on a documented purpose and a finite retention window. It is not treated as anonymous.

---

## 3. Retention Schedule

> **All windows are recommended DEFAULTS pending counsel.** They must match the privacy-policy draft.

| Data category | Retention window | Lawful basis / purpose | Deletion trigger / mechanism |
|---|---|---|---|
| **Account-recovery grace** (user soft-delete) | **30 days**, recoverable | Consent / contract — let users undo accidental deletion before irreversible purge | User deletion request → set `deleted_at`, mark `status='deleted'`; anonymize on hard-purge |
| **Live PII + conversations** (`users` PII, `companions`, `messages`, `memories`) | **within 30 days of grace expiry** | No retained purpose after erasure — minimization/storage limitation | Hard delete / cascade purge; `users`: null `first_name`/`last_name`/`date_of_birth`, tombstone `email`, `status='deleted'` |
| **Backups** | **≤ 90 days**, "beyond use" until overwritten | Disaster recovery only; not used for live access | Normal backup rotation; re-apply deletion if a backup is restored |
| **`safety_events` raw content — T1 Critical** (imminent self-harm/crisis, credible threats of violence, CSAM-adjacent) | **~90 days** (default), **extendable on legal hold / active escalation / law-enforcement preservation** | Legitimate interest (Art. 6(1)(f)) — abuse/liability evidence, legal defense; Art. 17(3)(b)/(e), CCPA §1798.105(d)(2) | Identifiers stripped at ingestion; full flagged content + minimal surrounding context retained short, then scrubbed to the metadata row by the retention-expiry job (hold pauses the clock) |
| **`safety_events` raw content — T2 Standard** (sub-imminent self-harm signals, serious moderation blocks, repeated injection attempts) | **~6–12 months** (default) | Legitimate interest (Art. 6(1)(f)) — abuse/liability evidence, legal defense; Art. 17(3)(b)/(e), CCPA §1798.105(d)(2) | Identifiers stripped at ingestion; only a redacted/truncated snippet (matched span + tight context) retained, then scrubbed to the metadata row |
| **`safety_events` raw content — T3 Low** (routine moderation hits, single injection attempts, low-confidence flags) | **none** — scrub to metadata **at write time** | n/a (no raw content retained) | No raw content stored; only the metadata row below is written |
| **`safety_events` de-identified metadata** (event label, severity, classifier score, referral-fired flag, timestamp — **no raw content**) | **long** (structured fields, not prose) | Legitimate interest (Art. 6(1)(f)) — safety signal, trend/abuse analysis, SB 243 reporting; Art. 17(3)(b)/(e), CCPA §1798.105(d)(2) | Retained as structured fields; pseudonym↔identity key deleted once linkage no longer needed (→ effectively anonymized). SB 243 §22603 annual report draws **only** from this layer |
| **`banned_identities`** (salted hash) | **24 months / until ban lifted** | Legitimate interest (Art. 6(1)(f)) — fraud/ban-evasion prevention; CCPA §1798.105(d)(2) | Retention-expiry job; delete on ban lift; honor `expires_at` |
| **`subscriptions` / financial mirror** | **up to 7 years** | Legal obligation (Art. 6(1)(c)) — tax/accounting; CCPA §1798.105(d)(8). RC/Apple = system of record | Retained; RevenueCat/Apple is authoritative, this is a mirror |
| **`voice_usage` metering** (duration, direction stt/tts, model_id — **no audio/transcript content**) | **purged on account deletion (cascade); otherwise a short operational window** [confirm window] | Minimization/storage limitation — usage metering/abuse limits only; no retained purpose after erasure | `on delete cascade` on both FKs (user + companion); no separate erasure step needed |
| **Deletion audit record** (request id + timestamp, **no content**) | **long-term** | Accountability (Art. 5(2)) — proof of erasure | Never purged on the normal cycle; content-free by design |

`device_tokens` is not a standalone row in this table — it cascade-purges with the account (see §5). Auth identities live at **Clerk** (no local table); account deletion deletes the Clerk user (§4 / §5).

> **`safety_events` tiering rationale & crosscutting rules.** Mature programs decouple content from signal (e.g. Anthropic keeps flagged content ~2yr but trust-&-safety *scores* ~7yr; OpenAI's abuse logs run a ~30-day baseline, exception-extended). Uniform full-content 24-month retention is the **highest-risk** option for special-category conversation data under CPRA's storage-limitation rule, so v1.0 splits the long-lived **signal** from the short-lived **raw content**:
> - **Strip identifiers at ingestion.** The pseudonym↔identity key is stored separately and access-controlled, and is deleted once linkage is no longer needed — converting the pseudonymized metadata tier to **effectively anonymized**. Prefer **true anonymization over indefinite pseudonymization** for the long-lived layer; because free-text transcripts resist anonymization, that layer is **structured fields, not prose**.
> - **SB 243 reporting.** The California SB 243 annual report (§22603, from **July 1, 2027**) draws **only** from the de-identified metadata layer — a count of crisis-referral notifications plus protocol descriptions — which satisfies §22603(b)'s "no identifiers or personal information" requirement **by construction**. Raw crisis transcripts are never needed to *comply*, only to *operate/defend*.
> - **Legal-hold override.** Any tier's retention clock **pauses** on an active claim/investigation/law-enforcement preservation (GDPR Art. 17(3)(e); CCPA security/fraud carve-out §1798.105(d)(2)).
> - **Jurisdiction.** US-only (confirmed) → CCPA/CPRA "reasonably necessary and proportionate" is the governing test; GDPR Art. 9 special-category analysis only matters if EEA/UK is opened later (both point the same direction — see §9).

---

## 4. Deletion Process

### Request channels

- **In-app:** Settings → Delete Account (primary channel; v1.0).
- **Email/support:** privacy@[domain-to-confirm] — logged into the same deletion queue.
- All requests, regardless of channel, create a **deletion request record** (request id + timestamp + verified user id) that seeds the soft-delete and the eventual audit record.
- **Granular in-app deletion (not account-level):** users can delete an individual remembered fact via `DELETE /api/memories/:id` (the Memory screen). This is an immediate, scoped delete — it removes the `memories` row directly and does not run the account-deletion lifecycle below.

### Identity verification

Requests must be tied to a verified, authenticated session or a verified email match before any destructive action. Do not act on an unauthenticated "delete user X" request.

### Statutory response deadlines

- **CCPA:** respond within **45 days** of a verifiable request (extendable by 45 days with notice). [Confirm whether served jurisdictions trigger CCPA at all — see §9.]
- **GDPR:** respond within **1 month** of the request (extendable by 2 months for complex requests, with notice).
- "Respond" means acknowledge + initiate the lifecycle below within the deadline; the **30-day grace** runs inside the response window. The user-facing privacy policy must state these deadlines consistently.

### Lifecycle: soft-delete → hard-purge → backup expiry

```
1. REQUEST          deletion request record created (id + ts + verified user_id)
                    ↓
2. SOFT-DELETE      users.deleted_at = now(); users.status = 'deleted'
   (recoverable)    account locked out of app; 30-day grace begins
                    ↓  (grace elapses, no recovery)
3. HARD-PURGE       anonymize users row (null PII, tombstone email)
   (irreversible)   cascade-purge companions/messages/memories/device_tokens/voice_usage; delete the Clerk user
                    set-null on safety_events identity FKs
                    upsert banned_identities hashes if ban applies
                    write deletion audit record (content-free)
                    ↓
4. BACKUPS          purged rows persist only in backups; "beyond use";
                    expire on normal rotation (≤ 90 days); re-applied if restored
                    ↓
5. RETAINED SLICES  safety_events: de-identified metadata (long) + tiered raw
                    content (T1 ~90d/hold-extendable, T2 ~6–12mo snippet, T3 none)
                    + banned_identities (24mo/until lifted)
                    + financial mirror (up to 7yr) live on, identity severed
```

### Third-party propagation

- **Groq (LLM):** Aura does **not** persist conversation data with Groq beyond the inference request. Confirm and document Groq's zero-retention / no-training stance for the API tier in use; if any retention exists, file a deletion/propagation step here. [Confirm contractual retention terms.]
- **RevenueCat / Apple:** system of record for subscriptions. On account deletion, conversation/PII purge does **not** delete the financial record (legal-obligation basis). Propagate any required RevenueCat subscriber deletion/anonymization via their API where applicable, while preserving the regulatory financial record. [Confirm RC deletion API behavior and what Apple retains.]
- **Clerk (auth):** Clerk stores authentication credentials + OAuth identifiers (no local `auth_identities` table). On account deletion, delete the Clerk user via the Clerk API (which also fires `user.deleted` → local mirror sever). [Confirm Clerk DPA + deletion/retention terms.]
- Maintain a short **data-processor inventory** (Groq, RevenueCat, Neon, APNs, Clerk) so propagation targets are explicit.

---

## 5. Per-Table Deletion Behavior

Behavior on **account hard-purge**. FK on-delete semantics are defined in [v1-schema.md](../specs/v1-schema.md) and must match here.

| Table | Behavior | Detail |
|---|---|---|
| `users` | **Anonymize (soft-delete row kept)** | null `first_name`, `last_name`, `date_of_birth`; **tombstone** `email` (frees it for re-registration); `status='deleted'`; `deleted_at` set. Row is retained as the anchor for the tombstone + audit. |
| _Clerk (auth)_ | **Delete Clerk user** | Not a local table — credentials/OAuth identifiers live at Clerk. On hard-purge, delete the Clerk user via API (fires `user.deleted` → mirror sever). [Confirm Clerk retention/deletion terms.] |
| `companions` | **Cascade purge** | `on delete cascade` — companions removed. Each row also holds the resurfaced-memory ("remembers") cache (`remember_memory_id`/`remember_question`/`remember_generated_at`); `remember_memory_id` is FK `set null` to `memories`, so deleting a memory nulls it, and the cache cascade-purges with the companion. |
| `messages` | **Cascade purge** | `on delete cascade` — the intimate conversation bulk removed. |
| `memories` | **Cascade purge** | `on delete cascade` — extracted personal facts removed. (`memories.source_message_id` is `set null`, but the rows themselves cascade with the user.) |
| `safety_events` | **Split: retain metadata, tier raw content; set-null identity** | Identifiers are stripped at ingestion (pseudonym↔identity key held separately, deleted when linkage is no longer needed); `user_id` / `companion_id` / `message_id` → null on purge. The **de-identified metadata** (label, severity, score, referral-fired flag, timestamp) is retained long as structured fields. **Raw flagged content** is retained only by severity tier — T1 ~90d (extendable on hold), T2 ~6–12mo snippet, T3 none — then scrubbed to metadata by the retention-expiry job (§3). |
| `subscriptions` | **Retain (financial), identity severed** | FK is `on delete set null` — the subscription mirror survives with `user_id = null`, preserving the financial record (RC/Apple = system of record). |
| `device_tokens` | **Cascade purge** | `on delete cascade` — push tokens removed. |
| `voice_usage` | **Cascade purge** | `on delete cascade` on both FKs (user + companion) — metering rows removed. No audio/transcript content is stored. |
| `banned_identities` | **Retain (hash only)** | Not deleted on account purge. `source_user_id` is `set null` (identity severed); `identifier_hash` retained. Purged by the 24-month / ban-lifted job. |

> **`subscriptions` retention:** FK is `on delete set null` (not cascade) — so the financial mirror survives even if the `users` row is later hard-purged, with `user_id` set to null (identity severed). The only open question (for counsel) is whether to keep the user↔transaction link for chargeback/dispute handling rather than anonymizing — see §9.

---

## 6. Ban-Evasion Handling

**Goal:** stop a banned user from re-registering with the same email or OAuth account, **without** storing raw identifiers of deleted users.

### Hashing approach

- Store **salted/keyed SHA-256** hashes only, in `banned_identities.identifier_hash`. Identifier types: `email_hash`, `apple_sub_hash`, `google_sub_hash`.
- Use a **server-side pepper** (keyed hash, e.g., HMAC-SHA-256) held in secrets management — **not** in the database, **not** in source. This is what makes the hashes non-trivial to brute-force despite the low-entropy input space of emails.
- The same normalization used elsewhere (lowercased/normalized email) is applied **before** hashing so a match is deterministic.
- Hashes are **not reversible** to the original identifier; we cannot and will not recover the raw email/sub from `banned_identities`.

### Check at registration

1. Registration normalizes and hashes the incoming email + OAuth `sub` with the same pepper.
2. Query `banned_identities` for a matching `(identifier_type, identifier_hash)`.
3. On match (and not expired), reject registration. Do not reveal *why* in a way that leaks the existence of a specific banned identity (avoid an enumeration oracle).

### Still-personal-data caveat

Per EDPB pseudonymization guidance, a keyed hash of a person's identifier is **still personal data** — pseudonymized, not anonymized. Consequences:

- It stays on a **documented purpose** (fraud/ban-evasion prevention, Art. 6(1)(f)) and a **finite window** (24 months / until ban lifted).
- It is in scope for access/erasure requests in principle, but is protected by the **security/fraud carve-out** (CCPA §1798.105(d)(2); GDPR Art. 17(3)(b)) for the duration of its purpose.
- Rotating the pepper would orphan existing hashes (matches would stop working). If rotation is ever needed, treat it as a deliberate, documented event. [Pepper-rotation strategy: confirm.]

---

## 7. Backups — "Beyond Use" Approach

We do not (and practically cannot) surgically edit individual records out of database backups. Instead we follow the **ICO "beyond use"** doctrine:

- Purged data may persist in backups until those backups **expire on the normal rotation** (**≤ 90 days**).
- During that window the backup data is **not accessed** for any live/business purpose — it exists solely for disaster recovery and is "put beyond use."
- If a backup is **ever restored**, the deletion lifecycle (§4) is **re-applied** to any rows that were previously purged before the restored system returns to service. This re-application step must be part of the restore runbook.
- The privacy policy should disclose that deleted data may persist in backups for up to the backup window before final overwrite.

> **Application/server logs:** ensure logs do not capture full message `content`. Any logs that incidentally contain PII follow the same short, finite retention as backups. [Confirm log retention window + scrubbing.]

---

## 8. Documentation & Audit

Retention is only real if it is **operationalized and enforced**, not aspirational.

### Scheduled jobs (see v1-tasklist.md Phase 6)

| Job | Cadence | Responsibility |
|---|---|---|
| **Grace-expiry / hard-purge job** | Daily | Find `users` where `deleted_at` + 30 days has elapsed → run hard-purge lifecycle (§4 step 3). |
| **`safety_events` content-scrub / retention-expiry job** | Daily/weekly | Scrub raw flagged content to the de-identified metadata layer once its tier window elapses (T1 ~90d, T2 ~6–12mo; T3 stored metadata-only at write time). Pause the clock for rows under legal hold / active escalation. The metadata layer is retained long. |
| **`banned_identities` retention-expiry job** | Daily | Delete where `expires_at` < now() or 24-month default reached (unless permanent ban policy applies). |
| **Backup rotation** | Per provider cycle | Ensure backups expire ≤ 90 days; verify restore runbook re-applies deletions. |

- Jobs must be **idempotent** and **logged** (count of rows affected per run) so retention enforcement is itself auditable.
- Each retained slice has a **named purpose** recorded (the §3 lawful-basis column). No retention without a purpose on file.
- The **deletion audit record** (request id + timestamp + verified user id, **no message content**) is the proof-of-erasure artifact and is retained long-term.
- This schedule should be reviewed on a fixed cadence (e.g., annually or on any material data-model or jurisdiction change) and re-confirmed with counsel.

---

## 9. Open Legal-Review Items

These are **deliberately unresolved** — to be set by counsel, not invented here:

1. **Exact retention numbers** — every window in §3 is a recommended default (30-day grace, ≤ 90-day backups, tiered `safety_events` raw content [T1 ~90d / T2 ~6–12mo / T3 none] with a long-lived de-identified metadata layer, 24-month ban hashes, up to 7-year financial). Confirm or adjust.
2. **`safety_events` retention shape — RESOLVED in shape (product+engineering):** tiered-by-severity, splitting short-lived raw content from a long-lived de-identified metadata layer (see §3 for the T1/T2/T3 model). Counsel still sets the **exact per-tier windows** (the ~90-day / ~6–12-month / metadata-long defaults) and whether **T1 content is full vs. minimal-context**. The `flagged_content` column remains marked SENSITIVE in the schema.
3. **Served jurisdictions** — US-only vs. EEA/UK. Determines whether GDPR applies at all, which response deadline governs, and whether the GDPR Art. 17(3) bases are even in play. Drives much of this document.
4. **`subscriptions` financial link** — whether the retained financial mirror keeps the user↔transaction link (useful for chargebacks/disputes) or is fully anonymized (`user_id`→null) on purge.
5. **Third-party retention terms** — confirm Groq's API-tier retention/no-training stance and RevenueCat/Apple deletion-propagation behavior, then lock the §4 propagation steps.
6. **Pepper-rotation strategy** for `banned_identities` (§6).
7. **Log retention + PII scrubbing** window (§7).
8. **Final wording** — both this internal policy and the user-facing privacy-policy draft, kept consistent.

---

*End of draft. Re-confirm all bracketed values and §9 items with legal counsel before this policy is treated as authoritative.*
