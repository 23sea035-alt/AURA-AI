# Aura AI — Chat System Design

**Status:** Build spec · **Scope:** unified text + voice chat — `ChatSession` core engine, WebSocket
transport, voice session state machine, priority queue, interruption handling, and implementation map.
**Last updated:** 2026-06-30

> This is the implementation-level spec. High-level decisions (D1, D13, §3, §4) live in
> [v1-architecture.md](v1-architecture.md). Moderation layers are specified in
> [moderation-pipeline.md](moderation-pipeline.md). Generation (prompt assembly, model, fallback)
> is in [generation-pipeline.md](generation-pipeline.md). This doc tells you **how to build the
> orchestration that ties those together.**

---

## 1. ChatSession — shared core engine

Both text and voice are I/O adapters on a single `ChatSession` class. Moderation, generation, abort
logic, and memory consolidation are implemented once.

### 1.1 Interface

```typescript
// Shared across @aura/shared — must be kept in sync with client abort handler
type AbortReason =
  | 'l0_block'
  | 'l0_crisis'
  | 'l1_block'
  | 'l2_abort'
  | 'l3_abort'
  | 'safeguard'
  | 'internal_error'   // Groq LLM error / timeout
  | 'rate_limited';    // Groq TPM ceiling or per-user rate limit

interface ChatSessionCallbacks {
  onToken(token: string): void;
  onSentenceComplete(sentence: string, index: number): void;
  onAbort(reason: AbortReason, safeReply: string): void;
  onComplete(reply: string): void;  // reply used by APNs and consolidation
  onError(err: Error): void;
}

interface ChatSessionParams {
  userId: string;
  companionId: string;
  turnId: string;
  isPremium: boolean;
  userMessage: string;
  conversationHistory: Message[];  // last 8 messages
  memoryBlock: string;             // pre-fetched, injected into system prompt
}

class ChatSession {
  constructor(params: ChatSessionParams, callbacks: ChatSessionCallbacks);
  run(): Promise<void>;  // enqueues to TurnQueue internally
  abort(): void;         // external abort (e.g. voice interrupt → detour)
}
```

### 1.2 Moderation sequencing

```
L0  (sync, ~0ms)
  └─ crisis match    → callbacks.onAbort('l0_crisis', crisisReply) + persist + log
  └─ hard block      → callbacks.onAbort('l0_block', safeReply) + persist + log
  └─ encoding detect → normalize input, continue

L1 + L2 start concurrently:
  [L1] Prompt Guard (~100ms) — BLOCKS generation
  [L2] Omni moderation (~250–500ms) — continues CONCURRENT with generation

L1 clears → generation starts (whether or not L2 has returned)

[L2 result arrives while generation is running]
  → unsafe → abort Groq stream → callbacks.onAbort('l2_abort', safeReply)
  → gray-band → safeguard escalation (async, off hot path)

[Generation token stream]
  [L3] Omni output moderation, CONCURRENT with token stream (stricter thresholds)
  → unsafe → abort → callbacks.onAbort('l3_abort', safeReply)

[Stream completes cleanly]
  → persist assistant reply to DB  ← WAIT: if L2 has not yet resolved, hold persistence
  → if L2 resolves unsafe after stream completes: delete the persisted reply + send abort frame
    (rare — generation of 2–4 sentences typically outlasts L2's 250–500ms; design for it anyway)
  → callbacks.onComplete(reply)    ← fires only after L2 is confirmed safe (or timed out → allow)
  → fire memory consolidation job (async, off-path)
  → fire APNs if client disconnected
```

### 1.3 Fail-closed behavior

| Scenario | Action |
|---|---|
| L0/L1 timeout | Block turn, persist safe fallback, log error |
| L2 timeout | Treat as `allow` (generation continues); log timeout |
| L3 timeout | Treat as `allow` (reply delivers); log timeout |
| Groq LLM error/timeout | `callbacks.onError()` → adapter plays fallback (text: static string; voice: pre-cached fallback clip) |
| Inworld TTS failure | Retry sentence once; skip on 2nd fail; 3+ consecutive → `onError` |

---

## 2. Text chat

### 2.1 WebSocket protocol

All frames are JSON. Client → server:

