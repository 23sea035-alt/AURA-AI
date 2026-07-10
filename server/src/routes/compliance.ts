import { Router } from "express";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { db, usersTable, messagesTable, companionsTable, memoriesTable, deviceTokensTable, safetyEventsTable, bannedIdentitiesTable, subscriptionsTable } from "../db/src/index.js";
import { requireAuth, requireAuthAllowDeleted, requireAdmin, AuthRequest } from "../middleware/auth.js";
import { authBruteForceLimiter, exportLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { logger } from "../lib/logger.js";
import { hashIdentifier } from "../lib/crypto.js";
import { getMetrics } from "../lib/metrics.js";
import { sendSuccess, sendError } from "../lib/response.js";
import { ReportMessageSchema, BanUserSchema, UnbanUserSchema } from "@aura/shared";
import { z } from "zod";

const router = Router();

// Admin safety-events review filters (query params). Loose on eventType/severity so a future
// event type never 400s the reviewer; strict on the structural params. limit caps at 200.
const SafetyEventsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  eventType: z.string().min(1).optional(),
  severity: z.string().min(1).optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// DELETE /api/account — Soft-delete account (30-day grace, recoverable)
router.delete("/account", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    await db.transaction(async (tx) => {
      await tx.delete(deviceTokensTable).where(eq(deviceTokensTable.userId, userId));
      await tx.update(usersTable).set({
        firstName: null,
        lastName: null,
        dateOfBirth: null,
        ageVerified: false,
        email: `deleted-${userId}@aura.ai`,
        status: "deleted",
        deletedAt: new Date(),
        isPremium: false,
        updatedAt: new Date(),
      }).where(eq(usersTable.id, userId));
    });

    logger.info({ userId }, "Account soft-deleted — 30-day grace period started");
    sendSuccess(res, { deleted: true, gracePeriodDays: 30 });
  } catch (err) {
    logger.error({ err }, "Account deletion failed");
    sendError(res, "Account deletion failed", 500);
  }
});

// PATCH /api/account/reactivate — Restore soft-deleted account within grace period.
// requireAuthAllowDeleted (NOT requireAuth): the plain gate 403s any non-active status, which made
// this route unreachable for the exact users it serves (E-1). Banned/suspended remain blocked.
router.patch("/account/reactivate", requireAuthAllowDeleted, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user || user.status !== "deleted") {
      sendError(res, "Account is not deleted", 400);
      return;
    }

    await db.update(usersTable).set({
      status: "active",
      deletedAt: null,
      email: `reactivated-${userId}@aura.ai`,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, userId));

    logger.info({ userId }, "Account reactivated");
    sendSuccess(res, { reactivated: true });
  } catch (err) {
    logger.error({ err }, "Account reactivation failed");
    sendError(res, "Account reactivation failed", 500);
  }
});

// GET /api/account/export — Data export (GDPR). Rate-limited: the single most sensitive payload
// we serve (everything we hold on the user), and expensive to assemble. Never log the payload.
router.get("/account/export", requireAuth, exportLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    const allCompanions = await db.select().from(companionsTable).where(eq(companionsTable.userId, userId));
    const allMessages = await db.select().from(messagesTable).where(eq(messagesTable.userId, userId));
    const allMemories = await db.select().from(memoriesTable).where(eq(memoriesTable.userId, userId));
    // GDPR/CCPA right-to-know covers ALL personal data: include subscriptions, device tokens, and
    // the user-associated safety/moderation signals (de-identified content is the user's data too).
    const allSubscriptions = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
    const allDeviceTokens = await db.select().from(deviceTokensTable).where(eq(deviceTokensTable.userId, userId));
    const allSafetyEvents = await db.select().from(safetyEventsTable).where(eq(safetyEventsTable.userId, userId));

    sendSuccess(res, {
      user,
      companions: allCompanions,
      messages: allMessages,
      memories: allMemories,
      subscriptions: allSubscriptions,
      deviceTokens: allDeviceTokens,
      safetyEvents: allSafetyEvents,
    });
  } catch (err) {
    logger.error({ err }, "Data export failed");
    sendError(res, "Data export failed", 500);
  }
});

