import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, memoriesTable, companionsTable } from "../db/src/index.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { logger } from "../lib/logger.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { UpdateMemorySchema } from "@aura/shared";

const router = Router();

// GET /api/companions/:companionId/memories — the companion's remembered facts (Memory screen),
// ordered by category then importance so the client can render category groups directly.
router.get("/companions/:companionId/memories", requireAuth, async (req: AuthRequest, res) => {
  try {
    const companionId = req.params.companionId as string;
    // Ownership guard (IDOR): the companion must belong to the caller.
    const [companion] = await db
      .select({ id: companionsTable.id })
      .from(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .limit(1);
    if (!companion) { sendError(res, "Companion not found", 404); return; }

    const memories = await db
      .select()
      .from(memoriesTable)
      .where(and(eq(memoriesTable.userId, req.userId!), eq(memoriesTable.companionId, companionId)))
      .orderBy(memoriesTable.category, desc(memoriesTable.importance));
    sendSuccess(res, memories);
  } catch (err) {
    logger.error({ err }, "Failed to fetch memories");
    sendError(res, "Failed to fetch memories", 500);
  }
});

// PATCH /api/memories/:id — edit a remembered fact (content and/or category).
router.patch("/memories/:id", requireAuth, validate(UpdateMemorySchema), async (req: AuthRequest, res) => {
  try {
    const memoryId = req.params.id as string;
    const updates: Record<string, unknown> = {};
    if (req.body.content !== undefined) updates.content = req.body.content;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (Object.keys(updates).length === 0) { sendError(res, "Nothing to update", 400); return; }
    updates.updatedAt = new Date();

    // Scope the UPDATE itself to the caller (IDOR): a memory the user doesn't own won't match.
    const [updated] = await db
      .update(memoriesTable)
      .set(updates)
      .where(and(eq(memoriesTable.id, memoryId), eq(memoriesTable.userId, req.userId!)))
      .returning();
    if (!updated) { sendError(res, "Memory not found", 404); return; }
    sendSuccess(res, updated);
  } catch (err) {
    logger.error({ err }, "Failed to update memory");
    sendError(res, "Failed to update memory", 500);
  }
});

// DELETE /api/memories/:id — forget a remembered fact. A companion whose remember cache points at
// this memory has its remember_memory_id nulled automatically (FK ON DELETE set null).
router.delete("/memories/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const memoryId = req.params.id as string;
    const deleted = await db
      .delete(memoriesTable)
      .where(and(eq(memoriesTable.id, memoryId), eq(memoriesTable.userId, req.userId!)))
      .returning({ id: memoriesTable.id });
    if (deleted.length === 0) { sendError(res, "Memory not found", 404); return; }
    sendSuccess(res, { id: memoryId, deleted: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete memory");
    sendError(res, "Failed to delete memory", 500);
  }
});

export default router;
