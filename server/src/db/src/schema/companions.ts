import { pgTable, text, boolean, timestamp, uuid, integer, jsonb, type AnyPgColumn } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { memoriesTable } from "./memories.js";

export const companionsTable = pgTable("companions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  personaKey: text("persona_key").notNull(),
  name: text("name").notNull(),
  traits: jsonb("traits").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  lastMessage: text("last_message"),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  messageCount: integer("message_count").notNull().default(0),
  // "Remembers" Home-card cache (read-only on Home; upserted by the consolidation job).
  // A surfaced memory + a Groq-generated follow-up question. FK set null if the memory is deleted.
  rememberMemoryId: uuid("remember_memory_id").references((): AnyPgColumn => memoriesTable.id, { onDelete: "set null" }),
  rememberQuestion: text("remember_question"),
  rememberGeneratedAt: timestamp("remember_generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Companion = typeof companionsTable.$inferSelect;
export type NewCompanion = typeof companionsTable.$inferInsert;
