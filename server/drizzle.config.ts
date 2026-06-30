import { defineConfig } from "drizzle-kit";

// Generate-only authoring aid: `pnpm --filter @aura/server exec drizzle-kit generate` drafts a
// migration from the Drizzle schema. The schema is the complete source of truth (all tables, FKs,
// CHECKs, UNIQUEs, indexes are modeled), so generated SQL is reviewable, then committed and applied
// by runtime migrate(). Do NOT use `drizzle-kit push` against a real DB — it has no history and can
// drop data; we baseline + apply via versioned migrations only.
export default defineConfig({
  schema: "./src/db/src/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
