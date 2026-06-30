import type { WebSocket } from "ws";
import type { AbortReason, ChatSessionCallbacks, ChatSessionResult } from "../chat/chat-session.js";
import { VoiceSession } from "./voice-session.js";
import { enqueueTts } from "../chat/turn-queue.js";
import { logger } from "../../lib/logger.js";
import { sendJsonFrame, sendBinaryFrame } from "../../websocket/frame-utils.js";

export function makeVoiceAdapter(
  ws: WebSocket,
  session: VoiceSession,
  companionId: string,
): ChatSessionCallbacks {
  let frameIndex = 0;

  return {
    onToken(replyText: string) {
      session.transitionTo("AI_SPEAKING");
      enqueueTts(() => session.synthesizeReply(replyText)).then((audio) => {
        sendBinaryFrame(ws, frameIndex++, audio);
      }).catch((err) => {
        logger.error({ err }, "VoiceAdapter TTS synthesis failed");
        const fallback = session.nextFillerClip();
        if (fallback) sendBinaryFrame(ws, frameIndex++, fallback);
      });
    },

    onAbort(reason: AbortReason, detail?: string) {
      session.transitionTo("IDLE");
      sendJsonFrame(ws, { type: "abort", code: reason, detail, companionId });
    },

    onComplete(result: ChatSessionResult) {
      session.transitionTo("IDLE");
      sendJsonFrame(ws, {
        type: "voice_complete",
        turnId: result.turnId,
        companionId,
        memoriesUsed: result.memoriesUsed,
        breakReminder: result.breakReminder ?? null,
      });
    },
  };
}
