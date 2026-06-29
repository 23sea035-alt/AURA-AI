-- Add safety_skipped boolean column to memory_jobs for queryable crisis/blocked tracking
ALTER TABLE "memory_jobs" ADD COLUMN IF NOT EXISTS "safety_skipped" boolean NOT NULL DEFAULT false;
