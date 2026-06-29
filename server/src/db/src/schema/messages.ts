import { pgTable, text, boolean, timestamp, uuid, unique } from "drizzle-orm/pg-core";
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
}, (table) => ({
  // Proper Drizzle builder (was a plain object literal that drizzle-kit ignored). The DB
  // constraint is created by migration 0002; this keeps schema generation in sync.
  turnIdRoleUnique: unique("uq_turn_id_role").on(table.turnId, table.role),
}));

export type Message = typeof messagesTable.$inferSelect;
export type NewMessage = typeof messagesTable.$inferInsert;
