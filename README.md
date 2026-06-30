# Aura AI — AI Companion

An 18+ AI companion chat app with safety-first design, memory engine, and premium subscriptions.

## Tech Stack

- **Frontend**: React Native (Expo) + TypeScript
- **Backend**: Node.js + Express 5 (TypeScript)
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **LLM**: Groq (llama-3.1-8b-instant)
- **Auth**: Clerk (session tokens, webhooks)
- **Payments**: RevenueCat (in-app subscriptions)
- **Push**: APNs (Apple Push Notification service)
- **Safety**: OpenAI omni-moderation + Groq prompt-guard + custom safeguard

## Architecture

```
aura/
├── client/          # Expo / React Native app (iOS-first)
├── server/          # Express API + services
│   ├── src/
│   │   ├── config/        # Zod-validated env (fail-closed)
│   │   ├── routes/        # HTTP endpoints
│   │   ├── services/      # Business logic
│   │   │   ├── auth/      # Clerk middleware + webhook
│   │   │   ├── chat/      # Turn pipeline, prompt assembler
│   │   │   ├── moderation/ # L0-L3 safety pipeline
│   │   │   ├── memory/    # Retrieval, consolidation
│   │   │   ├── voice/     # LiveKit + Cartesia TTS + Deepgram STT
│   │   │   ├── payments/  # RevenueCat webhook
│   │   │   ├── notifications/ # APNs push
│   │   │   └── jobs/      # Async workers
│   │   ├── middleware/     # Auth, validate, rate-limit, error-handler
│   │   ├── db/            # Schema + migrations
│   │   └── lib/           # Logger, crypto, response envelope
│   └── eval/              # Eval corpora (moderation, retrieval, consolidation)
└── shared/          # @aura/shared — Zod DTOs, enums, constants
```

## Features

- ✅ Safety pipeline — crisis detection, L0-L3 content moderation, injection guard, break reminders
- ✅ Server-authoritative turn model — idempotent, moderated, fallback-safe
- ✅ Memory engine — keyword extraction, LLM consolidation, dedup + contradiction handling
- ✅ Age gating — 18+ self-attestation, Clerk-managed auth
- ✅ RevenueCat subscriptions — HMAC-verified webhooks, sandbox/prod handling
- ✅ APNs push notifications — transactional "your companion replied"
- ✅ Rate limiting — per-minute (30), daily hard cap (1000), auth brute-force
- ✅ Compliance — account deletion (soft-delete + 30d grace), data export, admin tools
- ✅ CI — GitHub Actions (typecheck, lint, test)
- ✅ Graceful shutdown — SIGTERM drain, retention jobs

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (local Docker or Neon)
- pnpm (`npm i -g pnpm`)

### Setup

```bash
pnpm install
cp .env.example .env   # fill in your keys
pnpm --filter @aura/server run migrate   # applies the single 0000_init baseline
pnpm --filter @aura/server run dev
```

> Migrations are squashed to a single `0000_init` baseline. New migrations are added via
> `drizzle-kit generate` (config: `server/drizzle.config.ts`) → review → runtime `migrate()`; `push` is forbidden.

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `GROQ_API_KEY` | Groq LLM API key |
| `OPENAI_API_KEY` | OpenAI moderation API key |
| `REVENUECAT_WEBHOOK_SECRET` | RevenueCat webhook signing secret |
| `BANNED_IDENTITY_PEPPER` | Pepper for banned-identity hashing |
| `CARTESIA_API_KEY` | Cartesia TTS API key — voice (optional) |
| `CARTESIA_VOICE_ID` | Cartesia voice ID — voice (optional) |
| `DEEPGRAM_API_KEY` | Deepgram streaming STT API key — voice (optional) |
| `LIVEKIT_API_KEY` | LiveKit API key — voice (optional) |
| `LIVEKIT_API_SECRET` | LiveKit API secret — voice (optional) |
| `LIVEKIT_URL` | LiveKit server URL — voice (optional) |

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/seed-companions` | Create default companions post-registration |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update profile (DOB, name, AI disclosure, TOS, avatarColor, primaryCompanionId — Home pin) |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chat/usage` | Get free-tier usage |
| GET | `/api/companions` | List companions |
| POST | `/api/companions` | Create companion |
| PATCH | `/api/companions/:id` | Update companion |
| GET | `/api/companions/:id/messages` | Get chat history |
| POST | `/api/companions/:id/chat` | Send message (moderated + persisted) |

### Memory
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/companions/:companionId/memories` | List a companion's memories |
| PATCH | `/api/memories/:id` | Edit a memory |
| DELETE | `/api/memories/:id` | Delete a memory |

### Voice
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/voice/limits` | Get voice usage limits |
| POST | `/api/voice/token` | Mint a LiveKit access token |
| POST | `/api/voice/start` | Start a voice session |
| POST | `/api/voice/stop` | Stop a voice session |
| POST | `/api/voice/tts` | Synthesize speech (Cartesia TTS) |

### Payments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payments/webhook` | RevenueCat webhook (HMAC-verified) |
| GET | `/api/payments/entitlements` | App-foreground premium refresh |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/notifications/register` | Register APNs device token |
| DELETE | `/api/notifications/register` | Unregister device token |

### Compliance
| Method | Path | Description |
|--------|------|-------------|
| DELETE | `/api/account` | Soft-delete account (30d grace) |
| PATCH | `/api/account/reactivate` | Reactivate within grace period |
| GET | `/api/account/export` | GDPR data export |
| POST | `/api/messages/:id/report` | Flag an AI message (UGC) |

### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/safety-events` | Review safety queue |
| GET | `/api/admin/metrics` | Safety/abuse counters (per-instance, in-memory) |
| POST | `/api/admin/ban` | Ban user by email |
| POST | `/api/admin/unban` | Unban user by email |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/healthz` | Health check (with DB probe) |
| POST | `/api/webhooks/clerk` | Clerk user lifecycle events (svix-signed) |

## Safety Pipeline

The moderation system runs on every message:

1. **L0** — Deterministic pre-filter (crisis keywords, hard-block terms)
2. **L1** — Prompt injection detection (parallel with L2)
3. **L2** — OpenAI omni-moderation (categories, crisis detection)
4. **L3** — Output moderation (AI reply screened before delivery)
5. **Safeguard** — Groq-based policy classification (on escalation or L2 fallback)
6. **Break reminders** — Configurable by age group (SB 243)
7. **Crisis path** — Fixed template + 988 resources, logged to safety_events

Fail-closed at every layer. Degradation ladder: OpenAI omni → Groq safeguard → block.

## Memory

- Keyword extraction with Jaccard similarity for retrieval
- LLM-based async consolidation: extract facts, deduplicate, handle contradictions
- Categories: identity, preference, attribute, relationship, work, location, general
- Recency decay + importance scoring for retrieval ranking

## License

MIT
