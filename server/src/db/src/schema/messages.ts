import { pgTable, text, boolean, timestamp, uuid, unique, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users.js";
import { companionsTable } from "./companions.js";

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  turnId: uuid("turn_id").notNull(),
  companionId: uuid("companion_id").notNull().references(() => companionsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  status: text("status").notNull().default("complete"),
  content: text("content").notNull(),
  flagged: boolean("flagged").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("uq_turn_id_role").on(table.turnId, table.role),
  index("idx_messages_user_companion_created").on(table.userId, table.companionId, table.createdAt),
  index("idx_messages_user_created").on(table.userId, table.createdAt),
  check("messages_role_check", sql`${table.role} in ('user', 'assistant')`),
  check("messages_status_check", sql`${table.status} in ('pending', 'complete', 'failed', 'blocked')`),
]);

export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
