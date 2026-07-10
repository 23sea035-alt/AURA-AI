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

  let captionIndex = 0;
  // Synthesis runs CONCURRENTLY through the shared Inworld budget (enqueueTts), but this
  // connection's SENDS are chained: audio frames go out in caption order, and voice_complete
  // trails the last frame — the ttsQueue's concurrency (> 1) makes queue position alone
  // meaningless for ordering (observed live: completion overtook its own turn's audio).
  let sendChain: Promise<void> = Promise.resolve();

  return {
    onToken(replyText: string, opts?: { crisis?: boolean }) {
      session.transitionTo("AI_SPEAKING");
      // Caption rides ahead of its audio frame, so clients with captions on can show the
      // sentence as it's spoken.
      sendJsonFrame(ws, { type: "voice_caption", companionId, index: captionIndex++, text: replyText });
      const idx = frameIndex++;
      const synthesis = enqueueTts(() => session.synthesizeReply(replyText, { crisis: opts?.crisis }), {
        isPremium,
      });
      sendChain = sendChain.then(async () => {
        try {
          const audio = await synthesis;
          sendBinaryFrame(ws, idx, audio);
          // Meter synthesized speech against the per-call + monthly voice budgets.
          const seconds = estimateSpeechSeconds(replyText);
          session.addCallSeconds(seconds);
          recordVoiceUsage(session.params.userId, companionId, seconds, "tts", TTS_MODEL_ID)
            .catch((err) => logger.error({ err }, "VoiceAdapter TTS usage record failed"));
        } catch (err) {
          logger.error({ err }, "VoiceAdapter TTS synthesis failed");
          const fallback = session.nextFillerClip();
          if (fallback) sendBinaryFrame(ws, idx, fallback);
        }
      });
    },

    onAbort(reason: AbortReason, detail?: string, opts?: { terminateSession?: boolean }) {
      session.transitionTo("IDLE");
      sendJsonFrame(ws, { type: "abort", code: reason, detail, companionId });
      // Zero-tolerance session drop (spec §4): end the call, not just the turn. Closing the socket
      // runs the handler's cleanup (voiceSession.close(), turn abort, connection unbind).
      if (opts?.terminateSession) ws.close(1008, "policy_violation");
    },

    onComplete(result: ChatSessionResult) {
      sendChain = sendChain.then(() => {
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
      });
    },
  };
}
