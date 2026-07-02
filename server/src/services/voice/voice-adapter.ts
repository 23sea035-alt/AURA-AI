import type { WebSocket } from "ws";
import type { AbortReason, ChatSessionCallbacks, ChatSessionResult } from "../chat/chat-session.js";
import { VoiceSession } from "./voice-session.js";
import { enqueueTts } from "../chat/turn-queue.js";
import { logger } from "../../lib/logger.js";
import { sendJsonFrame, sendBinaryFrame } from "../../websocket/frame-utils.js";
import { recordVoiceUsage, estimateSpeechSeconds } from "./metering.js";
import { TTS_MODEL_ID } from "./inworld-tts.js";

/**
 * Voice I/O adapter: maps a `ChatSession`'s callbacks to the binary WebSocket voice path.
 *
 * `onToken` fires once per output-moderated sentence (see ChatSession's sentence-gated
 * streaming), so each safe sentence is synthesized and streamed as its own audio frame —
 * good TTS intonation, and unsafe text is never synthesized. TTS output is metered.
 */
export function makeVoiceAdapter(
  ws: WebSocket,
  session: VoiceSession,
  companionId: string,
  isPremium = false,
): ChatSessionCallbacks {
  let frameIndex = 0;

  return {
    onToken(replyText: string, opts?: { crisis?: boolean }) {
      session.transitionTo("AI_SPEAKING");
      enqueueTts(() => session.synthesizeReply(replyText, { crisis: opts?.crisis }), { isPremium })
        .then((audio) => {
          sendBinaryFrame(ws, frameIndex++, audio);
          // Meter synthesized speech against the per-call + monthly voice budgets.
          const seconds = estimateSpeechSeconds(replyText);
          session.addCallSeconds(seconds);
          recordVoiceUsage(session.params.userId, companionId, seconds, "tts", TTS_MODEL_ID)
            .catch((err) => logger.error({ err }, "VoiceAdapter TTS usage record failed"));
        })
        .catch((err) => {
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
        aiDisclosure: result.aiDisclosure ?? false,
        crisisResources: result.crisisResources ?? null,
      });
    },
  };
}
