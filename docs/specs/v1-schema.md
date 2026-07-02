# Aura AI — v1.0 Database Schema

**Status:** Locked (design) · **As-built reconciled:** 2026-06-30 · **Target:** Drizzle migrations in `server/src/db/migrations/`
**Last updated:** 2026-06-30 · **Companion doc:** [v1-architecture.md](v1-architecture.md) (decisions), [v1-tasklist.md](../planning/v1-tasklist.md) (build order)

> Single source of truth for the v1.0 schema. Build this as **versioned Drizzle migrations** — not
> `drizzle-kit push`. Enums and shared types live in `@aura/shared`; the Drizzle tables live in
> `server/src/db/` and import the enum constants from `shared`.

> **As-built (2026-06-30) — reconcile note.** The shipped schema is **12 tables**, not the 8 in the
> original design: the 8 core tables **+ `memory_jobs`** (durable async-consolidation queue; has
> `attempts`, `safety_skipped`, and `claimed_at` for the worker reaper) **+ `rate_limits`** (durable
> rate-limit store) **+ `deletion_audit`** (content-free proof-of-erasure) **+ `voice_usage`**
> (per-call voice-seconds metering; §10). The 16 incremental migrations were **squashed into a single
> `0000_init` baseline** — every table, CHECK constraint, UNIQUE, and index now originates there (no
> per-table migration numbers anymore). The `text + CHECK` enum convention below is now **actually
> enforced** in the DB for the safety-critical columns: `users.status`, `messages.role/status`,
> `companions.persona_key`, `safety_events.event_type/source/severity`. Composite UNIQUEs use proper
> Drizzle `unique()` builders, and `banned_identities (identifier_type, identifier_hash)` has its
> UNIQUE. `rate_limits` and `deletion_audit` are now modeled as Drizzle `pgTable`s (SQL-only before) —
> the TS schema is the **complete Drizzle source of truth**. The enum catalog below reflects the
> shipped `@aura/shared` values.
>
> **Update 2026-07-02 (migrations `0001`/`0002`).** More `text + CHECK` enum constraints are now
> DB-enforced (migration `0002`): `users.age_assurance_method`, `memories.category`,
> `subscriptions.tier/status/store/period_type`, `device_tokens.platform/environment`,
> `banned_identities.identifier_type`, `voice_usage.direction`, `safety_events.status/action`
> (`action` is `NULL OR IN (…)`). Two columns are **intentionally NOT constrained**:
> `safety_events.category` (stores the *raw moderator category* string — e.g. `"self-harm/intent"`,
> `"sexual/minors"`, `"injection"` — which is richer than the coarse `MODERATION_CATEGORY` enum), and
> the RevenueCat webhook now **normalizes** its UPPERCASE `store`/`period_type` to the enum before
> writing (`app_store`/`normal` etc.; unknown period → `null`). `users.date_of_birth` is now a
> `date` column (was `text`). PKs are **UUIDv4** (`defaultRandom()`) — see Conventions. Added
> `idx_safety_events_review (status, severity, created_at)` for the review queue.

---

## Conventions (apply to every table)

- **Primary keys:** `uuid`, **DB-generated UUIDv4** (`defaultRandom()`). *(As-built 2026-07-02: the
  original design called for app-generated UUIDv7 for index locality, but that gain is marginal at v1
  scale and would add a dependency + touch every table — deferred. The client-minted `turn_id`
  idempotency model is unaffected.)*
- **Column naming:** **snake_case** in Postgres, **camelCase** in TypeScript — bridged by Drizzle's
  `casing: 'snake_case'` setting (write `clerkUserId: text()` → column `clerk_user_id`).
- **Enums:** **`text` + `CHECK` constraint**, values defined once in `@aura/shared` (NOT native
  Postgres `enum` types — those are painful to alter).
- **Timestamps:** `timestamptz`, `default now()`; `updated_at` bumped via Drizzle `$onUpdate`.
- **Migrations:** edit the TS schema → `drizzle-kit generate` (drafts SQL) → review/commit the SQL →
  runtime `migrate()` applies on boot. Config lives in `server/drizzle.config.ts`. **`drizzle-kit push`
  is FORBIDDEN** in shared/prod environments. The current set is the single squashed `0000_init` baseline.
