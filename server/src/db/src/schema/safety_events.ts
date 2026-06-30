import { pgTable, text, timestamp, uuid, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users.js";
import { companionsTable } from "./companions.js";
import { messagesTable } from "./messages.js";

export const safetyEventsTable = pgTable("safety_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  companionId: uuid("companion_id").references(() => companionsTable.id, { onDelete: "set null" }),
  messageId: uuid("message_id").references(() => messagesTable.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  source: text("source").notNull(),
  category: text("category"),
  model: text("model"),
  severity: text("severity").notNull().default("info"),
  detail: text("detail"),
  flaggedContent: text("flagged_content"),
  status: text("status").notNull().default("open"),
  action: text("action"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("safety_events_event_type_check", sql`${table.eventType} in ('input_blocked', 'output_blocked', 'crisis_detected', 'injection_detected', 'user_reported')`),
  check("safety_events_source_check", sql`${table.source} in ('input', 'output', 'injection', 'user_report')`),
  check("safety_events_severity_check", sql`${table.severity} in ('info', 'warning', 'critical')`),
  index("idx_safety_events_user").on(table.userId),
]);

export type SafetyEvent = typeof safetyEventsTable.$inferSelect;
export type NewSafetyEvent = typeof safetyEventsTable.$inferInsert;
