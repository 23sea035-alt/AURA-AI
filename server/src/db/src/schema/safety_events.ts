import { pgTable, text, timestamp, uuid, boolean, index, check } from "drizzle-orm/pg-core";
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
  // E-3 tiered content retention (data-retention-policy.md §3): the tier set at write time decides
  // how much raw content is stored and when the scrub job nulls flagged_content. The ROW is kept
  // permanently — it is the de-identified metadata layer SB 243 reporting reads. legal_hold=true
  // pauses the scrub clock (active claim / investigation / LE preservation).
  contentTier: text("content_tier").notNull().default("T2"),
  legalHold: boolean("legal_hold").notNull().default(false),
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
  check("safety_events_status_check", sql`${table.status} in ('open', 'reviewed', 'actioned', 'dismissed')`),
  check("safety_events_content_tier_check", sql`${table.contentTier} in ('T1', 'T2', 'T3')`),
  check("safety_events_action_check", sql`${table.action} is null or ${table.action} in ('none', 'warned', 'suspended', 'banned')`),
  index("idx_safety_events_user").on(table.userId),
  // Review queue: open events by severity, newest first (SB 243 review workflow).
  index("idx_safety_events_review").on(table.status, table.severity, table.createdAt),
]);
// NOTE: safety_events.category is intentionally NOT constrained — it stores the raw moderator
// category string (e.g. "self-harm/intent", "sexual/minors", "injection"), which is richer than
// the coarse MODERATION_CATEGORY enum. Constraining it would lose audit detail.

export type SafetyEvent = typeof safetyEventsTable.$inferSelect;
export type NewSafetyEvent = typeof safetyEventsTable.$inferInsert;
