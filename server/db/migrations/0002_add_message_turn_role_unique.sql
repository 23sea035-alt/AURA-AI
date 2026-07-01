ALTER TABLE "messages" ADD CONSTRAINT "uq_turn_id_role" UNIQUE("turn_id", "role");
