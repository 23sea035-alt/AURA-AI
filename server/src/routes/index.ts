import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import companionsRouter from "./companions.js";
import chatRouter from "./chat.js";
import paymentsRouter from "./payments.js";
import webhooksRouter from "./webhooks.js";
import notificationsRouter from "./notifications.js";
import complianceRouter from "./compliance.js";
import voiceRouter from "./voice.js";
import memoriesRouter from "./memories.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(companionsRouter);
router.use(chatRouter);
router.use(paymentsRouter);
router.use(webhooksRouter);
router.use(notificationsRouter);
router.use(complianceRouter);
router.use(voiceRouter);
router.use(memoriesRouter);

export default router;
