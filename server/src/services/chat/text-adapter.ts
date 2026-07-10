import type { WebSocket } from "ws";
import { sendJsonFrame } from "../../websocket/frame-utils.js";
import type { AbortReason, ChatSessionCallbacks, ChatSessionResult } from "./chat-session.js";

export function makeTextAdapter(ws: WebSocket, companionId: string): ChatSessionCallbacks {
  return {
    onToken(token: string) {
      sendJsonFrame(ws, { type: "token", token, companionId });
    },
    onAbort(reason: AbortReason, detail?: string, opts?: { terminateSession?: boolean }) {
      sendJsonFrame(ws, { type: "abort", code: reason, detail, companionId });
      // Zero-tolerance session drop (spec §4): deliver the abort, then close the socket with the
      // RFC 6455 policy-violation code. The handler's on-close cleanup tears the rest down.
      if (opts?.terminateSession) ws.close(1008, "policy_violation");
    },
    onComplete(result: ChatSessionResult) {
      sendJsonFrame(ws, {
        type: "complete",
        turnId: result.turnId,
        aiMessageId: result.aiMessage.id,
        userMessageId: result.userMessage.id,
        memoriesUsed: result.memoriesUsed,
        breakReminder: result.breakReminder ?? null,
        aiDisclosure: result.aiDisclosure ?? false,
        crisisResources: result.crisisResources ?? null,
        companionId,
      });
    },
  };
}
