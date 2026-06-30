import type { IncomingMessage, Server } from "http";
import type { Socket } from "net";
import { WebSocketServer, WebSocket } from "ws";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { incrementMetric } from "../lib/metrics.js";
import { connectionManager } from "./connection-manager.js";
import { verifyWebSocketAuth, extractBearer } from "../middleware/auth.js";
import { wsChatLimiter } from "../middleware/rate-limit.js";
import { ChatSession } from "../services/chat/chat-session.js";
import { makeTextAdapter } from "../services/chat/text-adapter.js";
import { enqueueTurn } from "../services/chat/turn-queue.js";
import { db, usersTable } from "../db/src/index.js";

interface TurnFrame {
  type: "turn";
  companionId: string;
  content: string;
  turnId?: string;
  sessionStartedAt?: string;
}

interface RefreshAuthFrame {
  type: "refresh_auth";
  token: string;
}

type IncomingFrame = TurnFrame | RefreshAuthFrame | { type: string; [k: string]: unknown };

const wss = new WebSocketServer({ noServer: true });
const PING_INTERVAL_MS = 30_000;

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

    function cleanup(): void {
      if (pingTimer) clearInterval(pingTimer);
      if (currentCompanionId) connectionManager.remove(userId, currentCompanionId);
      incrementMetric("ws.disconnect");
      logger.info({ userId, companionId: currentCompanionId }, "WS disconnected");
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

    ws.on("message", async (data: Buffer | string) => {
      if (Buffer.isBuffer(data)) return; // binary frames (audio) handled by voice path

      let frame: IncomingFrame;
      try {
        frame = JSON.parse(data) as IncomingFrame;
      } catch {
        ws.send(JSON.stringify({ type: "error", code: "INVALID_JSON" }));
        return;
      }

      if (frame.type === "refresh_auth") {
        const refreshed = await verifyWebSocketAuth((frame as RefreshAuthFrame).token);
        ws.send(JSON.stringify({ type: refreshed ? "auth_ok" : "auth_expired" }));
        return;
      }

      if (frame.type === "turn") {
        const f = frame as TurnFrame;
        if (!f.companionId || !f.content?.trim()) {
          ws.send(JSON.stringify({ type: "error", code: "INVALID_FRAME", detail: "companionId and content required" }));
          return;
        }

        if (currentCompanionId !== f.companionId) {
          if (currentCompanionId) connectionManager.remove(userId, currentCompanionId);
          currentCompanionId = f.companionId;
          connectionManager.add(userId, currentCompanionId, ws);
        }

        if (!wsChatLimiter(userId)) {
          ws.send(JSON.stringify({ type: "abort", code: "rate_limited", companionId: f.companionId }));
          incrementMetric("rate_limit.ws_chat");
          return;
        }

        const [user] = await db.select({ isPremium: usersTable.isPremium, isMinor: usersTable.isMinor })
          .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
        if (!user) {
          ws.send(JSON.stringify({ type: "error", code: "USER_NOT_FOUND" }));
          return;
        }

        const session = new ChatSession({
          userId,
          companionId: f.companionId,
          content: f.content,
          isPremium: user.isPremium ?? false,
          isMinor: user.isMinor ?? false,
          sessionStartedAt: f.sessionStartedAt,
          providedTurnId: f.turnId,
        });

        enqueueTurn(
          () => session.run(makeTextAdapter(ws, f.companionId)),
          { isPremium: user.isPremium ?? false },
        ).catch((err) => {
          logger.error({ err, userId }, "Turn enqueue error");
          ws.send(JSON.stringify({ type: "abort", code: "internal_error", companionId: f.companionId }));
        });
        return;
      }

      ws.send(JSON.stringify({ type: "error", code: "UNKNOWN_FRAME_TYPE", frameType: frame.type }));
    });

    incrementMetric("ws.connect");
    logger.info({ userId }, "WS connected");
  });
}

