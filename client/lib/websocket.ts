// Live WebSocket transport for streaming chat turns — built against the server's REAL
// contract (server/src/websocket/handler.ts + services/chat/text-adapter.ts):
//
//   inbound  → {type:'turn', companionId, content, turnId?, sessionStartedAt?}
//              {type:'refresh_auth', token}
//   outbound ← {type:'token', token}      one frame per output-moderated SENTENCE
//              {type:'complete', turnId, aiMessageId, userMessageId, breakReminder,
//               aiDisclosure, crisisResources, companionId}
//              {type:'abort', code, detail?}   input_blocked | rate_limited |
//                                              free_limit_reached | internal_error | …
//              {type:'error', code}            malformed frames only
//              {type:'auth_ok' | 'auth_expired'}
//
// Auth rides ?token= (RN WebSocket can't set headers). Clerk JWTs live ~60s: we send
// refresh_auth every ~55s and cycle the socket on auth_expired (server auth is fixed at
// upgrade — the refresh loop tells the CLIENT when to reconnect, chat spec §2.1). One
// open socket = presence for ONE companion: while the chat is open the server delivers
// over WS instead of firing the away-reply push (reply-push.ts). A turn interrupted by
// a drop is recovered by re-sending the SAME turnId (server-side idempotent replay).
import { getSessionToken } from '@/lib/clerk';
import { wsBaseUrl } from '@/lib/env';

export type WsAbortCode =
  | 'input_blocked'
  | 'input_crisis'
  | 'output_blocked'
  | 'rate_limited'
  | 'free_limit_reached'
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

  close(): void {
    this.closedByUser = true;
    this.stopTimers();
    this.activeTurn = null;
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
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.startRefreshLoop();
    };
    ws.onmessage = (event) => this.handleFrame(String(event.data));
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
      case 'abort': {
        const turn = this.activeTurn;
        this.activeTurn = null;
        turn?.onAbort(frame.code as WsAbortCode, frame.detail as string | undefined);
        break;
      }
      case 'error': {
        // Malformed-frame class — terminal for the in-flight turn; the socket stays up.
        const turn = this.activeTurn;
        this.activeTurn = null;
        turn?.onAbort('internal_error', String(frame.code ?? 'error'));
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
