import { randomUUID } from "crypto";
import { Router } from "express";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db, companionsTable, usersTable, messagesTable, memoriesTable } from "../db/src/index.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { logger } from "../lib/logger.js";
import { sendSuccess, sendError } from "../lib/response.js";
import {
  CLIENT_TRAITS_KEY,
  CreateCompanionSchema, UpdateCompanionSchema, getPersonaPack, pickOpener,
  activeCompanionCap, totalCompanionCap,
  type PersonaVoicePack, type PersonaTraits,
} from "@aura/shared";

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type IncomingTraits = PersonaTraits & { [K in typeof CLIENT_TRAITS_KEY]?: Record<string, unknown> };

// Free-tier partial gate (docs/specs/companion-roster.md §9) — never trust the dimmed client. A free
// caller's trait grid always snaps back to the preset default, and `lookId` (the paid avatar-look
// surface) is stripped from the CLIENT_TRAITS_KEY presentation stash. The rest of the stash (persona
// line, duotone colors) is presentation, not the paid surface, so it round-trips untouched. Premium
// callers keep whatever validated traits they sent, or the preset default when they omitted traits.
function coerceTraitsForTier(pack: PersonaVoicePack, traits: IncomingTraits | undefined, isPremium: boolean): unknown {
  if (isPremium) return traits ?? { ...pack.defaultTraits };
  const stash = traits?.[CLIENT_TRAITS_KEY];
  if (!stash) return { ...pack.defaultTraits };
  const { lookId: _lookId, ...rest } = stash;
  return { ...pack.defaultTraits, [CLIENT_TRAITS_KEY]: rest };
}

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

// POST /api/companions — creates a companion, enforcing the active/total caps and the free-tier
// partial gate. The user's very first companion (total === 0, the onboarding 1-of-12 pick) also gets
// a server-written seeded opener message and is pinned to Home (§10).
router.post("/companions", requireAuth, validate(CreateCompanionSchema), async (req: AuthRequest, res) => {
  try {
    const { name, personaKey, traits } = req.body;
    const key = personaKey ?? "aurora";
    const pack = getPersonaPack(key);

    const [user] = await db
      .select({ isPremium: usersTable.isPremium, firstName: usersTable.firstName, primaryCompanionId: usersTable.primaryCompanionId })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);
    if (!user) { sendError(res, "User not found", 404); return; }

    const [{ total, active }] = await db
      .select({
        total: sql<number>`count(*)::int`,
        active: sql<number>`count(*) filter (where ${companionsTable.archivedAt} is null)::int`,
      })
      .from(companionsTable)
      .where(eq(companionsTable.userId, req.userId!));

    // Total-full is checked FIRST — archiving can't help this case (total = active + archived).
    if (Number(total) >= totalCompanionCap(user.isPremium)) {
      sendError(res, "You've reached your total companion limit. Delete some archived companions to make room.", 409, "TOTAL_LIMIT_REACHED");
      return;
    }
    if (Number(active) >= activeCompanionCap(user.isPremium)) {
      sendError(res, "You're at your active companion limit. Archive one to make room.", 409, "ACTIVE_LIMIT_REACHED");
      return;
    }

    const finalTraits = coerceTraitsForTier(pack, traits, user.isPremium);
    const isFirstCompanion = Number(total) === 0;

    const [companion] = await db.insert(companionsTable).values({
      userId: req.userId!,
      name,
      personaKey: key,
      traits: finalTraits,
    }).returning();

    let result = companion;

    if (isFirstCompanion) {
      // Seeded opener (spec §10): a real assistant message, written server-side (not LLM-invoked) so
      // it persists + syncs. Role 'assistant', so it does NOT count against the 30/day free cap
      // (checkFreeTierLimit only counts role='user' rows — see services/chat/free-tier.ts).
      const openerText = pickOpener(pack, user.firstName);
      await db.insert(messagesTable).values({
        turnId: randomUUID(),
        companionId: companion.id,
        userId: req.userId!,
        role: "assistant",
        status: "complete",
        content: openerText,
      });

      const [updated] = await db
        .update(companionsTable)
        .set({ lastMessage: openerText, lastActiveAt: new Date(), messageCount: 1, updatedAt: new Date() })
        .where(eq(companionsTable.id, companion.id))
        .returning();
      result = updated ?? companion;

      if (!user.primaryCompanionId) {
        await db.update(usersTable).set({ primaryCompanionId: companion.id }).where(eq(usersTable.id, req.userId!));
      }
    }

    logger.info({ companionId: companion.id, isFirstCompanion }, "Companion created");
    sendSuccess(res, result, 201);
  } catch (err) {
    logger.error({ err }, "Failed to create companion");
    sendError(res, "Failed to create companion", 500);
  }
});

