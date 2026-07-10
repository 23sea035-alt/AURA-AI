import type { IncomingMessage, Server } from "http";
import type { Socket } from "net";
import { WebSocketServer, WebSocket } from "ws";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { incrementMetric } from "../lib/metrics.js";
import { connectionManager } from "./connection-manager.js";
import { verifyWebSocketAuth, extractBearer } from "../middleware/auth.js";
import { wsChatLimiter, wsVoiceLimiter } from "../middleware/rate-limit.js";
import { ChatSession } from "../services/chat/chat-session.js";
import { makeTextAdapter } from "../services/chat/text-adapter.js";
import { makeVoiceAdapter } from "../services/voice/voice-adapter.js";
import { VoiceSession } from "../services/voice/voice-session.js";
import { transcribeAudio } from "../services/voice/stt.js";
import { checkVoiceMonthlyLimit, recordVoiceUsage, estimateSpeechSeconds, callMaxSeconds } from "../services/voice/metering.js";
import { enqueueTurn } from "../services/chat/turn-queue.js";
import { db, usersTable, companionsTable } from "../db/src/index.js";
import { STT_MODEL, MAX_UTTERANCE_BYTES } from "@aura/shared";
import type { PersonaKey } from "@aura/shared";

interface TurnFrame {
  type: "turn";
  companionId: string;
  content: string;
  turnId?: string;
  sessionStartedAt?: string;
}
interface RefreshAuthFrame { type: "refresh_auth"; token: string; }
interface VoiceStartFrame { type: "voice_start"; companionId: string; sessionStartedAt?: string; }
interface VoiceInterruptFrame { type: "voice_interrupt"; transcript?: string; }
interface VoiceStopFrame { type: "voice_stop"; }

type IncomingFrame =
  | TurnFrame | RefreshAuthFrame
  | VoiceStartFrame | VoiceInterruptFrame | VoiceStopFrame
  | { type: string; [k: string]: unknown };

