import { Router } from "express";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db, companionsTable, usersTable } from "../db/src/index.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { logger } from "../lib/logger.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { CreateCompanionSchema, UpdateCompanionSchema } from "@aura/shared";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// POST /api/companions/:id/archive — reversible soft-remove. Guards against archiving the user's
// last active companion, and unpins it from Home if it was the primary companion.
router.post("/companions/:id/archive", requireAuth, async (req: AuthRequest, res) => {
  try {
    const companionId = req.params.id as string;
    if (!UUID_RE.test(companionId)) { sendError(res, "Invalid companion id", 400); return; }

    const [companion] = await db
      .select()
      .from(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .limit(1);
    if (!companion) { sendError(res, "Companion not found", 404); return; }
    if (companion.archivedAt) { sendSuccess(res, companion); return; } // idempotent

    // Server-authoritative guard: never leave the user with zero active companions.
    const [{ active }] = await db
      .select({ active: sql<number>`count(*)::int` })
      .from(companionsTable)
      .where(and(eq(companionsTable.userId, req.userId!), isNull(companionsTable.archivedAt)));
    if (Number(active) <= 1) {
      sendError(res, "You need at least one active companion — restore or create another first.", 409, "LAST_ACTIVE_COMPANION");
      return;
    }

    const [updated] = await db
      .update(companionsTable)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .returning();

    // An archived companion can't remain the pinned Home companion.
    await db
      .update(usersTable)
      .set({ primaryCompanionId: null })
      .where(and(eq(usersTable.id, req.userId!), eq(usersTable.primaryCompanionId, companionId)));

    logger.info({ companionId }, "Companion archived");
    sendSuccess(res, updated);
  } catch (err) {
    logger.error({ err }, "Failed to archive companion");
    sendError(res, "Failed to archive companion", 500);
  }
});

// POST /api/companions/:id/restore — bring an archived companion back to Active.
router.post("/companions/:id/restore", requireAuth, async (req: AuthRequest, res) => {
  try {
    const companionId = req.params.id as string;
    if (!UUID_RE.test(companionId)) { sendError(res, "Invalid companion id", 400); return; }

    const [updated] = await db
      .update(companionsTable)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .returning();
    if (!updated) { sendError(res, "Companion not found", 404); return; }

    logger.info({ companionId }, "Companion restored");
    sendSuccess(res, updated);
  } catch (err) {
    logger.error({ err }, "Failed to restore companion");
    sendError(res, "Failed to restore companion", 500);
  }
});

// DELETE /api/companions/:id — permanent, irreversible delete. Cascades to messages, memories,
// memory_jobs, and voice_usage; safety_events + users.primaryCompanionId are set null by their FKs.
// The three base personas (isDefault) can be archived but never permanently deleted.
router.delete("/companions/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const companionId = req.params.id as string;
    if (!UUID_RE.test(companionId)) { sendError(res, "Invalid companion id", 400); return; }

    const [companion] = await db
      .select()
      .from(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .limit(1);
    if (!companion) { sendError(res, "Companion not found", 404); return; }
    if (companion.isDefault) {
      sendError(res, "Base companions can't be deleted. You can archive it instead.", 403, "CANNOT_DELETE_BASE");
      return;
    }

    await db
      .delete(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)));

    logger.info({ companionId }, "Companion permanently deleted");
    sendSuccess(res, { deleted: true, id: companionId });
  } catch (err) {
    logger.error({ err }, "Failed to delete companion");
    sendError(res, "Failed to delete companion", 500);
  }
});

export default router;
