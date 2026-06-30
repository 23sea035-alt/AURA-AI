import { pgTable, text, timestamp, uuid, unique, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const bannedIdentitiesTable = pgTable("banned_identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifierType: text("identifier_type").notNull(),
  identifierHash: text("identifier_hash").notNull(),
  reason: text("reason"),
  sourceUserId: uuid("source_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("uq_identifier_type_hash").on(table.identifierType, table.identifierHash),
  index("idx_banned_identities_hash").on(table.identifierHash),
]);

export type BannedIdentity = typeof bannedIdentitiesTable.$inferSelect;
export type NewBannedIdentity = typeof bannedIdentitiesTable.$inferInsert;
