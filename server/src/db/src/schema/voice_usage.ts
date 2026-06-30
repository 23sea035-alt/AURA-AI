import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { companionsTable } from "./companions.js";

export const voiceUsageTable = pgTable("voice_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  // FK + cascade so voice usage is deleted with the user/companion (GDPR + retention parity
  // with every other table). req.userId is the internal users.id uuid (set by Clerk middleware).
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  companionId: uuid("companion_id").notNull().references(() => companionsTable.id, { onDelete: "cascade" }),
  durationSeconds: integer("duration_seconds").notNull(),
  direction: text("direction", { enum: ["stt", "tts"] }).notNull(),
  modelId: text("model_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VoiceUsage = typeof voiceUsageTable.$inferSelect;
export type NewVoiceUsage = typeof voiceUsageTable.$inferInsert;