```typescript
// Initiate a turn
{ type: "turn", turnId: string, companionId: string, message: string }

// Reconnect: ask for latest state
{ type: "fetch_messages", companionId: string }

// Periodic re-auth — send before Clerk token expires (~every 55s on long-lived connections)
{ type: "refresh_auth", token: string }
```

Server → client:

```typescript
{ type: "token",             token: string }
{ type: "sentence_complete", index: number }
{ type: "complete" }
// Moderation block, LLM error, or explicit rate limit (Groq TPM / per-user limiter):
{ type: "abort",             code: AbortReason }
// TurnQueue full — free user must wait (distinct from abort: no turn was started)
{ type: "busy",              retryAfterMs: number }
{ type: "messages",          messages: Message[] }   // response to fetch_messages
{ type: "auth_ok" }                                  // response to refresh_auth
{ type: "auth_expired" }                             // client must reconnect with fresh token
```

**Clerk token expiry:** Clerk session tokens are short-lived (~60s). For text chat, the client
re-sends a `refresh_auth` frame every 55s. For voice calls (which can exceed 60s), the iOS client
must do the same. The server re-verifies the token and responds with `auth_ok` or `auth_expired`.
On `auth_expired`, the client closes and reopens the WebSocket with a fresh token — the turn model
(§3) ensures no messages are lost.

### 2.2 Connection lifecycle

```
Client                              Server
  │──── HTTP upgrade (Clerk token) ──▶│  verify Clerk session token
  │◀─── 101 Switching Protocols ──────│
  │                                    │
  │──── { type: "turn", ... } ────────▶│
  │                                    │  1. idempotency check (turnId already in DB?)
  │                                    │     yes → stream existing reply → done
  │                                    │  2. insert user message (immediate)
  │                                    │  3. enqueue to TurnQueue (premium=0, free=1)
  │                                    │  4. [when slot available] run ChatSession
  │◀─── { type: "token" } ────────────│  onToken → push frame
  │◀─── { type: "token" } ────────────│
  │◀─── { type: "sentence_complete" } │
  │◀─── { type: "complete" } ─────────│  onComplete → persist reply → consolidation + APNs
```

### 2.3 Text I/O adapter

```typescript
class TextChatAdapter {
  constructor(private ws: WebSocket, private params: ChatSessionParams) {}

  run() {
    const session = new ChatSession(this.params, {
      onToken: (t) => this.ws.send(JSON.stringify({ type: 'token', token: t })),
      onSentenceComplete: (_, i) =>
        this.ws.send(JSON.stringify({ type: 'sentence_complete', index: i })),
      onAbort: (reason, safeReply) => {
        this.ws.send(JSON.stringify({ type: 'abort', code: reason }));
        // safe reply already persisted by ChatSession
      },
      onComplete: () => this.ws.send(JSON.stringify({ type: 'complete' })),
      onError: (err) => {
        logger.error('ChatSession error', err);
        this.ws.send(JSON.stringify({ type: 'abort', code: 'internal_error' }));
      },
    });
    return session.run();
  }
}
```

### 2.4 Connection drop handling

- Server runs the turn to completion regardless (§3 turn model — `turnId` persists the reply).
- On `onComplete`: check if `ws.readyState === WebSocket.OPEN`. If not → fire APNs.
- Client on reconnect: sends `{ type: "fetch_messages" }` → gets full list, replaces optimistic
  bubble by `turnId` (never appends → no duplicates).

### 2.5 Free-tier rate limiting

The existing Postgres-backed rate limiter runs **before** the turn is enqueued. The limiter is
unchanged — only the transport layer (HTTP POST → WebSocket message) changes. If the rate limit
is hit, return `{ type: "abort", code: "rate_limited" }` and do not enqueue.

---

## 3. Voice chat

### 3.1 Architecture overview

