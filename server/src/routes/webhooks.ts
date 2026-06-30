import { Router } from "express";
import clerkWebhooks from "../webhooks/clerk.js";
import { webhookLimiter } from "../middleware/rate-limit.js";

const router = Router();

router.use("/webhooks", webhookLimiter, clerkWebhooks);

export default router;
