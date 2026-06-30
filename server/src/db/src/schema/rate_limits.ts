import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

// Durable, shared rate-limit counters (per-minute / daily-cap / brute-force) that hold across
// process restarts and multiple API instances. Written via raw SQL in PgRateLimitStore; modeled
// here so the Drizzle schema is the complete source of truth for drizzle-kit generate.
export const rateLimitsTable = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  index("idx_rate_limits_expires_at").on(table.expiresAt),
]);

export type RateLimit = typeof rateLimitsTable.$inferSelect;
export type NewRateLimit = typeof rateLimitsTable.$inferInsert;
