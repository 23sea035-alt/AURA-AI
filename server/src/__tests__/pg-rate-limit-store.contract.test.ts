process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = "sk_test_fake";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fake";
process.env.CLERK_WEBHOOK_SECRET = "whsec_fake";
process.env.OPENAI_API_KEY = "sk-fake";
process.env.GROQ_API_KEY = "gsk_fake";
process.env.REVENUECAT_WEBHOOK_SECRET = "rc_fake";
process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

// Self-contained PGlite (only the rate_limits table this store needs) so the test is independent
// of the full migration chain. PgRateLimitStore is imported dynamically AFTER the env above —
// it transitively loads the real db module, which throws if DATABASE_URL is unset (static imports
// hoist above the env assignments).
type PgRateLimitStoreType = typeof import("../middleware/pg-rate-limit-store.js").PgRateLimitStore;

let client: InstanceType<typeof PGlite>;
let db: ReturnType<typeof drizzle>;
let PgRateLimitStore: PgRateLimitStoreType;

beforeAll(async () => {
  client = new PGlite();
  db = drizzle(client);
  await db.execute(sql`
    CREATE TABLE rate_limits (
      key text PRIMARY KEY,
      count integer NOT NULL DEFAULT 0,
      expires_at timestamp with time zone NOT NULL
    )
  `);
  ({ PgRateLimitStore } = await import("../middleware/pg-rate-limit-store.js"));
});
afterAll(async () => {
  await client.close();
});

// The store defaults to a 60s window, so these tests do not need to call init().
describe("PgRateLimitStore — contract (durable, shared counters)", () => {
  it("increments totalHits per key and isolates distinct keys", async () => {
    const store = new PgRateLimitStore("t1", db);

    expect((await store.increment("user-a")).totalHits).toBe(1);
    expect((await store.increment("user-a")).totalHits).toBe(2);
    // Separate key → separate counter.
    expect((await store.increment("user-b")).totalHits).toBe(1);
  });

  it("resets the counter once the window has expired", async () => {
    const store = new PgRateLimitStore("t2", db);
    await store.increment("u");
    await store.increment("u"); // count = 2

    // Force the window into the past, then the next hit must restart at 1.
    await db.execute(sql`UPDATE rate_limits SET expires_at = NOW() - make_interval(secs => 10) WHERE key = 't2:u'`);
    expect((await store.increment("u")).totalHits).toBe(1);
  });

  it("decrement and resetKey adjust the counter", async () => {
    const store = new PgRateLimitStore("t3", db);
    await store.increment("u");
    await store.increment("u"); // 2
    await store.decrement("u"); // 1
    expect((await store.increment("u")).totalHits).toBe(2);

    await store.resetKey("u");
    expect((await store.increment("u")).totalHits).toBe(1);
  });

  it("the same key under different prefixes does not collide", async () => {
    const minute = new PgRateLimitStore("chat-min", db);
    const day = new PgRateLimitStore("chat-day", db);
    await minute.increment("shared-user");
    await minute.increment("shared-user");
    // Different prefix → independent counter starting at 1.
    expect((await day.increment("shared-user")).totalHits).toBe(1);
  });
});
