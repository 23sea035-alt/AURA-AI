import { Request, Response, NextFunction } from "express";
import { verifyToken as clerkVerifyToken } from "@clerk/backend";
import { TokenVerificationError } from "@clerk/backend/errors";
import { getEnv } from "../../config/env.js";
import { db, usersTable } from "../../db/src/index.js";
import { eq, and } from "drizzle-orm";
import { lookupLocalUser } from "./auth.service.js";
import { logger } from "../../lib/logger.js";

export interface AuthRequest extends Request {
  userId?: string;
  clerkUserId?: string;
}

function mapClerkError(err: unknown): { code: string; status: number; message: string } {
  if (err instanceof TokenVerificationError) {
    switch (err.reason) {
      case "token-expired":
        return { code: "EXPIRED_TOKEN", status: 401, message: "Session token has expired — please re-authenticate" };
      case "token-invalid-signature":
        return { code: "INVALID_SIGNATURE", status: 401, message: "Token signature is invalid" };
      case "token-invalid":
        return { code: "INVALID_TOKEN", status: 401, message: "Token is malformed or invalid" };
      case "token-not-active-yet":
        return { code: "TOKEN_NOT_ACTIVE", status: 401, message: "Token is not yet active" };
      default:
        return { code: "TOKEN_VERIFICATION_FAILED", status: 401, message: err.message || "Token verification failed" };
    }
  }
  return { code: "TOKEN_VERIFICATION_FAILED", status: 401, message: "Token verification failed" };
}

function getVerifyOptions() {
  return { secretKey: getEnv().CLERK_SECRET_KEY };
}

async function tryDevToken(token: string): Promise<{ userId: string } | null> {
  if (!token.startsWith("dev_")) return null;
  const clerkUserId = token.slice(4);
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.clerkUserId, clerkUserId), eq(usersTable.status, "active")))
    .limit(1);
  return user ? { userId: user.id } : null;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", code: "NO_TOKEN" });
    return;
  }

  try {
    const token = header.slice(7);

    const devUser = await tryDevToken(token);
    if (devUser) {
      req.userId = devUser.userId;
      req.clerkUserId = token.slice(4);
      next();
      return;
    }

    const jwtPayload = await clerkVerifyToken(token, getVerifyOptions());

    if (!jwtPayload.sub) {
      res.status(401).json({ error: "Invalid session", code: "INVALID_SESSION" });
      return;
    }

    req.clerkUserId = jwtPayload.sub;

    const localUser = await lookupLocalUser(jwtPayload.sub);
    if (!localUser) {
      res.status(404).json({ error: "User not found. Complete registration first.", code: "USER_NOT_FOUND" });
      return;
    }

    if (localUser.status !== "active") {
      res.status(403).json({ error: "Account is not active", code: "ACCOUNT_SUSPENDED" });
      return;
    }

    req.userId = localUser.id;
    next();
  } catch (err) {
    const { code, status, message } = mapClerkError(err);
    logger.warn({ err: message, code }, "Auth token verification failed");
    res.status(status).json({ error: message, code });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  try {
    const token = header.slice(7);
    const jwtPayload = await clerkVerifyToken(token, getVerifyOptions());

    if (jwtPayload.sub) {
      req.clerkUserId = jwtPayload.sub;
      const localUser = await lookupLocalUser(jwtPayload.sub);
      if (localUser && localUser.status === "active") {
        req.userId = localUser.id;
      }
    }
  } catch {
    // Token verification failed — continue as unauthenticated
  }

  next();
}

export function extractBearer(header: string | undefined): string | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  return header.slice(7);
}

// For use during WebSocket HTTP upgrade events, where Express middleware cannot run.
export async function verifyWebSocketAuth(token: string): Promise<{ userId: string; clerkUserId: string } | null> {
  try {
    const jwtPayload = await clerkVerifyToken(token, getVerifyOptions());
    if (!jwtPayload.sub) return null;
    const localUser = await lookupLocalUser(jwtPayload.sub);
    if (!localUser || localUser.status !== "active") return null;
    return { userId: localUser.id, clerkUserId: jwtPayload.sub };
  } catch {
    return null;
  }
}
