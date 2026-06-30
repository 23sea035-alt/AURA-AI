import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { checkVoiceDailyLimit } from "../services/voice/metering.js";

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

export default router;
