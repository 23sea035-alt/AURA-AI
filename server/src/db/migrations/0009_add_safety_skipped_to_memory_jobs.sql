-- Add safety_skipped so crisis/blocked memory jobs are queryable for safety auditing.
-- Set by the consolidation safety pre-check (services/memory/consolidation.ts) when a job
-- is skipped for crisis content. Distinct from `attempts` (bounded retry of transiently
-- failed jobs) — both columns coexist.
ALTER TABLE "memory_jobs" ADD COLUMN IF NOT EXISTS "safety_skipped" boolean NOT NULL DEFAULT false;
