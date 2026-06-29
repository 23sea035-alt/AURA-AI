-- The composite UNIQUE was declared as a plain object literal in the schema, so drizzle-kit never
-- generated it — ban-evasion rows could duplicate, and ON CONFLICT on this pair would error.
ALTER TABLE "banned_identities"
  ADD CONSTRAINT "uq_identifier_type_hash" UNIQUE ("identifier_type", "identifier_hash");