**Transport decision (supersedes D13's LiveKit-as-media-transport):** The hybrid Apple VAD
architecture sends *complete utterance chunks* (not a continuous audio stream). Continuous
WebRTC streaming (LiveKit's primary value) is not needed. **LiveKit was therefore removed entirely**
(as-built: `livekit-server-sdk` uninstalled, no `LIVEKIT_*` env vars remain, `/api/voice/token` deleted).
Session lifecycle (`/start`, `/stop`, `/limits`) becomes **plain metering/DB endpoints** with no LiveKit
SDK — and audio travels over **binary WebSocket frames**, not WebRTC tracks. Instead:

- **Control plane:** chat WebSocket (JSON frames — interrupt signals, state transitions, errors)
- **Audio upload (STT):** binary WebSocket frame on the same chat connection — raw audio bytes, not
  base64 JSON (avoids the ~33% encoding overhead and is faster to parse)
- **Audio download (TTS):** binary WebSocket frames back to iOS — raw Inworld TTS output

This simplifies the stack: no WebRTC ICE negotiation on voice start, fewer moving parts, and **no
`LIVEKIT_*` secrets at all** (LiveKit is fully removed). Voice env is `INWORLD_API_KEY` +
`INWORLD_VOICE_ID_{AURORA,ORION,LYRA}`; Groq STT reuses `GROQ_API_KEY`.

```
iOS (on-device)                          Server
  │                                         │
  │  Apple speech recognizer                │
  │  ├─ Real-time local transcript          │
  │  └─ Energy spike → VAD event            │
  │                                         │
  │──── POST /api/voice/start ─────────────▶│ open VoiceSession; meter in voice_usage
  │──── JSON: { type: "start_voice" } ─────▶│ pre-generate filler bank + fallback clip
  │◀─── JSON: { type: "session_ready" } ────│
  │                                          │
  │──── BINARY: <wav audio bytes> ──────────▶│ → Groq STT → transcript → ChatSession
  │◀─── BINARY: <TTS audio bytes, index: N> ─│ (Inworld TTS, sentence by sentence)
  │  AVAudioPlayer plays                      │
  │                                           │
  │──── JSON: { type: "interrupt",            │
  │             sentenceIndex: N } ───────────▶│ cancel TTS, compute remainingBuffer
  │◀─── JSON: { type: "resume" |              │
  │             "acknowledge" | "detour" } ────│
  │                                            │
  │──── POST /api/voice/stop ─────────────────▶│ finalize metering
```

**Binary frame disambiguation:** the WebSocket connection carries both JSON control frames and raw
binary audio frames. Disambiguate by frame type: `string` → JSON control frame; `Buffer` →
audio. On the server, check `typeof message === 'string'` vs `message instanceof Buffer`.

**Voice control frames (JSON, both directions):**

```typescript
// Client → server (JSON)
{ type: "start_voice" }
{ type: "interrupt", sentenceIndex: number }
{ type: "refresh_auth", token: string }

// Server → client (JSON)
{ type: "session_ready" }
{ type: "resume" }
{ type: "acknowledge" }
{ type: "detour" }
{ type: "abort",   code: AbortReason }
{ type: "error",   code: string }
{ type: "auth_ok" }
{ type: "auth_expired" }
```

### 3.2 Session open

On `{ type: "start_voice" }`:

1. Look up companion voice ID from env var (`INWORLD_VOICE_ID_{AURORA|ORION|LYRA}`); skip filler pre-gen gracefully if unset
2. Pre-generate **filler clips** (6 clips: "anyway...", "so as I was saying...", "right, where
   were we...", "mm, let me think...", "so...", "as I was saying...") via Inworld TTS WebSocket
3. Pre-generate **voice fallback clip** ("I lost my train of thought — say that again?") via
   Inworld TTS WebSocket
4. Cache all as `Buffer[]` on the `VoiceSession` object
5. Send `{ type: "session_ready" }` to iOS

Cost: ~7 short Inworld TTS calls at session open (~200–400ms). Eliminates all latency on every
subsequent filler or error event during the call.

### 3.3 VoiceSession state object

```typescript
type VoiceState =
  | 'IDLE'
  | 'AI_SPEAKING'
  | 'INTERRUPTED'
  | 'CLASSIFYING'
  | 'RESUMING'
  | 'ACKNOWLEDGING'
  | 'USER_SPEAKING'
  | 'PROCESSING'
  | 'ERROR';

interface VoiceSessionState {
  sessionId: string;
  userId: string;
  companionId: string;
  isPremium: boolean;
  state: VoiceState;

  // Buffer tracking — maintained across the active turn
  allSentences: string[];           // all sentences generated this turn
  sentencesDispatched: number;      // count sent to Inworld TTS
  currentSentenceIndex: number;     // what iOS is currently playing (from interrupt frame)
  remainingBuffer: string[];        // allSentences[currentSentenceIndex + 1:]

  // Pre-generated audio (session-open)
  fillerClips: Buffer[];
  fillerIndex: number;              // round-robin through clips
  fallbackClip: Buffer;

  // Active STT call handle (for cancellation)
  activeSttController: AbortController | null;

  // Timers
  silenceTimer: NodeJS.Timeout | null;
  callDurationTimer: NodeJS.Timeout | null;
}
```

### 3.4 State machine

#### Stable states

| State | Description |
|---|---|
| `IDLE` | Waiting for user to speak |
| `AI_SPEAKING` | TTS audio playing on iOS; server streaming sentences to Inworld |
| `USER_SPEAKING` | Mic open; local VAD accumulating audio |
| `PROCESSING` | LLM + moderation running for user's turn |
| `ERROR` | Unrecoverable failure; awaiting cleanup |

#### Transient states (milliseconds)

| State | Description |
|---|---|
| `INTERRUPTED` | VAD fired; Groq STT call in flight |
| `CLASSIFYING` | STT returned; running classification rule |
| `RESUMING` | Playing filler before re-entering `AI_SPEAKING` |
| `ACKNOWLEDGING` | LLM generating bridge; about to re-enter `AI_SPEAKING` |

#### Full transition table

```
IDLE
  ├─ VAD triggers
  │   → USER_SPEAKING
  └─ Silence > VOICE_SILENCE_PROMPT_TIMEOUT_S
      → play soft prompt ("still there?"), reset timer
  └─ Silence > VOICE_SILENCE_END_TIMEOUT_S
      → graceful call end → IDLE (session cleanup)

USER_SPEAKING
  └─ VAD end-of-utterance detected (Apple native)
      → send audio chunk to Groq STT
      → await transcript
      → PROCESSING (ChatSession.run())

PROCESSING
  ├─ First Inworld TTS audio chunk ready
  │   → AI_SPEAKING
  ├─ LLM/moderation failure (onError)
  │   → play fallbackClip → AI_SPEAKING (with safe text persisted)
  └─ WebSocket drops
      → complete turn to end regardless
      → fire APNs on completion
      → clean session

AI_SPEAKING
  ├─ VAD fires (iOS sends { type: "interrupt", sentenceIndex: N })
  │   → iOS: pause AVAudioPlayer, shrink visualizer, fire haptic
  │   → server: remainingBuffer = allSentences[N+1:], cancel Inworld TTS stream
  │   → INTERRUPTED
  └─ Natural stream end (all sentences delivered, onComplete)
      → IDLE

INTERRUPTED
  ├─ Groq STT returns transcript
  │   → CLASSIFYING
  ├─ VAD fires again (second interruption before STT returns)
  │   → cancel activeSttController, start new STT call with new audio
  │   → stay INTERRUPTED
  ├─ STT timeout/error (attempt 1)
  │   → retry
  └─ STT timeout/error (attempt 2)
      → default to RESUMING (conservative: treat as noise)

CLASSIFYING
  ├─ transcript is empty OR ≤ 2 non-lexical tokens
  │   → RESUMING
  ├─ transcript ≤ INTERJECTION_MAX_WORDS AND matches affirmation list AND no new subject
  │   → ACKNOWLEDGING
  ├─ anything else (substantive new content)
  │   → flush remainingBuffer → PROCESSING
  │     (use STT transcript as the input directly — skip re-recording;
  │      iOS receives { type: "detour" } to clear audio queue and show processing state)
  └─ VAD fires during classification (rare; state is <50ms)
      → drop classification → INTERRUPTED with new audio

RESUMING
  ├─ Pick next fillerClip (round-robin), send to iOS
  │   Re-queue remainingBuffer sentences to Inworld TTS → AI_SPEAKING
  └─ VAD fires during filler
      → treat as AI_SPEAKING interrupt → INTERRUPTED, discard remainingBuffer

ACKNOWLEDGING
  ├─ Send [userTranscript] + [remainingBuffer] + bridge instruction to ChatSession
  ├─ First TTS chunk ready → AI_SPEAKING
  ├─ LLM failure → skip acknowledgment, re-queue remainingBuffer → AI_SPEAKING
  └─ VAD fires during acknowledgment audio
      → treat as AI_SPEAKING interrupt → INTERRUPTED

ERROR
  └─ Server sends { type: "error", code } to iOS
      → iOS: show brief error, return to chat input → IDLE (session cleanup)
```

### 3.5 Voice I/O adapter

```typescript
class VoiceAdapter {
  constructor(private session: VoiceSession, private ws: WebSocket) {}

  // Wired into ChatSession events
  attachToSession(chatSession: ChatSession) {
    chatSession.callbacks = {
      onToken: () => {},  // voice doesn't stream tokens — waits for sentence boundary
      onSentenceComplete: (sentence, index) => {
        this.session.allSentences.push(sentence);
        this.session.sentencesDispatched++;
        // ALL TTS calls go through ttsQueue — never call inworldTTS directly
        ttsQueue.add(() => this.streamSentenceToTTS(sentence, index));
      },
      onAbort: (reason, safeReply) => {
        ttsQueue.clear();              // cancel any queued sentences
        this.cancelActiveTTSStream(); // cancel the in-flight Inworld TTS call if any
        this.ws.send(JSON.stringify({ type: 'abort', code: reason }));
        this.ws.send(this.session.fallbackClip);  // binary frame: pre-cached audio
      },
      onComplete: (reply) => {
        // ttsQueue drains naturally; state transitions to IDLE when queue empties
        void reply; // already persisted + APNs-checked by ChatSession
      },
      onError: () => {
        ttsQueue.clear();
        this.ws.send(JSON.stringify({ type: 'error', code: 'generation_failed' }));
        this.ws.send(this.session.fallbackClip);  // binary frame: pre-cached audio
      },
    };
  }

  // ALWAYS called through ttsQueue — never directly
  private async streamSentenceToTTS(sentence: string, index: number) {
    const audioBytes = await inworldTTS.synthesize(sentence); // returns Buffer
    // Binary frame with metadata prefix: 4-byte big-endian index, then raw audio
    const header = Buffer.alloc(4);
    header.writeUInt32BE(index, 0);
    this.ws.send(Buffer.concat([header, audioBytes]));
  }
}
```

### 3.6 Interruption classification

Pure rule-based — no LLM call, runs in <1ms:

```typescript
const NON_LEXICAL = new Set(['um', 'uh', 'mm', 'hmm', 'hm', 'ah', 'oh', 'er']);

const AFFIRMATION_PATTERNS = [
  /^(oh )?(wow|no way|really|seriously|what|whoa)[\?!]?$/i,
  /^(that'?s )?(crazy|wild|amazing|insane|so cool|awesome)[\?!]?$/i,
  /^(i know|i see|got it|right|okay|ok|sure|yes|yeah|yep|nope|no)[\?!]?$/i,
  /^(haha|lol|hah|lmao)[\?!]?$/i,
  /^(tell me more|go on|and\??)$/i,
];

function classifyInterruption(
  transcript: string
): 'resume' | 'interjection' | 'detour' {
  const words = transcript.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0 || words.every(w => NON_LEXICAL.has(w.toLowerCase()))) {
    return 'resume';
  }

  if (
    words.length <= INTERJECTION_MAX_WORDS &&
    AFFIRMATION_PATTERNS.some(p => p.test(transcript.trim()))
  ) {
    return 'interjection';
  }

  return 'detour';
}
```

### 3.7 Edge case resolutions

| Edge case | Resolution |
|---|---|
| VAD fires during `INTERRUPTED` | Cancel activeSttController, restart STT with new audio |
| VAD fires during `CLASSIFYING` | Drop classification; re-enter `INTERRUPTED` |
| VAD fires during `RESUMING` | Treat as `AI_SPEAKING` interrupt → `INTERRUPTED`; discard remainingBuffer |
| VAD fires during `ACKNOWLEDGING` | Treat as `AI_SPEAKING` interrupt → `INTERRUPTED` |
| VAD fires during `PROCESSING` | Buffer event; if `AI_SPEAKING` starts while VAD still active → immediately `INTERRUPTED` |
| STT fails twice | Default to `RESUMING` (conservative — treat as noise) |
| Inworld TTS sentence failure | Retry once; skip on 2nd; 3+ consecutive → `ERROR` |
| WebSocket drops during `AI_SPEAKING` | Cancel TTS stream; clean session |
| WebSocket drops during `PROCESSING` | Complete turn; fire APNs; clean session |
| Max call duration hit | LLM generates graceful wrap-up ("I need to go — talk soon!"); TTS plays it; → `IDLE` |
| `IDLE` silence timeout 1 | Play soft prompt ("still there?"), reset silence timer |
| `IDLE` silence timeout 2 | Graceful call end, session cleanup |
| Priority queue full (free user voice turn) | Play short hold clip; queue turn; if wait > `TURN_QUEUE_MAX_FREE_WAIT_MS` → send `{ type: "error" }` |
| Double interjection (VAD during `ACKNOWLEDGING`) | Identical path to `AI_SPEAKING` interrupt — bridge audio is AI speech |
| "That's interesting" classification ambiguity | Word-count rule wins (≤7 words → interjection). Misclassification is recoverable; the call continues either way. |

### 3.8 iOS responsibilities

The client owns all real-time visual/haptic feedback. Nothing waits for a server round-trip to
update UI.

| Trigger | iOS action | Server notification sent |
|---|---|---|
| Local VAD fires | Immediately: shrink/dim AI visualizer; fire `.light` haptic; pause `AVAudioPlayer` | `{ type: "interrupt", sentenceIndex: N }` |
| Receive `{ type: "resume" }` | Play next filler audio buffer; resume sentence queue | — |
| Receive `{ type: "acknowledge" }` | Maintain paused state; await `audio_chunk` frames | — |
| Receive `{ type: "detour" }` | Clear audio queue; show user-speaking UI; open mic | — |
| Receive `{ type: "abort" }` | Clear partial text/audio; show canned safe reply | — |
| Receive `{ type: "error" }` | Show brief error state; return to chat input screen | — |
| Receive `{ type: "audio_chunk" }` | Append to `AVAudioPlayer` queue; play in order | — |
| App enters background | WebSocket drops automatically (iOS lifecycle) | Server detects disconnection; completes turn; fires APNs |

---

## 4. Priority queue

### 4.1 TurnQueue (text + voice)

```typescript
import PQueue from 'p-queue';

// Single shared queue; both text WebSocket and voice turns go through it
const turnQueue = new PQueue({
  concurrency: TURN_QUEUE_CONCURRENCY,   // tune to Groq TPM headroom; start at 8
});

export function enqueueTurn(
  task: () => Promise<void>,
  isPremium: boolean
): Promise<void> {
  return turnQueue.add(task, { priority: isPremium ? 0 : 1 });
}
```

- **Priority 0** (premium): served immediately when a slot opens
- **Priority 1** (free): waits behind all pending premium turns
- When a free user's turn has waited > `TURN_QUEUE_MAX_FREE_WAIT_MS` without being picked up,
  send `{ type: "busy", retryAfterMs }` and remove from queue
- Premium users are only rate-limited by Groq's org-level TPM, not by this queue

### 4.2 TtsQueue (voice only)

```typescript
const ttsQueue = new PQueue({
  concurrency: INWORLD_CONCURRENT_LIMIT,   // 10 on Creator plan (40 effective sessions)
});
```

Prevents exceeding Inworld's concurrent request limit. Each sentence synthesis call occupies one
slot.

### 4.3 Scope

The priority queue applies to LLM-heavy operations only: ChatSession execution and Inworld TTS
calls. It does **not** apply to:
- CRUD endpoints (profile, companions, memories)
- Memory management API
- Auth or payment endpoints
- Memory consolidation job (managed by the existing `FOR UPDATE SKIP LOCKED` worker)

---

## 5. Memory consolidation trigger

Consolidation fires from the `onComplete` event — unchanged logic, changed trigger point:

```typescript
// In ChatSession.onComplete handler:
async function onTurnComplete(params: TurnCompleteParams) {
  // Persist reply (already done inside ChatSession)

  // Fire consolidation asynchronously — never awaited on the critical path
  consolidationQueue.add(() =>
    runConsolidation({
      userId: params.userId,
      companionId: params.companionId,
      userMessage: params.userMessage,
      assistantReply: params.fullReply,
    })
  ).catch(err => logger.error('consolidation enqueue failed', err));

  // Fire APNs if client is away
  await maybeFireApns(params.userId, params.fullReply);
}
```

The `consolidationQueue` is the existing Postgres-backed job worker (`FOR UPDATE SKIP LOCKED`).
The only change from the current REST implementation: the trigger moves from the HTTP response
lifecycle to the ChatSession `onComplete` event.

---

## 6. APNs + WebSocket coexistence

```typescript
const connectedSockets = new Map<string, WebSocket>();  // userId → socket

// On WS connect
connectedSockets.set(userId, ws);

// On WS disconnect
ws.on('close', () => connectedSockets.delete(userId));

interface TurnCompleteParams {
  userId: string;
  companionId: string;
  companionName: string;
  reply: string;
}

// On turn completion (text or voice) — called from ChatSession.onComplete
async function maybeFireApns(params: TurnCompleteParams) {
  const ws = connectedSockets.get(params.userId);
  if (ws && ws.readyState === WebSocket.OPEN) return;  // client is live, already got it

  // Client is away — push notification
  await apnsService.send(params.userId, {
    title: `${params.companionName} replied`,
    body: params.reply.slice(0, 80),
    data: { type: 'companion_reply', companionId: params.companionId },
  });
}
```

No polling. The check is a single `Map` lookup at turn completion.

---

## 7. Implementation map

### 7.1 Rewrite (new code)

| File | What changes |
|---|---|
| `server/src/app.ts` | Replace fake-streaming WS scaffold with `ws` server; register message router |
| `server/src/controllers/chat.controller.ts` | Rewrite as thin WS message handler that creates adapters and calls `enqueue` |
| `server/src/services/chat/chat-session.ts` | **New** — `ChatSession` class: moderation sequencing (L1 blocking, L2+L3 concurrent), Groq streaming, event emitter |
| `server/src/services/chat/text-adapter.ts` | **New** — `TextChatAdapter`: WS frame push on `onToken` / `onAbort` / `onComplete` |
| `server/src/services/chat/turn-pipeline.ts` | Retire; logic moves into `ChatSession` |
| `server/src/services/voice/voice-session.ts` | **New** — `VoiceSession`: state machine, buffer tracking, filler/fallback clip management |
| `server/src/services/voice/voice-adapter.ts` | **New** — `VoiceAdapter`: wires ChatSession events to Inworld TTS + WS audio frames |
| `server/src/services/voice/interruption.ts` | **New** — `classifyInterruption()` + affirmation list |
| `server/src/services/queue/turn-queue.ts` | **New** — `p-queue`-backed `TurnQueue` + `TtsQueue` |
| `server/src/services/stt/groq-stt.ts` | **New** — Groq Whisper STT client (`whisper-large-v3-turbo`); replaces Deepgram |
| `server/src/routes/chat.ts` | Migrate from `POST /companions/:id/chat` → WS message handler; keep REST endpoint stubbed during transition |
| `server/src/routes/voice.ts` | **Remove** `/api/voice/token` (LiveKit JWT — no longer needed) and `/api/voice/tts` (replaced by WS binary frames). **Retain** `/api/voice/limits`, `/api/voice/start`, `/api/voice/stop` — strip LiveKit SDK calls from their handlers (they become pure metering/DB operations) |
| `server/src/services/voice/livekit.ts` | **Delete** — LiveKit removed entirely (see D13) |

### 7.2 Keep (no changes needed)

| Module | Why unchanged |
|---|---|
| All moderation services (`L0`, `L1`, `L2`, `L3`) | Only the orchestration around them changes; the services are called the same way |
| `server/src/services/memory/` | Consolidation service is unchanged; only the trigger point moves to `onComplete` |
| `server/src/db/` | All queries and schema unchanged |
| Auth middleware (`@clerk/express`) | Unchanged; verify Clerk token on WS upgrade (HTTP headers) |
| Rate limiting (Postgres-backed) | Unchanged; runs before `ChatSession` is enqueued |
| Safety event logging | Unchanged; `ChatSession` calls `logSafetyEvent()` as before |
| Break reminder service | Unchanged; queried per-session as before |
| `server/src/services/llm/model-selector.ts` | **One-line change only**: swap primary/fallback — `llama-3.3-70b-versatile` → primary, `llama-3.1-8b-instant` → fallback |

### 7.3 Env var delta

| Action | Key |
|---|---|
| **Remove** | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` (LiveKit removed) |
| **Remove** | `DEEPGRAM_API_KEY` (Groq STT uses `GROQ_API_KEY`) |
| **Remove** | `CARTESIA_API_KEY`, `CARTESIA_VOICE_ID` |
| **Add** | `INWORLD_API_KEY`, `INWORLD_VOICE_ID_AURORA`, `INWORLD_VOICE_ID_ORION`, `INWORLD_VOICE_ID_LYRA` (per-persona; fill after casting in Inworld portal) |
| **TTS model** | `inworld-tts-2` chosen over `tts-1.5-max` — cheaper + full bracket-tag steering + `deliveryMode` |
| **No change** | `GROQ_API_KEY` — covers LLM generation, STT, and moderation guards |

---

## 8. Constants (`@aura/shared`)

```typescript
// Turn queue
export const TURN_QUEUE_CONCURRENCY = 8;          // tune to Groq 70B TPM headroom; watch at production
export const TURN_QUEUE_MAX_FREE_WAIT_MS = 8_000; // free users get busy frame after 8s in queue

// TTS concurrency
export const INWORLD_CONCURRENT_LIMIT = 10;        // Creator plan; 40 effective concurrent sessions (4× multiplier)

// Voice session timers
export const VOICE_SILENCE_PROMPT_TIMEOUT_S = 45;  // play soft "still there?" prompt
export const VOICE_SILENCE_END_TIMEOUT_S = 90;     // graceful call end

// Voice session audio
export const VOICE_FILLER_CLIP_COUNT = 6;          // clips pre-generated at session open
export const VOICE_FILLER_TEXTS = [
  'anyway...',
  'so, as I was saying...',
  'right, where were we...',
  'so...',
  'mm, let me think...',
  'well, continuing on...',
] as const;
export const VOICE_FALLBACK_TEXT = "I lost my train of thought — say that again?";

// Interruption classification
export const INTERJECTION_MAX_WORDS = 7;
export const STT_MAX_RETRIES = 2;

// Groq model (generation)
export const LLM_PRIMARY_MODEL = 'llama-3.3-70b-versatile';
export const LLM_FALLBACK_MODEL = 'llama-3.1-8b-instant';

// Groq STT
export const STT_MODEL = 'whisper-large-v3-turbo';

// Note: on the free Groq plan, 70B is capped at 12K TPM (~48 turns/min at 250 tokens/turn).
// Move to a paid Groq plan before voice goes to production — voice call latency is sensitive
// to TPM ceiling hits.
```

---

## 9. Prototype delta (for the coworker)

| Prototype artifact | Action |
|---|---|
| `app.ts` fake-streaming WebSocket scaffold | **Replace** with proper `ws` server |
| `POST /companions/:id/chat` → `processTurn()` blocking REST handler | **Migrate** to WS message handler; keep REST stub during transition |
| `turn-pipeline.ts` sequential blocking pipeline | **Retire** — logic moves to `ChatSession` |
| `model-selector.ts` 8B primary | **One-line swap**: 70B primary, 8B fallback |
| Deepgram STT client | **Replace** with `groq-stt.ts` |
| `DEEPGRAM_API_KEY` in env | **Remove** from `.env`, Render secrets, and all env docs |
| No priority queue exists | **Add** `turn-queue.ts` using `p-queue` |
| No voice state machine | **Add** `voice-session.ts` |
| Consolidation triggered from HTTP response path | **Move** trigger to `ChatSession.onComplete` |
| LiveKit used as audio media transport (WebRTC tracks for continuous audio) | **Remove LiveKit entirely** — `livekit-server-sdk` uninstalled, `LIVEKIT_*` env vars deleted, `/api/voice/token` endpoint deleted. Session lifecycle (`/start`, `/stop`, `/limits`) retained as pure metering endpoints with LiveKit SDK calls stripped out (see D13) |
