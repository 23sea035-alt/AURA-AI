import { Router } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, deviceTokensTable } from "../db/src/index.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { getEnv } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { sendSuccess, sendError } from "../lib/response.js";

const router = Router();

const RegisterTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android"]).default("ios"),
});

router.post("/notifications/register", requireAuth, validate(RegisterTokenSchema), async (req: AuthRequest, res) => {
  try {
    const { token, platform } = req.body as z.infer<typeof RegisterTokenSchema>;

    await db.insert(deviceTokensTable).values({
      userId: req.userId!,
      token,
      platform,
      environment: getEnv().APNS_ENVIRONMENT,
    }).onConflictDoNothing();

    logger.info({ userId: req.userId!, platform }, "Device token registered");
    sendSuccess(res, { registered: true }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to register device token");
    sendError(res, "Failed to register device token", 500);
  }
});

router.delete("/notifications/register", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body as { token?: string };
    if (!token) {
      sendError(res, "token is required", 400);
      return;
    }

    await db.delete(deviceTokensTable)
      .where(and(eq(deviceTokensTable.token, token), eq(deviceTokensTable.userId, req.userId!)));

    logger.info({ userId: req.userId! }, "Device token removed");
    sendSuccess(res, { removed: true });
  } catch (err) {
    logger.error({ err }, "Failed to remove device token");
    sendError(res, "Failed to remove device token", 500);
  }
});

export default router;