- **Email:** stored **lowercased/normalized** on write.
- **FKs:** on-delete behavior is explicit per table (see each). Cascade = "their data goes with them";
  `set null` = "retain the record, sever identity."

---

## `@aura/shared` — enum & constant catalog

```ts
// ── enums (text + CHECK) ──────────────────────────────────────────────
USER_STATUS            = ['active', 'suspended', 'banned', 'deleted']
AGE_ASSURANCE_METHOD   = ['self_declared', 'apple_declared_age_range', 'third_party']  // apple_declared_age_range + third_party reserved for post-v1.0
// AUTH_PROVIDER removed — auth providers (password/apple/google) are managed by Clerk (D8), not an app enum
PERSONA_KEY            = ['aurora', 'orion', 'lyra']
MESSAGE_ROLE           = ['user', 'assistant']
MESSAGE_STATUS         = ['pending', 'complete', 'failed', 'blocked']   // 'pending' reserved for SSE (post-v1.0)
MEMORY_CATEGORY        = ['identity', 'preference', 'attribute', 'relationship', 'work', 'location', 'general']
SUBSCRIPTION_TIER      = ['free', 'premium']
SUBSCRIPTION_STATUS    = ['active', 'trialing', 'grace_period', 'billing_retry', 'expired', 'revoked']
SUBSCRIPTION_STORE     = ['app_store', 'play_store', 'stripe']
SUBSCRIPTION_PERIOD    = ['normal', 'trial', 'intro']
DEVICE_PLATFORM        = ['ios']                                        // 'android' post-v1.0
DEVICE_ENVIRONMENT     = ['production', 'sandbox']
SAFETY_EVENT_TYPE      = ['input_blocked', 'output_blocked', 'crisis_detected', 'injection_detected', 'user_reported']  // user_reported = UGC report (Apple 1.2)
SAFETY_SOURCE          = ['input', 'output', 'injection', 'user_report']
SAFETY_SEVERITY        = ['info', 'warning', 'critical']
SAFETY_STATUS          = ['open', 'reviewed', 'actioned', 'dismissed']
SAFETY_ACTION          = ['none', 'warned', 'suspended', 'banned']
MODERATION_CATEGORY    = ['self_harm', 'sexual', 'sexual_minors', 'violence', 'hate', 'harassment', 'illicit', 'prohibited', 'other']
MODERATOR_MODEL        = ['deterministic', 'openai_omni', 'gpt_oss_safeguard', 'prompt_guard']
BANNED_IDENTIFIER_TYPE = ['email_hash', 'apple_sub_hash', 'google_sub_hash']

// ── PersonaTraits (jsonb shape on companions.traits) ──────────────────
type PersonaTraits = {
  warmth:    'reserved' | 'warm'     | 'affectionate'
  energy:    'calm'     | 'balanced' | 'playful'
  verbosity: 'concise'  | 'balanced' | 'expansive'
}
// 3 axes × 3 levels. Per-persona DEFAULTS + display metadata (name, gradient, tagline)
// also live in shared (PERSONA_CATALOG / PERSONA_THEME). Base system-prompt templates +
// the safety preamble live server-side only.

// ── tunable constants ─────────────────────────────────────────────────
FREE_DAILY_LIMIT      = 30      // free-tier messages/day (UTC reset; completed turns only); A/B-tunable
MAX_MESSAGE_CHARS     = 2000    // input cap (count code points, not UTF-16 units)
MEMORY_RETRIEVAL_TOP_N = 5      // memories injected per turn (prompt-budget bound)
MEMORY_SCORE_WEIGHTS   = { jaccard: 0.7, importance: 0.3, recency: 0.15 }       // retrieval ranking
MEMORY_RECENCY_HALFLIFE_DAYS = 30   // recency = exp(-Δdays/halflife); Δ from last_recalled_at ?? created_at
MEMORY_RELEVANCE_FLOOR = 0.08   // min Jaccard to inject (OR importance >= identity bar)
MEMORY_IDENTITY_BAR    = 0.85   // importance >= this bypasses the floor (name, key relationships ride along)
MEMORY_DEDUP_CANDIDATE_CAP = 50 // existing memories shown to the consolidation pass (importance desc)
MEMORY_IMPORTANCE_BY_CATEGORY = { identity:0.9, relationship:0.9, work:0.7, location:0.7, attribute:0.6, preference:0.6, general:0.4 }  // highSalience -> 0.95
HISTORY_WINDOW        = 8       // recent messages sent to the LLM per turn (bumped 6->8 for coherence)
GENERATION_TEMPERATURE = 0.7    // companion warmth without drift; NOT a safety control (L3 is)
GENERATION_MAX_TOKENS = 512     // headroom for the 2-4 sentence target

// ── voice (always metered; D4) ───────────────────────────────────────
VOICE_DAILY_LIMIT_SECONDS        = 600    // free-tier voice seconds/day (premium variant = 3600)
VOICE_CALL_MAX_DURATION_SECONDS  = 900    // per-call ceiling (premium variant = 3600)
```

