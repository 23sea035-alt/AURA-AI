-- Add role column (synced from Clerk public_metadata)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'user';

-- Migrate existing admin users
UPDATE "users" SET "role" = 'admin' WHERE "is_admin" = true;
