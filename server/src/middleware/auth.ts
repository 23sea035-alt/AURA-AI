import type { Request, Response, NextFunction } from "express";
import { db } from "../db/src/index.js";
import { usersTable } from "../db/src/index.js";
import { eq } from "drizzle-orm";
import { sendError } from "../lib/response.js";
import { logger } from "../lib/logger.js";
import type { AuthRequest } from "../services/auth/clerk.middleware.js";

// Re-export Clerk-based auth as the standard auth interface.
// Routes continue to import requireAuth and AuthRequest from this module.
export { requireAuth, optionalAuth, verifyWebSocketAuth, extractBearer } from "../services/auth/clerk.middleware.js";
export type { AuthRequest } from "../services/auth/clerk.middleware.js";

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    sendError(res, "Unauthorized", 401);
    return;
  }
  try {
    const [user] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId))
      .limit(1);
    if (user?.role !== "admin") {
      sendError(res, "Admin access required", 403);
      return;
    }
    next();
  } catch (err) {
    logger.error({ err, userId: req.userId }, "Admin verification failed");
    sendError(res, "Failed to verify admin status", 500);
  }
}
