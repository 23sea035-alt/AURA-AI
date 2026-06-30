import { db, usersTable, subscriptionsTable } from "../../db/src/index.js";
import { eq } from "drizzle-orm";
import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { createHmac, timingSafeEqual } from "crypto";

interface RevenueCatWebhookPayload {
  event: string;
  event_timestamp_ms: number;
  product_id: string;
  transaction_id: string;
  original_transaction_id: string;
  period_type: string;
  purchased_at_ms: number;
  expiration_at_ms: number | null;
  environment: "SANDBOX" | "PRODUCTION";
  entitlement_id: string;
  entitlement_ids: string[];
  app_user_id: string;
  aliases: string[];
  store: string;
  type: string;
  country: string;
  currency: string;
  is_trial_conversion?: boolean;
  auto_resume_at_ms?: number | null;
  cancellation_reason?: string | null;
  refund_reason?: string | null;
}

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = getEnv().REVENUECAT_WEBHOOK_SECRET;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const expectedBuf = Buffer.from(expected);
    const sigBuf = Buffer.from(signature);
    if (expectedBuf.length !== sigBuf.length) return false;
    return timingSafeEqual(expectedBuf, sigBuf);
  } catch (err) {
    logger.warn({ err }, "RevenueCat webhook signature verification failed");
    return false;
  }
}

export async function handleRevenueCatWebhook(
  rawBody: string,
  signature: string,
): Promise<{ received: boolean }> {
  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn("RevenueCat webhook signature verification failed");
    throw new Error("Invalid webhook signature");
  }

  const payload: RevenueCatWebhookPayload = JSON.parse(rawBody);
  const { event, app_user_id, environment, product_id, store, period_type, expiration_at_ms, original_transaction_id } = payload;

  if (!app_user_id) {
    logger.warn({ event }, "RevenueCat webhook missing app_user_id");
    return { received: true };
  }

  const isProduction = environment.toUpperCase() === "PRODUCTION";
  if (!isProduction) {
    const allowSandbox = getEnv().RC_ALLOW_SANDBOX;
    if (!allowSandbox) {
      logger.warn({ environment, event }, "RevenueCat webhook — sandbox event rejected (RC_ALLOW_SANDBOX=false)");
      return { received: true };
    }
    logger.info({ environment, event }, "RevenueCat webhook — processing non-production event");
  }

  const userId = app_user_id;

  switch (event) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PURCHASE": {
      const expiresAt = expiration_at_ms ? new Date(expiration_at_ms) : null;
      await db.insert(subscriptionsTable).values({
        userId,
        tier: "premium",
        status: "active",
        store,
        productId: product_id,
        originalTransactionId: original_transaction_id,
        rcAppUserId: app_user_id,
        periodType: period_type,
        expiresAt,
        willRenew: expiresAt ? expiresAt > new Date() : true,
      }).onConflictDoUpdate({
        target: subscriptionsTable.userId,
        set: {
          status: "active",
          productId: product_id,
          originalTransactionId: original_transaction_id,
          periodType: period_type,
          expiresAt,
          willRenew: expiresAt ? expiresAt > new Date() : true,
          updatedAt: new Date(),
        },
      });

      await db.update(usersTable)
        .set({ isPremium: true })
        .where(eq(usersTable.id, userId));
      break;
    }

    case "CANCELLATION":
    case "EXPIRATION": {
      await db.update(subscriptionsTable)
        .set({ status: "expired", willRenew: false, updatedAt: new Date() })
        .where(eq(subscriptionsTable.userId, userId));

      await db.update(usersTable)
        .set({ isPremium: false })
        .where(eq(usersTable.id, userId));
      break;
    }

    case "UNCANCELLATION": {
      await db.update(subscriptionsTable)
        .set({ status: "active", willRenew: true, updatedAt: new Date() })
        .where(eq(subscriptionsTable.userId, userId));

      await db.update(usersTable)
        .set({ isPremium: true })
        .where(eq(usersTable.id, userId));
      break;
    }

    case "BILLING_ISSUE": {
      await db.update(subscriptionsTable)
        .set({ status: "billing_retry", updatedAt: new Date() })
        .where(eq(subscriptionsTable.userId, userId));
      break;
    }

    default:
      logger.debug({ event }, "RevenueCat webhook — unhandled event");
  }

  return { received: true };
}
