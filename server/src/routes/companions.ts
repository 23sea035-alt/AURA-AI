import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, companionsTable } from "../db/src/index.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { logger } from "../lib/logger.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { CreateCompanionSchema, UpdateCompanionSchema } from "@aura/shared";

const router = Router();

// GET /api/companions
router.get("/companions", requireAuth, async (req: AuthRequest, res) => {
  try {
    const companions = await db
      .select()
      .from(companionsTable)
      .where(eq(companionsTable.userId, req.userId!))
      .orderBy(companionsTable.createdAt);
    sendSuccess(res, companions);
  } catch (err) {
    logger.error({ err }, "Failed to fetch companions");
    sendError(res, "Failed to fetch companions", 500);
  }
});

// POST /api/companions
router.post("/companions", requireAuth, validate(CreateCompanionSchema), async (req: AuthRequest, res) => {
  try {
    const { name, personaKey, traits } = req.body;

    const [companion] = await db.insert(companionsTable).values({
      userId: req.userId!,
      name,
      personaKey: personaKey ?? "aurora",
      traits: traits ?? {},
    }).returning();

    logger.info({ companionId: companion.id }, "Companion created");
    sendSuccess(res, companion, 201);
  } catch (err) {
    logger.error({ err }, "Failed to create companion");
    sendError(res, "Failed to create companion", 500);
  }
});

// PATCH /api/companions/:id
router.patch("/companions/:id", requireAuth, validate(UpdateCompanionSchema), async (req: AuthRequest, res) => {
  try {
    const companionId = req.params.id as string;
    const [companion] = await db
      .select()
      .from(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .limit(1);

    if (!companion) { sendError(res, "Companion not found", 404); return; }

    const updates: Record<string, unknown> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.traits !== undefined) updates.traits = req.body.traits;

    const [updated] = await db
      .update(companionsTable)
      .set(updates)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .returning();

    sendSuccess(res, updated);
  } catch (err) {
    logger.error({ err }, "Failed to update companion");
    sendError(res, "Failed to update companion", 500);
  }
});

export default router;
