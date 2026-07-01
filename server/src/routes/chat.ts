import { Router } from "express";
import type { AuthRequest } from "../middleware/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { chatPerMinuteLimiter, chatDailyHardCap } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { ChatInputSchema } from "@aura/shared";
import { chat, getUsage, getMessages } from "../controllers/chat.controller.js";

const router = Router();

router.get("/chat/usage", requireAuth, getUsage);
router.get("/companions/:companionId/messages", requireAuth, getMessages);
router.post("/companions/:companionId/chat", requireAuth, chatPerMinuteLimiter, chatDailyHardCap, validate(ChatInputSchema), chat);

export default router;
