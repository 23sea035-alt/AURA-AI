// Dev-only: re-baseline the Neon DEV database to the single 0000_init migration.
//
//   Inventory (read-only, default):  node --env-file=.env server/scripts/db-reset.mjs
//   DESTRUCTIVE reset:               node --env-file=.env server/scripts/db-reset.mjs --confirm
//
// --confirm drops the public + drizzle schemas and re-applies migrations from scratch.
// Never run against a database with data you want to keep. Prints only the host, never creds.
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set. Run with: node --env-file=.env server/scripts/db-reset.mjs");
  process.exit(1);
}

const host = (() => { try { return new URL(url).host; } catch { return "(unparseable)"; } })();
const confirm = process.argv.includes("--confirm");
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 1 });

async function inventory(label) {
  const schemas = await pool.query(
    `select schema_name from information_schema.schemata
     where schema_name not in ('pg_catalog','information_schema','pg_toast') order by 1`,
  );
  const tables = await pool.query(
    `select schemaname, tablename from pg_tables
     where schemaname not in ('pg_catalog','information_schema') order by 1,2`,
  );
  let ledger = "(no __drizzle_migrations found)";
  for (const sch of ["drizzle", "public"]) {
    try {
      const r = await pool.query(`select count(*)::int n, max(created_at) last from ${sch}.__drizzle_migrations`);
      ledger = `${sch}.__drizzle_migrations -> ${r.rows[0].n} row(s), last applied @ ${r.rows[0].last}`;
      break;
    } catch { /* table not in this schema */ }
  }
  console.log(`\n========== ${label}  (host=${host}) ==========`);
  console.log(`schemas: ${schemas.rows.map(r => r.schema_name).join(", ")}`);
  console.log(`tables (${tables.rowCount}):`);
  console.log(tables.rows.map(r => `  ${r.schemaname}.${r.tablename}`).join("\n") || "  (none)");
  console.log(`migration ledger: ${ledger}`);
}

try {
  await inventory("BEFORE");
  if (!confirm) {
    console.log("\n[dry-run] Read-only. No changes made. Re-run with --confirm to DROP + re-migrate.");
    process.exit(0);
  }
  console.log("\n[reset] DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA drizzle CASCADE ...");
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE");
  await pool.query("CREATE SCHEMA public");
  await pool.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
  const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/db/migrations");
  console.log(`[reset] Applying migrations from ${migrationsFolder} ...`);
  await migrate(drizzle(pool), { migrationsFolder });
  await inventory("AFTER");
  console.log("\n[done] Dev DB re-baselined to 0000_init.");
} catch (err) {
  console.error("\n[error]", err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
