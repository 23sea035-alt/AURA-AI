-- Track when the worker claims a job so the stale-job reaper can requeue jobs that an instance
-- claimed (status -> 'processing') but never finished (e.g. crashed mid-consolidation).
ALTER TABLE "memory_jobs" ADD COLUMN IF NOT EXISTS "claimed_at" timestamp with time zone;
