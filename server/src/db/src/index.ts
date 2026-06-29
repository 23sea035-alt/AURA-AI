import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Pool sizing + timeouts so the API degrades gracefully under load instead of cascading:
// - `max` caps connections (keep at/under Neon's ceiling; use Neon's POOLED connection string in prod).
// - `connectionTimeoutMillis` makes a request waiting for a free connection fail fast rather than hang.
// - `statement_timeout` aborts a single runaway query so it can't pin a connection indefinitely.
//   (Deliberately NOT setting idle_in_transaction_session_timeout: the chat turn still spans LLM
//   calls inside its transaction, and a low idle-in-tx timeout would kill in-flight turns.)
const POOL_MAX = Number(process.env.PG_POOL_MAX ?? 10);
const STATEMENT_TIMEOUT_MS = Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? 15_000);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_MAX,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: STATEMENT_TIMEOUT_MS,
});
export const db = drizzle(pool, { schema });

// Accepts either the root db handle or a transaction handle — for helpers that
// run inside or outside a db.transaction().
export type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export * from "./schema";
