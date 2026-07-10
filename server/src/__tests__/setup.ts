import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";

let _client: PGlite | null = null;

export async function createTestDb() {
  if (_client) return drizzle(_client!);

  _client = new PGlite();
  const db = drizzle(_client!);

  // server/src/__tests__/ → server/src/db/migrations (the real committed migrations; "../../"
  // pointed at a nonexistent server/db/migrations and made this helper dead-on-arrival — B-7).
  const migrationsDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../db/migrations",
  );

  await migrate(db, { migrationsFolder: migrationsDir });

  return db;
}

export async function closeTestDb() {
  if (_client) {
    await _client.close();
    _client = null;
  }
}

export const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
export const TEST_COMPANION_ID = "00000000-0000-0000-0000-000000000002";
export const TEST_CLERK_USER_ID = "clerk_test_user_001";
