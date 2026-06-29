import { pgTable, boolean, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { companionsTable } from "./companions.js";

export const memoryJobsTable = pgTable("memory_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  companionId: uuid("companion_id").notNull().references(() => companionsTable.id, { onDelete: "cascade" }),
  rawContent: text("raw_content").notNull(),
  status: text("status").notNull().default("pending"),
  result: text("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  safetySkipped: boolean("safety_skipped").default(false),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type MemoryJob = typeof memoryJobsTable.$inferSelect;
export type NewMemoryJob = typeof memoryJobsTable.$inferInsert;
