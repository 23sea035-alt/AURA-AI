-- Indexes for common query patterns

CREATE INDEX IF NOT EXISTS "idx_messages_user_companion_created"
  ON "messages" ("user_id", "companion_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_messages_user_created"
  ON "messages" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "idx_safety_events_user"
  ON "safety_events" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_companions_user"
  ON "companions" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_subscriptions_user"
  ON "subscriptions" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_memory_jobs_status"
  ON "memory_jobs" ("status");
