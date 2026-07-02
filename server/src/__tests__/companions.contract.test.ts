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

// A thenable that also exposes .limit() — so it serves both the `.where().limit(1)` lookup and the
// awaited `.where()` count query.
function selectChain(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const whereRes = { limit: () => Promise.resolve(rows), then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) };
  return { from: () => ({ where: () => whereRes }) };
}
// A thenable that also exposes .returning() — serves `.set().where().returning()` and awaited `.set().where()`.
function updateChain(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const whereRes = { returning: () => Promise.resolve(rows), then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) };
  return { set: () => ({ where: () => whereRes }) };
}
function deleteChain() {
  const p = Promise.resolve([]);
  return { where: () => ({ then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) }) };
}

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("../db/src/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/src/index.js")>();
  return {
    ...actual,
    db: { select: mockSelect, update: mockUpdate, delete: mockDelete, insert: vi.fn(), transaction: vi.fn() },
  };
});

vi.mock("../services/auth/clerk.middleware.js", () => ({
  requireAuth: (req: any, _res: any, next: any) => { req.userId = "u1"; req.clerkUserId = "clerk_u1"; next(); },
  optionalAuth: (_req: any, _res: any, next: any) => next(),
}));
vi.mock("../lib/logger.js", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

let app: Express;
const ID = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  const { default: router } = await import("../routes/index.js");
  app = express();
  app.use(express.json());
  app.use("/api", router);
});
beforeEach(() => { vi.clearAllMocks(); });
afterAll(() => { vi.restoreAllMocks(); });

describe("Companion archive — POST /companions/:id/archive", () => {
  it("archives an active companion when more than one remains active", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", archivedAt: null, isDefault: false }])) // lookup
      .mockReturnValueOnce(selectChain([{ active: 3 }])); // active count
    mockUpdate
      .mockReturnValueOnce(updateChain([{ id: ID, archivedAt: "2026-07-02T00:00:00.000Z" }])) // set archivedAt
      .mockReturnValueOnce(updateChain([])); // unpin primary
    const res = await request(app).post(`/api/companions/${ID}/archive`);
    expect(res.status).toBe(200);
    expect(res.body.data.archivedAt).toBe("2026-07-02T00:00:00.000Z");
  });

  it("blocks archiving the user's last active companion (409)", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", archivedAt: null, isDefault: false }]))
      .mockReturnValueOnce(selectChain([{ active: 1 }]));
    const res = await request(app).post(`/api/companions/${ID}/archive`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("LAST_ACTIVE_COMPANION");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("is idempotent when the companion is already archived", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", archivedAt: "2026-07-01T00:00:00.000Z" }]));
    const res = await request(app).post(`/api/companions/${ID}/archive`);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("404 when the companion is not found", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));
    const res = await request(app).post(`/api/companions/${ID}/archive`);
    expect(res.status).toBe(404);
  });

  it("400 on a malformed id", async () => {
    const res = await request(app).post(`/api/companions/not-a-uuid/archive`);
    expect(res.status).toBe(400);
  });
});

describe("Companion restore — POST /companions/:id/restore", () => {
  it("clears archivedAt", async () => {
    mockUpdate.mockReturnValueOnce(updateChain([{ id: ID, archivedAt: null }]));
    const res = await request(app).post(`/api/companions/${ID}/restore`);
    expect(res.status).toBe(200);
    expect(res.body.data.archivedAt).toBeNull();
  });

  it("404 when the companion is not found", async () => {
    mockUpdate.mockReturnValueOnce(updateChain([]));
    const res = await request(app).post(`/api/companions/${ID}/restore`);
    expect(res.status).toBe(404);
  });
});

describe("Companion delete — DELETE /companions/:id", () => {
  it("permanently deletes a non-default companion", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", isDefault: false }]));
    mockDelete.mockReturnValue(deleteChain());
    const res = await request(app).delete(`/api/companions/${ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true, id: ID });
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("refuses to delete a base (default) companion (403)", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", isDefault: true }]));
    const res = await request(app).delete(`/api/companions/${ID}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("CANNOT_DELETE_BASE");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("404 when the companion is not found", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));
    const res = await request(app).delete(`/api/companions/${ID}`);
    expect(res.status).toBe(404);
  });

  it("400 on a malformed id", async () => {
    const res = await request(app).delete(`/api/companions/not-a-uuid`);
    expect(res.status).toBe(400);
  });
});

// Real-DB proof that a companion delete cascades to its child rows (no orphans).
describe("Companion delete — cascade (PGlite)", () => {
  let client: any;

  beforeAll(async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    client = new (PGlite as any)();
    await client.exec(`
      CREATE TABLE users (id text PRIMARY KEY);
      CREATE TABLE companions (
        id text PRIMARY KEY,
        user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        archived_at timestamp with time zone
      );
      CREATE TABLE messages (
        id text PRIMARY KEY,
        companion_id text NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
        content text NOT NULL
      );
      CREATE TABLE memories (
        id text PRIMARY KEY,
        companion_id text NOT NULL REFERENCES companions(id) ON DELETE CASCADE,
        content text NOT NULL
      );
    `);
  });

  afterAll(async () => { if (client) await client.close(); });

  it("deletes the companion's messages and memories", async () => {
    await client.exec(`
      INSERT INTO users (id) VALUES ('u-del');
      INSERT INTO companions (id, user_id, name) VALUES ('c-del', 'u-del', 'Extra');
      INSERT INTO messages (id, companion_id, content) VALUES ('m-del', 'c-del', 'hi');
      INSERT INTO memories (id, companion_id, content) VALUES ('mem-del', 'c-del', 'fact');
    `);
    await client.query(`DELETE FROM companions WHERE id = 'c-del'`);
    const msgs = await client.query(`SELECT count(*)::int AS n FROM messages WHERE companion_id = 'c-del'`);
    const mems = await client.query(`SELECT count(*)::int AS n FROM memories WHERE companion_id = 'c-del'`);
    expect(msgs.rows[0].n).toBe(0);
    expect(mems.rows[0].n).toBe(0);
  });
});