// POST /api/messages/:id/report — Flag an AI message (Apple Guideline 1.2 / UGC)
router.post("/messages/:id/report", requireAuth, validate(ReportMessageSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const messageId = req.params.id as string;
    const { reason, detail } = req.body;

    const [message] = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.id, messageId), eq(messagesTable.userId, userId)))
      .limit(1);
    if (!message) {
      sendError(res, "Message not found", 404);
      return;
    }

    await db.insert(safetyEventsTable).values({
      userId,
      messageId,
      eventType: "user_reported",
      source: "user_report",
      // Non-info so user reports surface in the review queue rather than sitting invisible (Apple 1.2).
      severity: "warning",
      detail: reason,
      flaggedContent: (detail ?? "").slice(0, 500) || null,
    });

    logger.info({ userId, messageId }, "Message reported");
    sendSuccess(res, { reported: true }, 201);
  } catch (err) {
    logger.error({ err }, "Failed to report message");
    sendError(res, "Failed to report message", 500);
  }
});

// GET /api/admin/safety-events — Review the safety-events queue (admin only). This is the HUMAN-
// review surface for the suspension policy: violations are logged here and never auto-actioned, and
// a developer filters + evaluates them to decide on manual account action. All filters optional and
// AND-combined: userId, eventType, severity, since/until (ISO 8601), plus limit/offset pagination.
router.get("/admin/safety-events", requireAuth, requireAdmin, async (req: AuthRequest, res) => {
  const parsed = SafetyEventsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    sendError(res, "Invalid query parameters", 400, "INVALID_QUERY");
    return;
  }
  const { userId, eventType, severity, since, until, limit, offset } = parsed.data;
  try {
    const events = await db.select().from(safetyEventsTable)
      .where(and(
        userId ? eq(safetyEventsTable.userId, userId) : undefined,
        eventType ? eq(safetyEventsTable.eventType, eventType) : undefined,
        severity ? eq(safetyEventsTable.severity, severity) : undefined,
        since ? gte(safetyEventsTable.createdAt, new Date(since)) : undefined,
        until ? lte(safetyEventsTable.createdAt, new Date(until)) : undefined,
      ))
      .orderBy(desc(safetyEventsTable.createdAt))
      .limit(limit)
      .offset(offset);

    sendSuccess(res, { events, limit, offset, count: events.length });
  } catch (err) {
    logger.error({ err }, "Failed to fetch safety events");
    sendError(res, "Failed to fetch safety events", 500);
  }
});

// GET /api/admin/metrics — Operational counters (safety events, rate-limit rejections) — admin only.
// Per-instance, in-memory; intended for a quick health read or to be scraped/aggregated.
router.get("/admin/metrics", requireAuth, requireAdmin, async (_req: AuthRequest, res) => {
  sendSuccess(res, getMetrics());
});

// POST /api/admin/ban — Ban a user by email (admin only)
router.post("/admin/ban", requireAuth, requireAdmin, authBruteForceLimiter, validate(BanUserSchema), async (req: AuthRequest, res) => {
  try {
    const userId = req.userId!;
    const { email, reason } = req.body;

    await db.insert(bannedIdentitiesTable).values({
      identifierHash: hashIdentifier(email.toLowerCase()),
      identifierType: "email_hash",
      reason: reason ?? "Violation of terms",
    });

    // Revoke access for an already-registered account with this email (requireAuth blocks
    // non-active users). Banning must affect existing users, not just future re-registration.
    await db.update(usersTable)
      .set({ status: "banned", updatedAt: new Date() })
      .where(eq(usersTable.email, email.toLowerCase()));

    logger.info({ adminId: userId }, "User banned");
    sendSuccess(res, { banned: true }, 201);
  } catch (err) {
    logger.error({ err }, "Ban failed");
    sendError(res, "Ban failed", 500);
  }
});

// POST /api/admin/unban — Unban a user by email (admin only)
router.post("/admin/unban", requireAuth, requireAdmin, authBruteForceLimiter, validate(UnbanUserSchema), async (req: AuthRequest, res) => {
  try {
    const { email } = req.body;

    const hash = hashIdentifier(email.toLowerCase());
    await db.delete(bannedIdentitiesTable).where(eq(bannedIdentitiesTable.identifierHash, hash));

    // Reactivate a previously-banned account with this email.
    await db.update(usersTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(and(eq(usersTable.email, email.toLowerCase()), eq(usersTable.status, "banned")));

    logger.info({ adminId: req.userId! }, "User unbanned");
    sendSuccess(res, { unbanned: true });
  } catch (err) {
    logger.error({ err }, "Unban failed");
    sendError(res, "Unban failed", 500);
  }
});

export default router;
