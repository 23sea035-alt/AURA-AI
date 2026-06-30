import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export const voiceUsageTable = pgTable("voice_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  companionId: text("companion_id").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  direction: text("direction", { enum: ["stt", "tts"] }).notNull(),
  modelId: text("model_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VoiceUsage = typeof voiceUsageTable.$inferSelect;
export type NewVoiceUsage = typeof voiceUsageTable.$inferInsert;
