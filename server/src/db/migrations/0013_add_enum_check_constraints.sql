-- DB-level CHECK constraints for the safety-critical enum columns (the schema spec mandates
-- text + CHECK, but none existed). Values mirror @aura/shared. Belt-and-suspenders behind the
-- Zod boundary so an invalid status/role/severity can never be written directly.
ALTER TABLE "users"
  ADD CONSTRAINT "users_status_check" CHECK ("status" IN ('active', 'suspended', 'banned', 'deleted'));

ALTER TABLE "messages"
  ADD CONSTRAINT "messages_role_check" CHECK ("role" IN ('user', 'assistant'));
ALTER TABLE "messages"
  ADD CONSTRAINT "messages_status_check" CHECK ("status" IN ('pending', 'complete', 'failed', 'blocked'));

ALTER TABLE "companions"
  ADD CONSTRAINT "companions_persona_key_check" CHECK ("persona_key" IN ('aurora', 'orion', 'lyra'));

ALTER TABLE "safety_events"
  ADD CONSTRAINT "safety_events_event_type_check" CHECK ("event_type" IN ('input_blocked', 'output_blocked', 'crisis_detected', 'injection_detected', 'user_reported'));
ALTER TABLE "safety_events"
  ADD CONSTRAINT "safety_events_source_check" CHECK ("source" IN ('input', 'output', 'injection', 'user_report'));
ALTER TABLE "safety_events"
  ADD CONSTRAINT "safety_events_severity_check" CHECK ("severity" IN ('info', 'warning', 'critical'));
