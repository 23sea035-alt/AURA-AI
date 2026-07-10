import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import express, { type Express } from "express";

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = "sk_test_fake";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fake";
process.env.CLERK_WEBHOOK_SECRET = "whsec_fake";
process.env.OPENAI_API_KEY = "sk-fake";
process.env.GROQ_API_KEY = "gsk_fake";
process.env.REVENUECAT_WEBHOOK_SECRET = "rc_fake";
process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

// ── DB mock helpers (same pattern as routes.integration.test.ts) ─────
const mockSelect = vi.fn();
const mockDelete = vi.fn();

function selectResolving(rows: unknown[]) {
  return {
    from: () => ({
      where: () => ({ limit: () => Promise.resolve(rows), orderBy: () => Promise.resolve(rows) }),
      orderBy: () => Promise.resolve(rows),
    }),
  };
}

function deleteResolving(rows: unknown[]) {
  return { where: () => ({ returning: () => Promise.resolve(rows) }) };
}

vi.mock("../db/src/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/src/index.js")>();
  return {
    ...actual,
    db: {
      select: mockSelect,
      delete: mockDelete,
      insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn() })) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn() })) })) })),
      transaction: vi.fn(),
    },
  };
});

vi.mock("../services/auth/clerk.middleware.js", () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = "u1"; req.clerkUserId = "clerk_u1"; next(); },
  requireAuthAllowDeleted: (req: any, _res: any, next: any) => { req.userId = "u1"; req.clerkUserId = "clerk_u1"; next(); },
  optionalAuth: (_req: any, _res: any, next: any) => { next(); },
}));

vi.mock("../lib/logger.js", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

let app: Express;

beforeAll(async () => {
  const { default: router } = await import("../routes/index.js");
  app = express();
  app.use(express.json());
  app.use("/api", router);
});

beforeEach(() => { vi.clearAllMocks(); });

afterAll(() => { vi.restoreAllMocks(); });

// ── HTTP response contract tests ─────────────────────────────────────
describe("Remember — HTTP contract", () => {
  it("GET /api/companions returns null remember fields when not cached", async () => {
    mockSelect.mockReturnValue(selectResolving([
      { id: "c1", userId: "u1", name: "Aurora", personaKey: "aurora", traits: {}, isDefault: false, messageCount: 0, rememberQuestion: null, rememberMemoryId: null, rememberGeneratedAt: null },
    ]));
    const res = await request(app).get("/api/companions");
    expect(res.status).toBe(200);
    expect(res.body.data[0].rememberQuestion).toBeNull();
    expect(res.body.data[0].rememberMemoryId).toBeNull();
    expect(res.body.data[0].rememberGeneratedAt).toBeNull();
  });

  it("GET /api/companions returns populated remember fields when cached", async () => {
    mockSelect.mockReturnValue(selectResolving([
      { id: "c2", userId: "u1", name: "Aurora", personaKey: "aurora", traits: {}, isDefault: false, messageCount: 5, rememberQuestion: "How's the new job going?", rememberMemoryId: "m1", rememberGeneratedAt: "2026-07-01T12:00:00.000Z" },
    ]));
    const res = await request(app).get("/api/companions");
    expect(res.status).toBe(200);
    expect(res.body.data[0].rememberQuestion).toBe("How's the new job going?");
    expect(res.body.data[0].rememberMemoryId).toBe("m1");
    expect(res.body.data[0].rememberGeneratedAt).toBe("2026-07-01T12:00:00.000Z");
  });
});

// ── FK ON DELETE SET NULL (PGlite contract) ──────────────────────────
describe("Remember — FK ON DELETE SET NULL (PGlite)", () => {
  let client: any;

  beforeAll(async () => {
    const { PGlite } = await import("@electric-sql/pglite");

    client = new (PGlite as any)();

    // Create minimal tables with the FK constraint needed for this test.
    // Must use client.exec() (not drizzle execute) because PGlite cannot
    // prepare multiple statements in a single query.  Use text IDs with
    // manual generation to keep the test simple.
    await client.exec(`
      CREATE TABLE users (
        id text PRIMARY KEY,
        clerk_user_id text NOT NULL,
        email text NOT NULL,
        first_name text NOT NULL DEFAULT '',
        last_name text NOT NULL DEFAULT '',
        date_of_birth text NOT NULL DEFAULT '2000-01-01',
        status text NOT NULL DEFAULT 'active',
        role text NOT NULL DEFAULT 'user',
        is_premium boolean NOT NULL DEFAULT false,
        is_minor boolean NOT NULL DEFAULT false,
        age_verified boolean NOT NULL DEFAULT false,
        onboarding_done boolean NOT NULL DEFAULT true,
        ai_disclosure_accepted boolean NOT NULL DEFAULT true,
        avatar_color text,
        primary_companion_id text,
        created_at timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_at timestamp with time zone NOT NULL DEFAULT NOW()
      );
      CREATE TABLE memories (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        companion_id text NOT NULL,
        content text NOT NULL,
        category text NOT NULL,
        importance real NOT NULL DEFAULT 0.5,
        created_at timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_at timestamp with time zone NOT NULL DEFAULT NOW()
      );
      CREATE TABLE companions (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        persona_key text NOT NULL,
        name text NOT NULL,
        traits jsonb NOT NULL DEFAULT '{}',
        is_default boolean NOT NULL DEFAULT false,
        last_message text,
        last_active_at timestamp with time zone,
        message_count integer NOT NULL DEFAULT 0,
        remember_memory_id text REFERENCES memories(id) ON DELETE SET NULL,
        remember_question text,
        remember_generated_at timestamp with time zone,
        created_at timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_at timestamp with time zone NOT NULL DEFAULT NOW()
      );
    `);
  });

  afterAll(async () => {
    if (client) await client.close();
  });

  it("DELETE on a referenced memory nulls the companion's rememberMemoryId", async () => {
    // Insert a user and capture the generated UUID
    const userResult = await client.query(`INSERT INTO users (id, clerk_user_id, email, first_name, last_name, date_of_birth, status, role) VALUES ('u-remember', 'clerk-remember', 'r@t.co', 'R', 'T', '2000-01-01', 'active', 'user') RETURNING id`);
    const userId = userResult.rows[0].id;

    // Insert a memory
    const memResult = await client.query(`INSERT INTO memories (id, user_id, companion_id, content, category, importance) VALUES ('mem-remember', $1, $1, 'test', 'preference', 0.8) RETURNING id`, [userId]);
    const memId = memResult.rows[0].id;

    // Insert a companion with rememberMemoryId pointing at the memory
    await client.query(`INSERT INTO companions (id, user_id, persona_key, name, traits, remember_memory_id, remember_question, remember_generated_at) VALUES ('c-remember', $1, 'aurora', 'Aurora', '{}', $2, 'How is it going?', NOW())`, [userId, memId]);

    // Verify the FK is set
    const before = await client.query(`SELECT remember_memory_id, remember_question FROM companions WHERE id = 'c-remember'`);
    expect(before.rows[0].remember_memory_id).toBe(memId);

    // Delete the memory — FK ON DELETE SET NULL should fire
    await client.query(`DELETE FROM memories WHERE id = $1`, [memId]);

    // Verify the companion's rememberMemoryId is now null
    const after = await client.query(`SELECT remember_memory_id, remember_question FROM companions WHERE id = 'c-remember'`);
    expect(after.rows[0].remember_memory_id).toBeNull();
    // Other remember fields remain (only the FK is set null)
    expect(after.rows[0].remember_question).toBe("How is it going?");
  });
});
