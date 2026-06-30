import { pgTable, text, boolean, timestamp, uuid, bigint, index } from "drizzle-orm/pg-core";
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
]);

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type NewSubscription = typeof subscriptionsTable.$inferInsert;
