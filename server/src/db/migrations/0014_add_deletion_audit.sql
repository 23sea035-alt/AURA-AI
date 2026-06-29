-- Content-free proof-of-erasure record (GDPR Art. 5(2) accountability). Written when a user's
-- data is hard-purged after the grace period; holds NO personal data or conversation content.
CREATE TABLE IF NOT EXISTS "deletion_audit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "clerk_user_id" text,
  "deleted_at" timestamp with time zone,
  "clerk_deleted" boolean NOT NULL DEFAULT false,
  "purged_at" timestamp with time zone NOT NULL DEFAULT now()
);
