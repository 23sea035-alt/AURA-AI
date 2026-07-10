// B-7: migrations run on boot against the single production instance — a broken migration
// crash-loops it (index.ts exits 1, Render restarts, same failure repeats). This is the pre-deploy
// gate: every committed migration must apply cleanly to a fresh Postgres (PGlite = real PG engine),
// and re-running the migrator must be a no-op. CI runs this via `pnpm test`.
import { describe, it, expect, afterAll } from "vitest";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestDb, closeTestDb } from "./setup.js";

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../db/migrations");

// The core tables the app cannot boot without (schema drift here = guaranteed prod outage).
const CORE_TABLES = [
  "users", "companions", "messages", "memories", "memory_jobs",
  "safety_events", "banned_identities", "subscriptions",
];

describe("migrations — pre-deploy dry-run gate (PGlite)", () => {
  afterAll(closeTestDb);

  it("applies every committed migration to a fresh database", async () => {
    const db = await createTestDb(); // runs migrate() over MIGRATIONS_DIR internally
    const result = await db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public'`,
    );
    const tables = (result.rows as { table_name: string }[]).map((r) => r.table_name);
    for (const t of CORE_TABLES) expect(tables).toContain(t);
  });

  it("records every journal entry as applied (no silently skipped migration)", async () => {
    const db = await createTestDb();
    const journal = JSON.parse(readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"));
    const applied = await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    expect((applied.rows[0] as { n: number }).n).toBe(journal.entries.length);
  });

  it("re-running the migrator is a no-op (safe restart semantics)", async () => {
    const db = await createTestDb();
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR }); // second run must not throw
    const applied = await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    const journal = JSON.parse(readFileSync(path.join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"));
    expect((applied.rows[0] as { n: number }).n).toBe(journal.entries.length);
  });
});
