ALTER TABLE "safety_events" ADD COLUMN "content_tier" text DEFAULT 'T2' NOT NULL;--> statement-breakpoint
ALTER TABLE "safety_events" ADD COLUMN "legal_hold" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_content_tier_check" CHECK ("safety_events"."content_tier" in ('T1', 'T2', 'T3'));