import { pgTable, text, boolean, timestamp, uuid, integer, jsonb, index, check, type AnyPgColumn } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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
  // Archive is a reversible soft-remove (null = active). The roster is fetched whole and filtered
  // client-side into Active/Archived; base companions can be archived but not permanently deleted.
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  // "Remembers" Home-card cache (read-only on Home; upserted by the consolidation job).
  // A surfaced memory + a Groq-generated follow-up question. FK set null if the memory is deleted.
  rememberMemoryId: uuid("remember_memory_id").references((): AnyPgColumn => memoriesTable.id, { onDelete: "set null" }),
  rememberQuestion: text("remember_question"),
  rememberGeneratedAt: timestamp("remember_generated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Keep in sync with PERSONA_KEY in @aura/shared (the 12 curated gallery presets). Widened from the
  // 3 anchors once the persona-probe differentiation eval passed (36/36 distinct, 3/3 tune).
  check("companions_persona_key_check", sql`${table.personaKey} in ('aurora', 'orion', 'lyra', 'sage', 'amara', 'eli', 'selene', 'soren', 'juno', 'thea', 'cyrus', 'wren')`),
  index("idx_companions_user").on(table.userId),
]);

export type Companion = typeof companionsTable.$inferSelect;
export type NewCompanion = typeof companionsTable.$inferInsert;
