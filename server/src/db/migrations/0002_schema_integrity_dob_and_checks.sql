ALTER TABLE "users" ALTER COLUMN "date_of_birth" SET DATA TYPE date USING "date_of_birth"::date;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_age_assurance_check" CHECK ("users"."age_assurance_method" in ('self_declared', 'apple_declared_age_range', 'third_party'));--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_category_check" CHECK ("memories"."category" in ('identity', 'preference', 'attribute', 'relationship', 'work', 'location', 'general'));--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_status_check" CHECK ("safety_events"."status" in ('open', 'reviewed', 'actioned', 'dismissed'));--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_action_check" CHECK ("safety_events"."action" is null or "safety_events"."action" in ('none', 'warned', 'suspended', 'banned'));--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tier_check" CHECK ("subscriptions"."tier" in ('free', 'premium'));--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_status_check" CHECK ("subscriptions"."status" in ('active', 'trialing', 'grace_period', 'billing_retry', 'expired', 'revoked'));--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_store_check" CHECK ("subscriptions"."store" in ('app_store', 'play_store', 'stripe'));--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_period_type_check" CHECK ("subscriptions"."period_type" is null or "subscriptions"."period_type" in ('normal', 'trial', 'intro'));--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_platform_check" CHECK ("device_tokens"."platform" in ('ios'));--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_environment_check" CHECK ("device_tokens"."environment" in ('production', 'sandbox'));--> statement-breakpoint
ALTER TABLE "banned_identities" ADD CONSTRAINT "banned_identities_type_check" CHECK ("banned_identities"."identifier_type" in ('email_hash', 'apple_sub_hash', 'google_sub_hash'));--> statement-breakpoint
ALTER TABLE "voice_usage" ADD CONSTRAINT "voice_usage_direction_check" CHECK ("voice_usage"."direction" in ('stt', 'tts'));