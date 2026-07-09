// Live WebSocket transport for streaming chat turns AND the voice-call loop — built against
// the server's REAL contract (server/src/websocket/handler.ts + services/{chat,voice}):
//
//   inbound  → {type:'turn', companionId, content, turnId?, sessionStartedAt?}
//              {type:'voice_start', companionId, sessionStartedAt?}
//              [binary frame] = one complete user utterance (raw audio bytes, no header)
//              {type:'voice_interrupt', transcript?} | {type:'voice_stop'}
//              {type:'refresh_auth', token}
//   outbound ← {type:'token', token}      one frame per output-moderated SENTENCE
//              {type:'complete', turnId, aiMessageId, userMessageId, breakReminder,
//               aiDisclosure, crisisResources, companionId}
//              {type:'voice_ready'|'voice_busy'|'voice_caption'|'voice_interrupted'|
//               'voice_stopped'|'voice_complete', …}
//              [binary frame] = [u32 BE frame index][MP3 @ 24 kHz] — one per spoken sentence
//              {type:'abort', code, detail?}   input_blocked | rate_limited |
//                                              free_limit_reached | voice_limit_reached |
//                                              utterance_too_large | internal_error | …
//              {type:'error', code}            malformed frames only
//              {type:'auth_ok' | 'auth_expired'}
//
// Auth rides ?token= (RN WebSocket can't set headers). Clerk JWTs live ~60s: we send
// refresh_auth every ~55s and cycle the socket on auth_expired (server auth is fixed at
// upgrade — the refresh loop tells the CLIENT when to reconnect, chat spec §2.1). One
// open socket = presence for ONE companion: while the chat is open the server delivers
// over WS instead of firing the away-reply push (reply-push.ts). A turn interrupted by a
// drop is recovered by re-sending the SAME turnId (server-side idempotent replay).
//
// The server allows ONE socket per (user, companion) — a second one evicts the first with
// close code 4000 — so sockets are shared through the refcounted registry below (the chat
// screen and the voice-call screen both hold the same instance).
import { getSessionToken } from '@/lib/clerk';
import { wsBaseUrl } from '@/lib/env';
import type { VoicePace } from '@aura/shared';

export type WsAbortCode =
  | 'input_blocked'
  | 'input_crisis'
  | 'output_blocked'
  | 'rate_limited'
  | 'free_limit_reached'
  | 'voice_limit_reached'
  | 'utterance_too_large'
  | 'internal_error';

export interface WsComplete {
  turnId?: string;
  aiMessageId?: string;
  userMessageId?: string;
  breakReminder?: string | null;
  aiDisclosure?: boolean;
  crisisResources?: string[] | null;
}

export interface TurnHandlers {
  /** One output-moderated sentence (trailing space included). */
  onToken: (sentence: string) => void;
  onComplete: (frame: WsComplete) => void;
  onAbort: (code: WsAbortCode, detail?: string) => void;
}

export interface VoiceHandlers {
  /** Call is open (also re-sent after a silent/no-speech utterance). */
  onReady: (remainingSeconds: number) => void;
  /** Sentence text, sent just ahead of its audio frame (drives captions). */
  onCaption?: (index: number, text: string) => void;
  /** One MP3 frame (24 kHz) per spoken sentence, index monotonic per turn. */
  onAudio: (index: number, mp3: Uint8Array) => void;
  onBusy?: () => void;
  onInterrupted?: (cls: string) => void;
  onStopped?: () => void;
  onComplete: (frame: WsComplete) => void;
  onAbort: (code: WsAbortCode, detail?: string) => void;
}

const REFRESH_MS = 55_000;
const RECONNECT_BASE_MS = 800;
const MAX_RECONNECT_ATTEMPTS = 5;

export class ChatSocket {
  private ws: WebSocket | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private closedByUser = false;
  private activeTurn: TurnHandlers | null = null;
  private voice: VoiceHandlers | null = null;

  constructor(private readonly companionId: string) {}

