import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { voiceTokenLimiter, voiceTtsLimiter } from "../middleware/rate-limit.js";
import { logger } from "../lib/logger.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { generateVoiceToken } from "../services/voice/livekit.js";
import { generateSpeechForTurn } from "../services/voice/tts.js";
import { checkVoiceDailyLimit, checkCallDurationLimit, recordVoiceUsage } from "../services/voice/metering.js";

const router = Router();

// GET /api/voice/limits — daily voice usage remaining
router.get("/voice/limits", requireAuth, async (req: AuthRequest, res) => {
  try {
    const result = await checkVoiceDailyLimit(req.userId!);
    sendSuccess(res, result);
  } catch (err) {
    logger.error({ err }, "Failed to check voice limits");
    sendError(res, "Failed to check voice limits", 500);
  }
});

// POST /api/voice/token — get LiveKit token to join a voice room
router.post("/voice/token", requireAuth, voiceTokenLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { roomName, companionId } = req.body as { roomName?: string; companionId?: string };

    if (!companionId) {
      sendError(res, "companionId is required", 400);
      return;
    }

    const result = await checkCallDurationLimit(userId, 60);
    if (!result.allowed) {
      sendError(res, result.reason ?? "Voice limit reached", 429);
      return;
    }

    const token = await generateVoiceToken(userId, roomName, companionId);
    sendSuccess(res, { ...token, companionId });
  } catch (err) {
    logger.error({ err }, "Failed to generate voice token");
    sendError(res, "Failed to generate voice token", 500);
  }
});

// POST /api/voice/start — start the agent session for a room (server-side)
router.post("/voice/start", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { roomName, companionId } = req.body as { roomName: string; companionId: string };

    if (!roomName || !companionId) {
      sendError(res, "roomName and companionId are required", 400);
      return;
    }

    const { startVoiceSession } = await import("../services/voice/agent-service.js");
    await startVoiceSession(userId, companionId, roomName);
    sendSuccess(res, { roomName, status: "started" });
  } catch (err) {
    logger.error({ err }, "Failed to start voice session");
    sendError(res, "Failed to start voice session", 500);
  }
});

// POST /api/voice/stop — stop the agent session for a room
router.post("/voice/stop", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { roomName } = req.body as { roomName: string };
    if (!roomName) {
      sendError(res, "roomName is required", 400);
      return;
    }

    const { stopVoiceSession } = await import("../services/voice/agent-service.js");
    await stopVoiceSession(roomName);
    sendSuccess(res, { roomName, status: "stopped" });
  } catch (err) {
    logger.error({ err }, "Failed to stop voice session");
    sendError(res, "Failed to stop voice session", 500);
  }
});

// POST /api/voice/tts — text-to-speech (non-streaming fallback)
router.post("/voice/tts", requireAuth, voiceTtsLimiter, async (req: AuthRequest, res) => {
  try {
    const { text, companionId } = req.body as { text: string; companionId?: string };
    if (!text?.trim()) {
      sendError(res, "Text is required", 400);
      return;
    }

    const result = await checkCallDurationLimit(req.userId!, 30);
    if (!result.allowed) {
      sendError(res, result.reason ?? "Voice limit reached", 429);
      return;
    }

    const audio = await generateSpeechForTurn(text.trim());
    await recordVoiceUsage(req.userId!, companionId ?? "unknown", Math.ceil(audio.length / 48000), "tts", "sonic-3.5");

    res.set("Content-Type", "audio/wav");
    res.set("Content-Length", audio.length.toString());
    res.status(200).send(audio);
  } catch (err) {
    logger.error({ err }, "TTS generation failed");
    sendError(res, "TTS generation failed", 500);
  }
});

export default router;