---

## Tables

### 1. `users`
Identity, age-gate, entitlement cache, account status. PII is nullable so it can be nulled on
soft-delete anonymization (email is *tombstoned* instead, to free it for re-registration).

```
users
  id                      uuid PK                         -- UUIDv7
  clerk_user_id           text  notNull UNIQUE            -- Clerk user id (the auth identity); synced by the Clerk webhook
  first_name              text  nullable                  -- onboarding source of truth; nulled on delete
  last_name               text  nullable                  -- nulled on delete
  email                   text  notNull UNIQUE            -- lowercased; tombstoned on delete
  date_of_birth           date  nullable                  -- 18+ gate; nulled on delete
  age_assurance_method    text  notNull default 'self_declared'   -- AGE_ASSURANCE_METHOD (CHECK)
  age_verified            boolean notNull default false
  age_verified_at         timestamptz nullable
  is_minor                boolean notNull default false   -- dormant (18+ in v1.0)
  is_premium              boolean notNull default false   -- entitlement cache (RevenueCat webhook updates)
  avatar_color            text  nullable                  -- Home avatar tint (user-set)
  primary_companion_id    uuid  nullable FK -> companions.id (on delete set null)  -- user-switchable Home pin
  status                  text  notNull default 'active'  -- USER_STATUS (CHECK)
  onboarding_done         boolean notNull default false
  ai_disclosure_accepted  boolean notNull default false
  tos_accepted_version    text  nullable
  tos_accepted_at         timestamptz nullable
  created_at              timestamptz notNull default now()
  updated_at              timestamptz notNull default now()
  deleted_at              timestamptz nullable            -- soft-delete marker
```
Notes: identity is created in **Clerk** first; the Clerk webhook (`user.created`) upserts the local
mirror keyed by `clerk_user_id`. Onboarding then collects name + DOB and completes the row; the
onboarding gate enforces presence of first/last/DOB for active accounts at the app layer.

### 2. Auth identities → managed by Clerk (no local table)

v1.0 auth is **Clerk-managed** (D8): Clerk owns credentials, OAuth (Apple/Google) account linking,
password reset, and email verification. There is **no `auth_identities` table** — the prototype's
in-house identity store is removed. The only local link is **`users.clerk_user_id`** (the Clerk user
id, unique), kept in sync by the **Clerk webhook** (`user.created` / `user.updated` / `user.deleted`
→ mirror upsert / email sync / sever; svix-signed, idempotent on `svix-id`). Key off `clerk_user_id`,
never email. *(Slot 2 here is intentionally a note, not a table — there is no `auth_identities` table;
see the 12-table count in the reconcile note above.)*

### 3. `companions`
Per-user AI companions. `id` is opaque (NOT the old `aurora-{userId}` scheme) so a user can own
multiple variants of the same base persona. Traits are the resolved 3×3×3 tune.

