import { pgTable, boolean, text, timestamp, uuid, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { companionsTable } from "./companions.js";

export const memoryJobsTable = pgTable("memory_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  companionId: uuid("companion_id").notNull().references(() => companionsTable.id, { onDelete: "cascade" }),
  rawContent: text("raw_content").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  safetySkipped: boolean("safety_skipped").notNull().default(false),
  result: text("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type MemoryJob = typeof memoryJobsTable.$inferSelect;
export type NewMemoryJob = typeof memoryJobsTable.$inferInsert;
