import { pgTable, text, real, timestamp, uuid, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users.js";
import { companionsTable } from "./companions.js";
import { messagesTable } from "./messages.js";

export const memoriesTable = pgTable("memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  companionId: uuid("companion_id").notNull().references(() => companionsTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"),
  importance: real("importance").notNull().default(0.5),
  keywords: text("keywords").array().notNull().default([]),
  sourceMessageId: uuid("source_message_id").references(() => messagesTable.id, { onDelete: "set null" }),
  lastRecalledAt: timestamp("last_recalled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_memories_user_companion").on(table.userId, table.companionId),
  check("memories_category_check", sql`${table.category} in ('identity', 'preference', 'attribute', 'relationship', 'work', 'location', 'general')`),
]);

export type Memory = typeof memoriesTable.$inferSelect;
export type NewMemory = typeof memoriesTable.$inferInsert;