```
companions
  id              uuid PK                         -- UUIDv7, opaque
  user_id         uuid notNull FK -> users.id (on delete cascade)
  persona_key     text notNull                    -- PERSONA_KEY (CHECK): aurora|orion|lyra
  name            text notNull                    -- persona name; auto-numbered on collision ("Aurora 2"); user-editable
  traits          jsonb notNull                   -- PersonaTraits {warmth,energy,verbosity}; resolved values
  is_default      boolean notNull default false   -- true for the 3 seeded; entitlement gate keys on this
  last_message    text nullable                   -- chat-list preview cache (update transactionally)
  last_active_at  timestamptz nullable
  message_count   integer notNull default 0
  remember_memory_id    uuid nullable FK -> memories.id (on delete set null)  -- "remembers" Home-card cache
  remember_question     text nullable             -- Groq-generated follow-up question for the surfaced memory
  remember_generated_at timestamptz nullable      -- when the consolidation job last populated the cache
  created_at      timestamptz notNull default now()
  updated_at      timestamptz notNull default now()
```
Notes: gradient/colors are **derived from `persona_key`** in shared (`PERSONA_THEME`) — not stored.
The `remember_*` cache is upserted by the post-consolidation Groq "remembers" service (a surfaced
memory + a generated follow-up question) and read **read-only** by the Home "remembers" card.
Free tier = the 3 seeded (`is_default`) personas on default traits; **trait tuning + creating
companions are premium** (app-enforced). On downgrade: non-default companions **lock, not delete**.

### 4. `messages`
Chat messages. Heart of the turn model: `turn_id` groups a user message with its assistant reply
for idempotency + optimistic-bubble reconciliation.

```
messages
  id            uuid PK                          -- UUIDv7, server-minted
  turn_id       uuid notNull                     -- client-minted; groups the user+assistant pair
  companion_id  uuid notNull FK -> companions.id (on delete cascade)
  user_id       uuid notNull FK -> users.id      (on delete cascade)
  role          text notNull                     -- MESSAGE_ROLE (CHECK)
  status        text notNull default 'complete'  -- MESSAGE_STATUS (CHECK)
  content       text notNull                     -- ≤ MAX_MESSAGE_CHARS (enforced at boundary, not DB)
  flagged       boolean notNull default false    -- safety-relevant (crisis/blocked); for UI + audit
  created_at    timestamptz notNull default now()

  UNIQUE (turn_id, role)                          -- idempotency: 1 user + 1 assistant per turn
  INDEX (companion_id, created_at)                -- history fetch
  INDEX (user_id, role, created_at)               -- free-tier daily count
```
Status semantics: user `complete` (counts toward daily quota) / `blocked` (input moderation; does
NOT count). Assistant `complete` (delivered) / `failed` (fallback content). `pending` reserved for SSE.
Daily count = `user_id`, `role='user'`, `status='complete'`, `created_at >= UTC midnight`.

### 5. `memories`
Per-companion long-term memory (keyword retrieval for v1.0). Written by an **async post-turn LLM
consolidation pass** (extract + dedup + light overwrite-contradiction).

```
memories
  id                uuid PK
  user_id           uuid notNull FK -> users.id      (on delete cascade)
  companion_id      uuid notNull FK -> companions.id (on delete cascade)
  content           text notNull                     -- concise fact
  category          text notNull default 'general'   -- MEMORY_CATEGORY (CHECK)
  importance        real notNull default 0.5
  keywords          text[] notNull default '{}'      -- (renamed from "embedding"); for Jaccard retrieval
  source_message_id uuid nullable FK -> messages.id  (on delete set null)
  last_recalled_at  timestamptz nullable             -- feeds recency-decay scoring
  created_at        timestamptz notNull default now()
  updated_at        timestamptz notNull default now() -- light contradiction overwrites in place
  INDEX (user_id, companion_id, importance DESC)
```
Notes: retrieval score = `0.7·Jaccard(keywords) + 0.3·importance + 0.15·recency`, where
`recency = exp(−Δdays / 30)` over `last_recalled_at` (fallback `created_at`). Inject **top-5** only if
`Jaccard > 0.08` **OR** `importance ≥ 0.85` (identity bypass), into the **system prompt** (not the user
message). Importance is category-driven (see constants). Full design + eval approach in
[memory-pipeline.md](memory-pipeline.md). Real embeddings (separate `embedding vector` column) + full
supersede engine are post-v1.0.

