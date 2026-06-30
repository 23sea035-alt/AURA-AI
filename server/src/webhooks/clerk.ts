import { Router } from "express";
import { Webhook } from "svix";
import { getEnv } from "../config/env.js";
import { upsertUserFromClerk, deleteUserByClerkId, checkBan } from "../services/auth/auth.service.js";
import { logger } from "../lib/logger";

const router = Router();

interface ClerkWebhookPayload {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    public_metadata?: {
      role?: string;
    };
    external_accounts?: Array<{ provider?: string; provider_user_id?: string }>;
    created_at?: number;
    updated_at?: number;
    deleted?: boolean;
  };
  object: "event";
}

let wh: Webhook | null = null;

function getWebhook() {
  if (!wh) {
    wh = new Webhook(getEnv().CLERK_WEBHOOK_SECRET);
  }
  return wh;
}

function gatherOAuthSubs(data: ClerkWebhookPayload["data"]): { appleSub?: string; googleSub?: string } {
  const subs: { appleSub?: string; googleSub?: string } = {};
  for (const acc of data.external_accounts ?? []) {
    const p = acc.provider?.toLowerCase() ?? "";
    if (p.includes("apple") && acc.provider_user_id) subs.appleSub = acc.provider_user_id;
    if (p.includes("google") && acc.provider_user_id) subs.googleSub = acc.provider_user_id;
  }
  return subs;
}

// POST /webhooks/clerk
router.post("/clerk", async (req, res) => {
  const svixId = req.headers["svix-id"] as string;
  const svixTimestamp = req.headers["svix-timestamp"] as string;
  const svixSignature = req.headers["svix-signature"] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: "Missing svix headers" });
    return;
  }

  const rawBody = req.rawBody;
  if (!rawBody) {
    res.status(400).json({ error: "Missing raw body for signature verification" });
    return;
  }

  let payload: ClerkWebhookPayload;
  try {
    const msg = getWebhook().verify(rawBody, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
    payload = JSON.parse(JSON.stringify(msg));
  } catch (err) {
    logger.warn({ err }, "Clerk webhook signature verification failed");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  const { type, data } = payload;

  try {
    switch (type) {
      case "user.created": {
        const email = data.email_addresses?.[0]?.email_address ?? "";
        const subs = gatherOAuthSubs(data);
        const banned = await checkBan(email, subs);
        if (banned) {
          logger.warn({ clerkUserId: data.id }, "Banned identity attempted registration — blocking");
          res.json({ success: true, action: "blocked_ban_evasion" });
          return;
        }
        await upsertUserFromClerk({
          clerkUserId: data.id,
          email,
          firstName: data.first_name,
          lastName: data.last_name,
          role: data.public_metadata?.role,
        });
        logger.info({ clerkUserId: data.id, type }, "User mirrored from Clerk");
        break;
      }
      case "user.updated": {
        const updEmail = data.email_addresses?.[0]?.email_address ?? "";
        const updSubs = gatherOAuthSubs(data);
        if (await checkBan(updEmail, updSubs)) {
          logger.warn({ clerkUserId: data.id }, "Banned identity on user.updated — removing mirrored user");
          await deleteUserByClerkId(data.id);
          res.json({ success: true, action: "blocked_ban_evasion" });
          return;
        }
        await upsertUserFromClerk({
          clerkUserId: data.id,
          email: updEmail,
          firstName: data.first_name,
          lastName: data.last_name,
          role: data.public_metadata?.role,
        });
        logger.info({ clerkUserId: data.id, type }, "User mirrored from Clerk");
        break;
      }
      case "user.deleted": {
        await deleteUserByClerkId(data.id);
        logger.info({ clerkUserId: data.id, type }, "User deleted from Clerk sync");
        break;
      }
      default:
        logger.debug({ type }, "Unhandled Clerk webhook event");
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err, type }, "Clerk webhook handler error");
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

export default router;
