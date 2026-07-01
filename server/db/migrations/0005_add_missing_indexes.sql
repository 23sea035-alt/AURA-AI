-- Additional indexes for common query patterns

CREATE INDEX IF NOT EXISTS "idx_banned_identities_hash"
  ON "banned_identities" ("identifier_hash");

CREATE INDEX IF NOT EXISTS "idx_device_tokens_user"
  ON "device_tokens" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_memories_user_companion"
  ON "memories" ("user_id", "companion_id");
