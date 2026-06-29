-- Durable, shared rate-limit counters so per-minute / daily-cap / brute-force limits hold across
-- process restarts AND multiple API instances (the in-memory default store does neither).
CREATE TABLE IF NOT EXISTS "rate_limits" (
  "key" text PRIMARY KEY,
  "count" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_rate_limits_expires_at" ON "rate_limits" ("expires_at");