### 6. `safety_events`
Moderation/safety audit + review queue. **Retained** on account deletion (identity severed) — this is
the liability/abuse evidence; FKs are `set null`, NOT cascade.

```
safety_events
  id              uuid PK
  user_id         uuid nullable FK -> users.id      (on delete set null)   -- retained; identity severed on purge
  companion_id    uuid nullable FK -> companions.id (on delete set null)
  message_id      uuid nullable FK -> messages.id   (on delete set null)
  event_type      text notNull          -- SAFETY_EVENT_TYPE (CHECK)
  source          text notNull          -- SAFETY_SOURCE (CHECK): input|output|injection (crisis_detected → 'input')
  category        text nullable         -- MODERATION_CATEGORY (CHECK)
  model           text nullable         -- MODERATOR_MODEL
  severity        text notNull default 'info'   -- SAFETY_SEVERITY (CHECK)
  detail          text nullable
  flagged_content text nullable         -- SENSITIVE; retain-in-full vs scrub-to-metadata = legal decision
  status          text notNull default 'open'   -- SAFETY_STATUS (CHECK) — review queue
  action          text nullable         -- SAFETY_ACTION
  reviewed_at     timestamptz nullable
  reviewed_by     text nullable
  created_at      timestamptz notNull default now()
  updated_at      timestamptz notNull default now()
  INDEX (status, severity, created_at)   -- review queue
  INDEX (user_id, created_at)            -- per-user / repeat-offender
```

### 7. `subscriptions`
RevenueCat mirror (RC is source of truth; `users.is_premium` is the fast cache). Row exists only for
users with a current/past paid entitlement. Stripe columns kept nullable for the deferred web path.

```
subscriptions
  id                       uuid PK
  user_id                  uuid nullable UNIQUE FK -> users.id (on delete set null)  -- retained (anonymized) for the financial record
  tier                     text notNull default 'premium'  -- SUBSCRIPTION_TIER (CHECK)
  status                   text notNull                    -- SUBSCRIPTION_STATUS (CHECK)
  store                    text notNull                    -- SUBSCRIPTION_STORE (CHECK)
  product_id               text nullable                   -- e.g. premium_monthly
  entitlement              text nullable                   -- e.g. premium
  original_transaction_id  text nullable                   -- Apple; webhook match key
  rc_app_user_id           text nullable                   -- = users.id
  period_type              text nullable                   -- SUBSCRIPTION_PERIOD (CHECK)
  will_renew               boolean notNull default true
  expires_at               timestamptz nullable
  stripe_subscription_id   text nullable                   -- deferred web path
  stripe_customer_id       text nullable                   -- deferred web path
  created_at               timestamptz notNull default now()
  updated_at               timestamptz notNull default now()
```
Notes: updated by the **verified** RevenueCat webhook, which also flips `users.is_premium`
(→ drives the companion downgrade-lock). Plan: single **Premium $9.99/month**. Handle the
sandbox-vs-production webhook environment flag.

### 8. `device_tokens`
APNs tokens for transactional "your companion replied" pushes (D10).

```
device_tokens
  id           uuid PK
  user_id      uuid notNull FK -> users.id (on delete cascade)
  token        text notNull UNIQUE              -- APNs device token; one row per device install
  platform     text notNull                     -- DEVICE_PLATFORM (CHECK)
  environment  text notNull                     -- DEVICE_ENVIRONMENT (CHECK) — APNs routing
  created_at   timestamptz notNull default now()
  updated_at   timestamptz notNull default now()
```
Notes: upsert on register (re-point `user_id` if a device is handed off). Prune tokens APNs reports
invalid. `environment` matters — a prod push to a sandbox token fails.

