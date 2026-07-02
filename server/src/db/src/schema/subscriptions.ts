import { pgTable, text, boolean, timestamp, uuid, bigint, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users.js";

export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").unique().references(() => usersTable.id, { onDelete: "set null" }),
  tier: text("tier").notNull().default("premium"),
  status: text("status").notNull(),
  store: text("store").notNull(),
  productId: text("product_id"),
  entitlement: text("entitlement"),
  originalTransactionId: text("original_transaction_id"),
  rcAppUserId: text("rc_app_user_id"),
  periodType: text("period_type"),
  willRenew: boolean("will_renew").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastEventTimestampMs: bigint("last_event_timestamp_ms", { mode: "number" }),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_subscriptions_user").on(table.userId),
  check("subscriptions_tier_check", sql`${table.tier} in ('free', 'premium')`),
  check("subscriptions_status_check", sql`${table.status} in ('active', 'trialing', 'grace_period', 'billing_retry', 'expired', 'revoked')`),
  check("subscriptions_store_check", sql`${table.store} in ('app_store', 'play_store', 'stripe')`),
  check("subscriptions_period_type_check", sql`${table.periodType} is null or ${table.periodType} in ('normal', 'trial', 'intro')`),
]);

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type NewSubscription = typeof subscriptionsTable.$inferInsert;