const wss = new WebSocketServer({ noServer: true });
const PING_INTERVAL_MS = 30_000;
// Validate client-supplied ids before they hit a `uuid` DB column (the REST path does this via
// zod). A non-uuid would otherwise throw "invalid input syntax for type uuid" mid-query.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function registerWebSocketHandler(server: Server): void {
  server.on("upgrade", async (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const token = url.searchParams.get("token") ?? extractBearer(req.headers.authorization);

    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    const auth = await verifyWebSocketAuth(token);
    if (!auth) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, auth);
    });
  });

  wss.on("connection", (ws: WebSocket, _req: IncomingMessage, auth: { userId: string; clerkUserId: string }) => {
    const { userId } = auth;
    let currentCompanionId: string | undefined;
    let pingTimer: ReturnType<typeof setInterval> | undefined;

    // ── Voice-call state (at most one active voice call per connection) ──
    let voiceSession: VoiceSession | undefined;
    let voiceIsPremium = false;
    let voiceIsMinor = false;
    let voiceSessionStartedAt: string | undefined;
    let activeVoiceTurn: ChatSession | undefined;

    function cleanup(): void {
      if (pingTimer) clearInterval(pingTimer);
      if (activeVoiceTurn) activeVoiceTurn.abort();
      if (voiceSession) { voiceSession.close(); voiceSession = undefined; }
      if (currentCompanionId) connectionManager.remove(userId, currentCompanionId);
      incrementMetric("ws.disconnect");
      logger.info({ userId, companionId: currentCompanionId }, "WS disconnected");
    }

    function bindCompanion(companionId: string): void {
      if (currentCompanionId !== companionId) {
        if (currentCompanionId) connectionManager.remove(userId, currentCompanionId);
        currentCompanionId = companionId;
        connectionManager.add(userId, companionId, ws);
      }
    }

    function send(payload: Record<string, unknown>): void {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
    }

    async function loadUserTier(): Promise<{ isPremium: boolean; isMinor: boolean } | undefined> {
      const [user] = await db.select({ isPremium: usersTable.isPremium, isMinor: usersTable.isMinor })
        .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
      return user ? { isPremium: user.isPremium ?? false, isMinor: user.isMinor ?? false } : undefined;
    }

    // ── Voice: open a call context (persona + tier + filler pre-gen) ──
    async function handleVoiceStart(companionId: string, sessionStartedAt?: string): Promise<void> {
      if (!wsVoiceLimiter(userId)) {
        send({ type: "abort", code: "rate_limited", companionId });
        incrementMetric("rate_limit.ws_voice");
        return;
      }
      const tier = await loadUserTier();
      if (!tier) { send({ type: "error", code: "USER_NOT_FOUND" }); return; }

      const [companion] = await db.select({ personaKey: companionsTable.personaKey })
        .from(companionsTable)
        .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, userId)))
        .limit(1);
      if (!companion) { send({ type: "error", code: "COMPANION_NOT_FOUND" }); return; }

      voiceIsPremium = tier.isPremium;
      voiceIsMinor = tier.isMinor;

      const usage = await checkVoiceMonthlyLimit(userId, voiceIsPremium);
      if (!usage.allowed) { send({ type: "abort", code: "voice_limit_reached", companionId }); return; }

      // Idempotent re-start: abort any in-flight turn and close the prior session so its
      // filler buffers are freed and per-call state is re-initialized cleanly.
      if (activeVoiceTurn) { activeVoiceTurn.abort(); activeVoiceTurn = undefined; }
      if (voiceSession) voiceSession.close();

      bindCompanion(companionId);
      voiceSessionStartedAt = sessionStartedAt;
      voiceSession = new VoiceSession({
        userId, companionId, personaKey: companion.personaKey as PersonaKey,
      });
      await voiceSession.open(); // pre-gen filler clips; degrades gracefully if no INWORLD_VOICE_ID_*
      send({ type: "voice_ready", companionId, remainingSeconds: usage.remainingSeconds });
    }

    // ── Voice: an inbound binary frame = one complete user utterance ──
    async function handleVoiceAudio(audio: Buffer): Promise<void> {
      const session = voiceSession;
      if (!session) { send({ type: "error", code: "VOICE_NOT_STARTED" }); return; }
      const companionId = session.params.companionId;

      // One utterance at a time: reject a new one while a reply is still generating/speaking.
      // (Barge-in is an explicit `voice_interrupt`, not an overlapping audio frame.)
      if (activeVoiceTurn) { send({ type: "voice_busy", companionId }); return; }

      // Bound the input up front so a giant blob can't drive unbounded STT/LLM/TTS before billing.
      if (audio.length > MAX_UTTERANCE_BYTES) {
        send({ type: "abort", code: "utterance_too_large", companionId });
        return;
      }

      // Enforce limits BEFORE any paid STT/LLM/TTS work (server-authoritative).
      const usage = await checkVoiceMonthlyLimit(userId, voiceIsPremium);
      if (!usage.allowed || session.callSeconds >= callMaxSeconds(voiceIsPremium)) {
        send({ type: "abort", code: "voice_limit_reached", companionId });
        return;
      }

      let transcript: string;
      try {
        transcript = await transcribeAudio(audio);
      } catch (err) {
        logger.error({ err, userId }, "Voice STT failed");
        send({ type: "abort", code: "internal_error", detail: "STT failed", companionId });
        return;
      }

      // Meter the input utterance from the transcript (server-authoritative — the client cannot
      // under-declare a duration). Awaited so the next utterance's monthly gate reflects it.
      const sttSeconds = estimateSpeechSeconds(transcript);
      if (sttSeconds > 0) {
        session.addCallSeconds(sttSeconds);
        try {
          await recordVoiceUsage(userId, companionId, sttSeconds, "stt", STT_MODEL);
        } catch (err) {
          logger.error({ err }, "STT usage record failed");
        }
      }

      if (!transcript) { send({ type: "voice_ready", companionId }); return; } // silence / no speech

      session.transitionTo("PROCESSING");
      const chat = new ChatSession({
        userId, companionId, content: transcript,
        isPremium: voiceIsPremium, isMinor: voiceIsMinor,
        sessionStartedAt: voiceSessionStartedAt,
      });
      activeVoiceTurn = chat;
      try {
        // Same shared engine as text: L0–L3 moderation + sentence-gated generation; the voice
        // adapter turns each approved sentence into TTS audio frames (and meters TTS output).
        await enqueueTurn(() => chat.run(makeVoiceAdapter(ws, session, companionId, voiceIsPremium)), { isPremium: voiceIsPremium });
      } catch (err) {
        logger.error({ err, userId }, "Voice turn error");
        send({ type: "abort", code: "internal_error", companionId });
      } finally {
        activeVoiceTurn = undefined;
      }
    }

    // ── Voice: barge-in — abort the in-flight reply, classify the interjection ──
    function handleVoiceInterrupt(transcript?: string): void {
      if (activeVoiceTurn) activeVoiceTurn.abort();
      if (!voiceSession) return;
      const cls = voiceSession.onInterrupt(transcript ?? "");
      send({ type: "voice_interrupted", class: cls, companionId: voiceSession.params.companionId });
    }

    function handleVoiceStop(): void {
      if (activeVoiceTurn) activeVoiceTurn.abort();
      const companionId = voiceSession?.params.companionId;
      if (voiceSession) { voiceSession.close(); voiceSession = undefined; }
      send({ type: "voice_stopped", companionId });
    }

    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, PING_INTERVAL_MS);

    ws.on("pong", () => { /* keep-alive confirmed */ });
    ws.on("close", cleanup);
    ws.on("error", (err) => {
      logger.warn({ err, userId }, "WS error");
      cleanup();
    });

    ws.on("message", async (data: WebSocket.RawData, isBinary: boolean) => {
      // Binary frames are audio (voice utterances); everything else is a JSON control frame.
      if (isBinary) {
        const audio = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        await handleVoiceAudio(audio);
        return;
      }

      let frame: IncomingFrame;
      try {
        frame = JSON.parse(data.toString()) as IncomingFrame;
      } catch {
        send({ type: "error", code: "INVALID_JSON" });
        return;
      }

      if (frame.type === "refresh_auth") {
        const refreshed = await verifyWebSocketAuth((frame as RefreshAuthFrame).token);
        send({ type: refreshed ? "auth_ok" : "auth_expired" });
        return;
      }

      if (frame.type === "voice_start") {
        const f = frame as VoiceStartFrame;
        if (!f.companionId || !UUID_RE.test(f.companionId)) { send({ type: "error", code: "INVALID_FRAME", detail: "companionId (uuid) required" }); return; }
        await handleVoiceStart(f.companionId, f.sessionStartedAt);
        return;
      }

      if (frame.type === "voice_interrupt") {
        handleVoiceInterrupt((frame as VoiceInterruptFrame).transcript);
        return;
      }

      if (frame.type === "voice_stop") {
        handleVoiceStop();
        return;
      }

      if (frame.type === "turn") {
        const f = frame as TurnFrame;
        if (!f.companionId || !f.content?.trim()) {
          send({ type: "error", code: "INVALID_FRAME", detail: "companionId and content required" });
          return;
        }
        if (!UUID_RE.test(f.companionId) || (f.turnId !== undefined && !UUID_RE.test(f.turnId))) {
          send({ type: "error", code: "INVALID_FRAME", detail: "companionId and turnId must be uuids" });
          return;
        }

        bindCompanion(f.companionId);

        if (!wsChatLimiter(userId)) {
          send({ type: "abort", code: "rate_limited", companionId: f.companionId });
          incrementMetric("rate_limit.ws_chat");
          return;
        }

        const tier = await loadUserTier();
        if (!tier) {
          send({ type: "error", code: "USER_NOT_FOUND" });
          return;
        }

        const session = new ChatSession({
          userId,
          companionId: f.companionId,
          content: f.content,
          isPremium: tier.isPremium,
          isMinor: tier.isMinor,
          sessionStartedAt: f.sessionStartedAt,
          providedTurnId: f.turnId,
        });

        enqueueTurn(
          () => session.run(makeTextAdapter(ws, f.companionId)),
          { isPremium: tier.isPremium },
        ).catch((err) => {
          logger.error({ err, userId }, "Turn enqueue error");
          send({ type: "abort", code: "internal_error", companionId: f.companionId });
        });
        return;
      }

      send({ type: "error", code: "UNKNOWN_FRAME_TYPE", frameType: frame.type });
    });

    incrementMetric("ws.connect");
    logger.info({ userId }, "WS connected");
  });
}
