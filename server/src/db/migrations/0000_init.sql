-- Consolidated baseline (v1.0). Squashes the prior 0000–0015 incremental migrations into a
-- single final-state schema, plus the redesign deferred fields:
--   users.avatar_color, users.primary_companion_id, companions.remember_* (Home "remembers" cache).
-- Tables are created first, then FKs/uniques/checks/indexes, so circular FKs resolve.

CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"date_of_birth" text,
	"age_assurance_method" text DEFAULT 'self_declared' NOT NULL,
	"age_verified" boolean DEFAULT false NOT NULL,
	"age_verified_at" timestamp with time zone,
	"is_minor" boolean DEFAULT false NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"onboarding_done" boolean DEFAULT false NOT NULL,
	"ai_disclosure_accepted" boolean DEFAULT false NOT NULL,
	"tos_accepted_version" text,
	"tos_accepted_at" timestamp with time zone,
	"stripe_customer_id" text,
	"avatar_color" text,
	"primary_companion_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "companions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"persona_key" text NOT NULL,
	"name" text NOT NULL,
	"traits" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"last_message" text,
	"last_active_at" timestamp with time zone,
	"message_count" integer DEFAULT 0 NOT NULL,
	"remember_memory_id" uuid,
	"remember_question" text,
	"remember_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"turn_id" uuid NOT NULL,
	"companion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'complete' NOT NULL,
	"content" text NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"companion_id" uuid NOT NULL,
	"content" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"importance" real DEFAULT 0.5 NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"source_message_id" uuid,
	"last_recalled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"companion_id" uuid,
	"message_id" uuid,
	"event_type" text NOT NULL,
	"source" text NOT NULL,
	"category" text,
	"model" text,
	"severity" text DEFAULT 'info' NOT NULL,
	"detail" text,
	"flagged_content" text,
	"status" text DEFAULT 'open' NOT NULL,
	"action" text,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"tier" text DEFAULT 'premium' NOT NULL,
	"status" text NOT NULL,
	"store" text NOT NULL,
	"product_id" text,
	"entitlement" text,
	"original_transaction_id" text,
	"rc_app_user_id" text,
	"period_type" text,
	"will_renew" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"last_event_timestamp_ms" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"environment" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "banned_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier_type" text NOT NULL,
	"identifier_hash" text NOT NULL,
	"reason" text,
	"source_user_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_identifier_type_hash" UNIQUE("identifier_type","identifier_hash")
);
--> statement-breakpoint
CREATE TABLE "memory_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"companion_id" uuid NOT NULL,
	"raw_content" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"safety_skipped" boolean DEFAULT false NOT NULL,
	"result" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deletion_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"clerk_user_id" text,
	"deleted_at" timestamp with time zone,
	"clerk_deleted" boolean DEFAULT false NOT NULL,
	"purged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "voice_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"companion_id" uuid NOT NULL,
	"duration_seconds" integer NOT NULL,
	"direction" text NOT NULL,
	"model_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companions" ADD CONSTRAINT "companions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companions" ADD CONSTRAINT "companions_remember_memory_id_memories_id_fk" FOREIGN KEY ("remember_memory_id") REFERENCES "public"."memories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_primary_companion_id_companions_id_fk" FOREIGN KEY ("primary_companion_id") REFERENCES "public"."companions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "public"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "public"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "public"."companions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banned_identities" ADD CONSTRAINT "banned_identities_source_user_id_users_id_fk" FOREIGN KEY ("source_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_jobs" ADD CONSTRAINT "memory_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_jobs" ADD CONSTRAINT "memory_jobs_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "public"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_usage" ADD CONSTRAINT "voice_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_usage" ADD CONSTRAINT "voice_usage_companion_id_companions_id_fk" FOREIGN KEY ("companion_id") REFERENCES "public"."companions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "uq_turn_id_role" UNIQUE("turn_id","role");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_status_check" CHECK ("status" IN ('active', 'suspended', 'banned', 'deleted'));--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_role_check" CHECK ("role" IN ('user', 'assistant'));--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_status_check" CHECK ("status" IN ('pending', 'complete', 'failed', 'blocked'));--> statement-breakpoint
ALTER TABLE "companions" ADD CONSTRAINT "companions_persona_key_check" CHECK ("persona_key" IN ('aurora', 'orion', 'lyra'));--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_event_type_check" CHECK ("event_type" IN ('input_blocked', 'output_blocked', 'crisis_detected', 'injection_detected', 'user_reported'));--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_source_check" CHECK ("source" IN ('input', 'output', 'injection', 'user_report'));--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_severity_check" CHECK ("severity" IN ('info', 'warning', 'critical'));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_user_companion_created" ON "messages" ("user_id","companion_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_messages_user_created" ON "messages" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_safety_events_user" ON "safety_events" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_companions_user" ON "companions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user" ON "subscriptions" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_memory_jobs_status" ON "memory_jobs" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_banned_identities_hash" ON "banned_identities" ("identifier_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_device_tokens_user" ON "device_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_memories_user_companion" ON "memories" ("user_id","companion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rate_limits_expires_at" ON "rate_limits" ("expires_at");
