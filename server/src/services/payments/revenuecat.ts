import { db, usersTable, subscriptionsTable } from "../../db/src/index.js";
import { eq, and, sql } from "drizzle-orm";
import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { timingSafeEqual } from "crypto";

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

// RevenueCat sends UPPERCASE store/period values; normalize to the SUBSCRIPTION_STORE /
// SUBSCRIPTION_PERIOD enums (the DB now enforces these via CHECK constraints).
const STORE_MAP: Record<string, string> = {
  APP_STORE: "app_store",
  MAC_APP_STORE: "app_store",
  PLAY_STORE: "play_store",
  STRIPE: "stripe",
};
function normalizeStore(raw: string): string {
  const mapped = STORE_MAP[raw?.toUpperCase()];
  if (mapped) return mapped;
  logger.warn({ store: raw }, "Unknown RevenueCat store — defaulting to app_store (v1 is iOS-only)");
  return "app_store";
}
const PERIOD_MAP: Record<string, string> = { NORMAL: "normal", TRIAL: "trial", INTRO: "intro" };
function normalizePeriodType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return PERIOD_MAP[raw.toUpperCase()] ?? null; // PROMOTIONAL / unknown → null (column is nullable)
}

/**
 * RevenueCat webhooks carry no body signature — the dashboard's "Authorization header"
 * value is sent VERBATIM with every event (RC docs: verify by comparing that header).
 * Constant-time match against REVENUECAT_WEBHOOK_SECRET; "Bearer " prefix optional.
 * (The previous HMAC-of-body scheme could never pass with real RC traffic — found in
 * the 2026-07-07 live pass when a Test Store purchase's webhook 400'd.)
 */
function verifyWebhookAuth(authHeader: string): boolean {
  const secret = getEnv().REVENUECAT_WEBHOOK_SECRET;
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  try {
    const presentedBuf = Buffer.from(presented);
    const secretBuf = Buffer.from(secret);
    if (presentedBuf.length !== secretBuf.length) return false;
    return timingSafeEqual(presentedBuf, secretBuf);
  } catch (err) {
    logger.warn({ err }, "RevenueCat webhook auth verification failed");
    return false;
  }
}

