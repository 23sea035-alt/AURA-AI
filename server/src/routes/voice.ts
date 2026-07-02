import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { db, usersTable } from "../db/src/index.js";
import { checkVoiceDailyLimit, callMaxSeconds } from "../services/voice/metering.js";

const router = Router();

async function getIsPremium(userId: string): Promise<boolean> {
  const [user] = await db.select({ isPremium: usersTable.isPremium })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  return user?.isPremium ?? false;
}

// GET /api/voice/limits — daily voice usage remaining (tier-aware)
router.get("/voice/limits", requireAuth, async (req: AuthRequest, res) => {
  try {
    const isPremium = await getIsPremium(req.userId!);
    const result = await checkVoiceDailyLimit(req.userId!, isPremium);
    sendSuccess(res, { ...result, callMaxSeconds: callMaxSeconds(isPremium) });
  } catch (err) {
    logger.error({ err }, "Failed to check voice limits");
    sendError(res, "Failed to check voice limits", 500);
  }
});

const StartSchema = z.object({ companionId: z.string().uuid() });

// POST /api/voice/start — pre-flight gate before opening a voice call.
// Enforcement is server-authoritative in the WS voice path too; this lets the client
// gate the UI (and get a clean 429) before recording any audio.
router.post("/voice/start", requireAuth, async (req: AuthRequest, res) => {
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, "companionId (uuid) is required", 400);
  try {
    const isPremium = await getIsPremium(req.userId!);
    const daily = await checkVoiceDailyLimit(req.userId!, isPremium);
    if (!daily.allowed) {
      return sendError(res, "Daily voice limit reached", 429, "VOICE_LIMIT_REACHED");
    }
    sendSuccess(res, {
      allowed: true,
      remainingSeconds: daily.remainingSeconds,
      limitSeconds: daily.limitSeconds,
      callMaxSeconds: callMaxSeconds(isPremium),
    });
  } catch (err) {
    logger.error({ err }, "Failed to start voice session");
    sendError(res, "Failed to start voice session", 500);
  }
});

const StopSchema = z.object({ companionId: z.string().uuid() });

// POST /api/voice/stop — close a voice call; returns the day's usage summary.
// Usage is metered per STT/TTS segment during the call, so this is a lifecycle/summary hook.
router.post("/voice/stop", requireAuth, async (req: AuthRequest, res) => {
  const parsed = StopSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, "companionId (uuid) is required", 400);
  try {
    const isPremium = await getIsPremium(req.userId!);
    const daily = await checkVoiceDailyLimit(req.userId!, isPremium);
    sendSuccess(res, { usedSeconds: daily.usedSeconds, remainingSeconds: daily.remainingSeconds, limitSeconds: daily.limitSeconds });
  } catch (err) {
    logger.error({ err }, "Failed to stop voice session");
    sendError(res, "Failed to stop voice session", 500);
  }
});

export default router;