### 9. `banned_identities`
Anti-evasion blocklist. Survives account deletion (security/fraud exception). Stores **hashes only**,
never raw identifiers — checked at registration.

```
banned_identities
  id               uuid PK
  identifier_type  text notNull        -- BANNED_IDENTIFIER_TYPE (CHECK)
  identifier_hash  text notNull        -- salted/keyed SHA-256 (server-side pepper); not reversible
  reason           text nullable
  source_user_id   uuid nullable FK -> users.id (on delete set null)
  expires_at       timestamptz nullable  -- null = permanent; else time-limited
  created_at       timestamptz notNull default now()
  UNIQUE (identifier_type, identifier_hash)
```
Notes: populated on ban (hash of email + OAuth `sub`); registration hashes incoming identifiers and
checks for a match. Still personal data under GDPR/CCPA (pseudonymized) — keep on a documented purpose
+ retention window.

### 10. `voice_usage`
Per-call voice-seconds metering, backing the always-metered voice limits (D4). One row per metered
STT or TTS segment; the daily limit sums `duration_seconds` for the user over the UTC day.

```
voice_usage
  id                uuid PK
  user_id           uuid notNull FK -> users.id      (on delete cascade)
  companion_id      uuid notNull FK -> companions.id (on delete cascade)
  duration_seconds  integer notNull                  -- metered seconds for this segment
  direction         text notNull                     -- 'stt' | 'tts'
  model_id          text notNull                     -- the STT/TTS model that produced it
  created_at        timestamptz notNull default now()
```
Notes: enforces `VOICE_DAILY_LIMIT_SECONDS` / `VOICE_CALL_MAX_DURATION_SECONDS` (premium variants in
shared). Purged on account deletion (cascade) — retention parity with conversations.

---

## Deletion & retention model

Right-to-erasure is **not absolute** (GDPR Art. 17(3); CCPA §1798.105(d)(2)) — purge the intimate
bulk, retain minimal time-bounded slices. **All numbers are recommended defaults pending counsel.**

| Data | On account deletion | Window |
|---|---|---|
| `users` | **soft-delete**: null first/last/DOB, tombstone email, `status='deleted'`, set `deleted_at` | 30-day recoverable grace |
| `companions`, `messages`, `memories`, `voice_usage` | **purge** (cascade) | within 30 days of grace expiry |
| Backups | "beyond use" until overwritten on normal cycle | ≤ 90 days |
| `safety_events` | **retain**, identity severed (`user_id`/`companion_id`/`message_id` → null) | 24 months |
| `banned_identities` | **retain** (hash only) | 24 months / until ban lifted |
| `subscriptions` (financial mirror) | **retain**, identity severed (`user_id`→null) | up to 7 years (RC/Apple also = system of record) |
| Deletion audit record (id + timestamp, no content) | retain | long-term |

**Lifecycle:** soft-delete (grace, recoverable) → hard-purge live PII/conversations → backups expire.
`safety_events` + `banned_identities` persist beyond, with identity severed.

**Legal-review items (do NOT invent):** exact retention numbers; whether `safety_events.flagged_content`
is retained in full or scrubbed to metadata; whether the `subscriptions` financial record keeps the
user↔transaction link (for chargebacks/disputes) or is fully anonymized on purge; served jurisdictions
(US-only vs EEA/UK); final privacy-policy + data-retention-policy wording.

---

## Migration / ops notes

- A single squashed `0000_init` baseline creating all 12 tables + enums-as-CHECK + indexes + FKs.
- `server/drizzle.config.ts` exists; workflow = `drizzle-kit generate` → review → commit SQL →
  runtime `migrate()` on boot. `drizzle-kit push` is forbidden; the TS schema is the complete source of truth.
- Build order (CI + Render): `@aura/shared` compiles before `server` (tables import its enum constants).
- Retention is enforced by scheduled jobs (purge, retention-expiry), not the schema — see
  [v1-tasklist.md](../planning/v1-tasklist.md) Phase 6.
```