export async function handleRevenueCatWebhook(
  rawBody: string,
  authHeader: string,
): Promise<{ received: boolean }> {
  if (!verifyWebhookAuth(authHeader)) {
    logger.warn("RevenueCat webhook signature verification failed");
    throw new Error("Invalid webhook signature");
  }

  const parsed = JSON.parse(rawBody) as Record<string, unknown>;
  // Real RC v1.0 bodies nest every field under `event` with the kind in `event.type`
  // ({api_version, event:{type, app_user_id, …}}); the flat `event: "TYPE"` shape is kept
  // for fixtures/back-compat. Found in the 2026-07-07 live pass: a Test Store purchase's
  // webhook was "received" but matched no event and never granted premium.
  const nested = parsed.event;
  const payload: RevenueCatWebhookPayload =
    typeof nested === "object" && nested !== null
      ? ({ ...(nested as Record<string, unknown>), event: (nested as { type?: string }).type ?? "" } as unknown as RevenueCatWebhookPayload)
      : (parsed as unknown as RevenueCatWebhookPayload);
  const { event, app_user_id, environment, product_id, store, period_type, expiration_at_ms, original_transaction_id, event_timestamp_ms } = payload;

  if (!app_user_id) {
    logger.warn({ event }, "RevenueCat webhook missing app_user_id");
    return { received: true };
  }

  // In production, ignore SANDBOX events so test purchases can't grant real premium.
  if (environment.toUpperCase() !== "PRODUCTION" && getEnv().NODE_ENV === "production") {
    logger.warn({ environment, event }, "RevenueCat SANDBOX event in production — ignoring");
    return { received: true };
  }

  const userId = app_user_id;

  // app_user_id is client-provided — validate it maps to a real user before mutating entitlements.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(userId)) {
    logger.warn({ event }, "RevenueCat webhook app_user_id is not a valid user id — ignoring");
    return { received: true };
  }
  const [knownUser] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!knownUser) {
    logger.warn({ event, userId }, "RevenueCat webhook for unknown user — ignoring");
    return { received: true };
  }

  // Wrap stale-check + mutation in a transaction with FOR UPDATE + CAS WHERE to prevent race.
  await db.transaction(async (tx) => {
    const [existingSub] = await tx
      .select({ lastEventTimestampMs: subscriptionsTable.lastEventTimestampMs })
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.userId, userId))
      .limit(1)
      .for("update");

    if (
      typeof event_timestamp_ms === "number" &&
      existingSub?.lastEventTimestampMs != null &&
      event_timestamp_ms <= existingSub.lastEventTimestampMs
    ) {
      logger.warn({ event, userId }, "RevenueCat stale/out-of-order event — ignoring");
      return;
    }

    switch (event) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PURCHASE": {
        const expiresAt = expiration_at_ms ? new Date(expiration_at_ms) : null;
        const normalizedStore = normalizeStore(store);
        const normalizedPeriod = normalizePeriodType(period_type);
        await tx.insert(subscriptionsTable).values({
          userId,
          tier: "premium",
          status: "active",
          store: normalizedStore,
          productId: product_id,
          originalTransactionId: original_transaction_id,
          rcAppUserId: app_user_id,
          periodType: normalizedPeriod,
          expiresAt,
          willRenew: expiresAt ? expiresAt > new Date() : true,
          lastEventTimestampMs: event_timestamp_ms,
        }).onConflictDoUpdate({
          target: subscriptionsTable.userId,
          set: {
            status: "active",
            productId: product_id,
            originalTransactionId: original_transaction_id,
            periodType: normalizedPeriod,
            expiresAt,
            willRenew: expiresAt ? expiresAt > new Date() : true,
            lastEventTimestampMs: event_timestamp_ms,
            updatedAt: new Date(),
          },
        });

        await tx.update(usersTable)
          .set({ isPremium: true })
          .where(eq(usersTable.id, userId));
        break;
      }

      case "CANCELLATION":
      case "EXPIRATION": {
        const subResult = await tx.update(subscriptionsTable)
          .set({ status: "expired", willRenew: false, lastEventTimestampMs: event_timestamp_ms, updatedAt: new Date() })
          .where(and(
            eq(subscriptionsTable.userId, userId),
            sql`${subscriptionsTable.lastEventTimestampMs} < ${event_timestamp_ms}`,
          ));
        if (subResult?.rowCount ?? 0 > 0) {
          await tx.update(usersTable)
            .set({ isPremium: false })
            .where(eq(usersTable.id, userId));
        }
        break;
      }

      case "UNCANCELLATION": {
        const uncancelResult = await tx.update(subscriptionsTable)
          .set({ status: "active", willRenew: true, lastEventTimestampMs: event_timestamp_ms, updatedAt: new Date() })
          .where(and(
            eq(subscriptionsTable.userId, userId),
            sql`${subscriptionsTable.lastEventTimestampMs} < ${event_timestamp_ms}`,
          ));
        if (uncancelResult?.rowCount ?? 0 > 0) {
          await tx.update(usersTable)
            .set({ isPremium: true })
            .where(eq(usersTable.id, userId));
        }
        break;
      }

      case "BILLING_ISSUE": {
        await tx.update(subscriptionsTable)
          .set({ status: "billing_retry", lastEventTimestampMs: event_timestamp_ms, updatedAt: new Date() })
          .where(and(
            eq(subscriptionsTable.userId, userId),
            sql`${subscriptionsTable.lastEventTimestampMs} < ${event_timestamp_ms}`,
          ));
        break;
      }

      default:
        logger.debug({ event }, "RevenueCat webhook — unhandled event");
    }
  });

  return { received: true };
}