  get ready(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  open(): void {
    this.closedByUser = false;
    void this.connect();
  }

  /** Send a turn over the open socket. False = not connected (caller falls back to REST). */
  sendTurn(
    content: string,
    turnId: string,
    sessionStartedAt: string | undefined,
    handlers: TurnHandlers,
  ): boolean {
    if (!this.ready) return false;
    this.activeTurn = handlers;
    this.ws!.send(
      JSON.stringify({ type: 'turn', companionId: this.companionId, content, turnId, sessionStartedAt }),
    );
    return true;
  }

  // ── Voice ──────────────────────────────────────────────────────────────────

  /** Register the voice-call screen's handlers (one screen at a time). */
  setVoiceHandlers(handlers: VoiceHandlers): void {
    this.voice = handlers;
  }

  clearVoiceHandlers(): void {
    this.voice = null;
  }

  /** Open the voice session (server replies voice_ready with remainingSeconds). */
  startVoice(sessionStartedAt?: string, pace?: VoicePace): boolean {
    if (!this.ready) return false;
    this.ws!.send(JSON.stringify({ type: 'voice_start', companionId: this.companionId, sessionStartedAt, pace }));
    return true;
  }

  /** One complete user utterance as a raw binary frame (server sniffs the container). */
  sendUtterance(bytes: Uint8Array): boolean {
    if (!this.ready) return false;
    this.ws!.send(bytes);
    return true;
  }

  interruptVoice(transcript?: string): void {
    if (this.ready) this.ws!.send(JSON.stringify({ type: 'voice_interrupt', transcript }));
  }

  stopVoice(): void {
    if (this.ready) this.ws!.send(JSON.stringify({ type: 'voice_stop' }));
  }

  close(): void {
    this.closedByUser = true;
    this.stopTimers();
    this.activeTurn = null;
    this.voice = null;
    this.ws?.close();
    this.ws = null;
  }

  private async connect(): Promise<void> {
    const token = await getSessionToken();
    if (this.closedByUser) return;
    if (!token) {
      this.scheduleReconnect();
      return;
    }
    const ws = new WebSocket(`${wsBaseUrl()}/chat?token=${encodeURIComponent(token)}`);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startRefreshLoop();
    };
    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // [u32 BE frame index][MP3 bytes] — the TTS audio path.
        if (event.data.byteLength < 4) return;
        const view = new DataView(event.data);
        const index = view.getUint32(0, false);
        this.voice?.onAudio(index, new Uint8Array(event.data, 4));
        return;
      }
      this.handleFrame(String(event.data));
    };
    ws.onerror = () => {
      // onclose always follows; reconnect is handled there.
    };
    ws.onclose = () => {
      if (this.ws !== ws) return; // an old socket cycling out
      this.stopTimers();
      if (this.activeTurn) {
        // Mid-turn drop: the server still runs the turn to completion — the caller marks
        // the send failed and tap-to-retry replays the SAME turnId (idempotent).
        this.activeTurn.onAbort('internal_error', 'connection lost');
        this.activeTurn = null;
      }
      this.voice?.onAbort('internal_error', 'connection lost');
      if (!this.closedByUser) this.scheduleReconnect();
    };
  }

  private handleFrame(raw: string): void {
    let frame: Record<string, unknown>;
    try {
      frame = JSON.parse(raw);
    } catch {
      return;
    }
    switch (frame.type) {
      case 'token':
        this.activeTurn?.onToken(String(frame.token ?? ''));
        break;
      case 'complete': {
        const turn = this.activeTurn;
        this.activeTurn = null;
        turn?.onComplete(frame as unknown as WsComplete);
        break;
      }
      case 'voice_ready':
        this.voice?.onReady(Number(frame.remainingSeconds ?? 0));
        break;
      case 'voice_caption':
        this.voice?.onCaption?.(Number(frame.index ?? 0), String(frame.text ?? ''));
        break;
      case 'voice_busy':
        this.voice?.onBusy?.();
        break;
      case 'voice_interrupted':
        this.voice?.onInterrupted?.(String(frame.class ?? 'resume'));
        break;
      case 'voice_stopped':
        this.voice?.onStopped?.();
        break;
      case 'voice_complete':
        this.voice?.onComplete(frame as unknown as WsComplete);
        break;
      case 'abort': {
        const code = frame.code as WsAbortCode;
        const detail = frame.detail as string | undefined;
        if (this.activeTurn) {
          const turn = this.activeTurn;
          this.activeTurn = null;
          turn.onAbort(code, detail);
        } else {
          this.voice?.onAbort(code, detail);
        }
        break;
      }
      case 'error': {
        // Malformed-frame class — terminal for the in-flight turn; the socket stays up.
        const code = String(frame.code ?? 'error');
        if (this.activeTurn) {
          const turn = this.activeTurn;
          this.activeTurn = null;
          turn.onAbort('internal_error', code);
        } else {
          this.voice?.onAbort('internal_error', code);
        }
        break;
      }
      case 'auth_expired':
        // Cycle onto a fresh token; the turn model means nothing is lost (spec §2.1).
        this.cycle();
        break;
      default:
        break; // auth_ok and future frame types
    }
  }

  private cycle(): void {
    const old = this.ws;
    this.ws = null;
    this.stopTimers();
    old?.close();
    if (!this.closedByUser) void this.connect();
  }

  private startRefreshLoop(): void {
    this.stopTimers();
    this.refreshTimer = setInterval(() => {
      void (async () => {
        const token = await getSessionToken();
        if (token && this.ready) this.ws!.send(JSON.stringify({ type: 'refresh_auth', token }));
      })();
    }, REFRESH_MS);
  }

  private scheduleReconnect(): void {
    if (this.closedByUser || this.reconnectTimer) return;
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return; // REST fallback carries on
    const delay = RECONNECT_BASE_MS * 2 ** this.reconnectAttempts;
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private stopTimers(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// ── Shared socket registry ────────────────────────────────────────────────────
// One live socket per companion, shared by every holder (chat screen presence + the
// voice-call screen) — a second socket for the same companion would evict the first
// server-side (close code 4000). Refcounted so overlapping screens compose.

const registry = new Map<string, { socket: ChatSocket; refs: number }>();

export function acquireChatSocket(companionId: string): ChatSocket {
  const entry = registry.get(companionId);
  if (entry) {
    entry.refs += 1;
    return entry.socket;
  }
  const socket = new ChatSocket(companionId);
  socket.open();
  registry.set(companionId, { socket, refs: 1 });
  return socket;
}

/** The held socket, if any holder has it open — no refcount change. */
export function peekChatSocket(companionId: string): ChatSocket | undefined {
  return registry.get(companionId)?.socket;
}

export function releaseChatSocket(companionId: string): void {
  const entry = registry.get(companionId);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs <= 0) {
    entry.socket.close();
    registry.delete(companionId);
  }
}
