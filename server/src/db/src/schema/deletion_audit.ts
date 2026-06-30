import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";

// Content-free proof-of-erasure record (GDPR Art. 5(2)). Written via raw SQL in retention.ts when a
// user is hard-purged. Intentionally has NO foreign key on user_id: the record must outlive the user
// it refers to. Modeled here so the Drizzle schema is the complete source of truth for generate.
export const deletionAuditTable = pgTable("deletion_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  clerkUserId: text("clerk_user_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  clerkDeleted: boolean("clerk_deleted").notNull().default(false),
  purgedAt: timestamp("purged_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DeletionAudit = typeof deletionAuditTable.$inferSelect;
export type NewDeletionAudit = typeof deletionAuditTable.$inferInsert;