// PATCH /api/companions/:id — rename is free for everyone; trait updates get the same free-tier
// coercion as create (§9).
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
    if (req.body.traits !== undefined) {
      const [user] = await db
        .select({ isPremium: usersTable.isPremium })
        .from(usersTable)
        .where(eq(usersTable.id, req.userId!))
        .limit(1);
      const pack = getPersonaPack(companion.personaKey);
      updates.traits = coerceTraitsForTier(pack, req.body.traits, user?.isPremium ?? false);
    }

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
// last active companion, and re-pins Home to the next active survivor if it was the pinned one.
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

    // Primary/pinned fallback (§6): re-pin the earliest-created remaining active companion rather than
    // leaving Home pointing at nothing. The WHERE clause on the users update makes this a no-op when
    // the archived companion wasn't actually the pinned one.
    const [survivor] = await db
      .select({ id: companionsTable.id })
      .from(companionsTable)
      .where(and(eq(companionsTable.userId, req.userId!), isNull(companionsTable.archivedAt)))
      .orderBy(companionsTable.createdAt)
      .limit(1);
    await db
      .update(usersTable)
      .set({ primaryCompanionId: survivor?.id ?? null })
      .where(and(eq(usersTable.id, req.userId!), eq(usersTable.primaryCompanionId, companionId)));

    logger.info({ companionId }, "Companion archived");
    sendSuccess(res, updated);
  } catch (err) {
    logger.error({ err }, "Failed to archive companion");
    sendError(res, "Failed to archive companion", 500);
  }
});

// POST /api/companions/:id/restore — bring an archived companion back to Active, blocked at the
// active cap (same sheet as the §4 active-full create case).
router.post("/companions/:id/restore", requireAuth, async (req: AuthRequest, res) => {
  try {
    const companionId = req.params.id as string;
    if (!UUID_RE.test(companionId)) { sendError(res, "Invalid companion id", 400); return; }

    const [companion] = await db
      .select()
      .from(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .limit(1);
    if (!companion) { sendError(res, "Companion not found", 404); return; }
    if (!companion.archivedAt) { sendSuccess(res, companion); return; } // idempotent

    const [user] = await db
      .select({ isPremium: usersTable.isPremium })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);
    const [{ active }] = await db
      .select({ active: sql<number>`count(*)::int` })
      .from(companionsTable)
      .where(and(eq(companionsTable.userId, req.userId!), isNull(companionsTable.archivedAt)));
    if (Number(active) >= activeCompanionCap(user?.isPremium ?? false)) {
      sendError(res, "You're at your active companion limit. Archive one to make room.", 409, "ACTIVE_LIMIT_REACHED");
      return;
    }

    const [updated] = await db
      .update(companionsTable)
      .set({ archivedAt: null, updatedAt: new Date() })
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .returning();

    logger.info({ companionId }, "Companion restored");
    sendSuccess(res, updated);
  } catch (err) {
    logger.error({ err }, "Failed to restore companion");
    sendError(res, "Failed to restore companion", 500);
  }
});

