import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "../db/src/index.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { handleRevenueCatWebhook } from "../services/payments/revenuecat.js";
import { reconcilePremiumStaleness } from "../services/retention.js";
import { webhookLimiter } from "../middleware/rate-limit.js";

const router = Router();

// POST /api/payments/webhook — RevenueCat webhook. RC authenticates by echoing the
// dashboard-configured Authorization header on every event (no body signature).
router.post("/payments/webhook", webhookLimiter, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Missing Authorization header" });
      return;
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      res.status(400).json({ error: "Missing raw body" });
      return;
    }
    const result = await handleRevenueCatWebhook(rawBody, authHeader);
    res.json(result);
  } catch (err: any) {
    logger.error({ err }, "RevenueCat webhook error");
    res.status(400).json({ error: err?.message ?? "Webhook error" });
  }
});

// GET /api/payments/entitlements — App-foreground premium staleness refresh
router.get("/payments/entitlements", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    // Reconcile any stale subscriptions before returning
    await reconcilePremiumStaleness();

    const [user] = await db
      .select({ isPremium: usersTable.isPremium })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) { sendError(res, "User not found", 404); return; }

    sendSuccess(res, { isPremium: user.isPremium });
  } catch (err) {
    logger.error({ err }, "Failed to fetch entitlements");
    sendError(res, "Failed to fetch entitlements", 500);
  }
});

export default router;