// DELETE /api/companions/:id — permanent, irreversible delete. Cascades to messages, memories,
// memory_jobs, and voice_usage; safety_events + users.primaryCompanionId are set null by their FKs.
// Any companion is deletable; the only guard is min-1-active — deleting the user's last ACTIVE
// companion is blocked (deleting an archived one never trips this).
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

    if (!companion.archivedAt) {
      const [{ active }] = await db
        .select({ active: sql<number>`count(*)::int` })
        .from(companionsTable)
        .where(and(eq(companionsTable.userId, req.userId!), isNull(companionsTable.archivedAt)));
      if (Number(active) <= 1) {
        sendError(res, "You need at least one active companion — archive or delete a different one first.", 409, "LAST_ACTIVE_COMPANION");
        return;
      }
    }

    // Read the pin BEFORE deleting: the FK (onDelete: set null) clears users.primaryCompanionId
    // during the delete, so an after-the-fact "WHERE primaryCompanionId = :id" can never match.
    const [owner] = await db
      .select({ primaryCompanionId: usersTable.primaryCompanionId })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!))
      .limit(1);
    const wasPinned = owner?.primaryCompanionId === companionId;

    await db
      .delete(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)));

    // Re-pin the earliest-created active survivor explicitly rather than leaving Home pointing at
    // nothing (§6); the FK has already nulled the stale pin.
    if (wasPinned) {
      const [survivor] = await db
        .select({ id: companionsTable.id })
        .from(companionsTable)
        .where(and(eq(companionsTable.userId, req.userId!), isNull(companionsTable.archivedAt)))
        .orderBy(companionsTable.createdAt)
        .limit(1);
      await db
        .update(usersTable)
        .set({ primaryCompanionId: survivor?.id ?? null })
        .where(eq(usersTable.id, req.userId!));
    }

    logger.info({ companionId }, "Companion permanently deleted");
    sendSuccess(res, { deleted: true, id: companionId });
  } catch (err) {
    logger.error({ err }, "Failed to delete companion");
    sendError(res, "Failed to delete companion", 500);
  }
});

// DELETE /api/companions/:id/messages — "Clear conversation" (§7): wipes the transcript, keeps the
// companion and its memories. A fresh page, same relationship.
router.delete("/companions/:id/messages", requireAuth, async (req: AuthRequest, res) => {
  try {
    const companionId = req.params.id as string;
    if (!UUID_RE.test(companionId)) { sendError(res, "Invalid companion id", 400); return; }

    const [companion] = await db
      .select()
      .from(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .limit(1);
    if (!companion) { sendError(res, "Companion not found", 404); return; }

    await db
      .delete(messagesTable)
      .where(and(eq(messagesTable.companionId, companionId), eq(messagesTable.userId, req.userId!)));

    const [updated] = await db
      .update(companionsTable)
      .set({ lastMessage: null, messageCount: 0, updatedAt: new Date() })
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .returning();

    logger.info({ companionId }, "Conversation cleared");
    sendSuccess(res, updated);
  } catch (err) {
    logger.error({ err }, "Failed to clear conversation");
    sendError(res, "Failed to clear conversation", 500);
  }
});

// POST /api/companions/:id/forget — "Forget everything" (§7): wipes the transcript AND all memories,
// clears the remember_* pointer, keeps the companion shell (name, look, base persona).
router.post("/companions/:id/forget", requireAuth, async (req: AuthRequest, res) => {
  try {
    const companionId = req.params.id as string;
    if (!UUID_RE.test(companionId)) { sendError(res, "Invalid companion id", 400); return; }

    const [companion] = await db
      .select()
      .from(companionsTable)
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .limit(1);
    if (!companion) { sendError(res, "Companion not found", 404); return; }

    await db
      .delete(messagesTable)
      .where(and(eq(messagesTable.companionId, companionId), eq(messagesTable.userId, req.userId!)));
    await db
      .delete(memoriesTable)
      .where(and(eq(memoriesTable.companionId, companionId), eq(memoriesTable.userId, req.userId!)));

    const [updated] = await db
      .update(companionsTable)
      .set({
        lastMessage: null,
        messageCount: 0,
        rememberMemoryId: null,
        rememberQuestion: null,
        rememberGeneratedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(companionsTable.id, companionId), eq(companionsTable.userId, req.userId!)))
      .returning();

    logger.info({ companionId }, "Companion memory reset (forget everything)");
    sendSuccess(res, updated);
  } catch (err) {
    logger.error({ err }, "Failed to forget companion history");
    sendError(res, "Failed to forget companion history", 500);
  }
});

export default router;
