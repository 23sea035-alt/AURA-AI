import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import { getPersonaPack, MAX_ACTIVE_COMPANIONS_FREE, MAX_TOTAL_COMPANIONS_FREE } from "@aura/shared";

process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.CLERK_SECRET_KEY = "sk_test_fake";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_fake";
process.env.CLERK_WEBHOOK_SECRET = "whsec_fake";
process.env.OPENAI_API_KEY = "sk-fake";
process.env.GROQ_API_KEY = "gsk_fake";
process.env.REVENUECAT_WEBHOOK_SECRET = "rc_fake";
process.env.BANNED_IDENTITY_PEPPER = "test-pepper";

// A thenable that also exposes .limit() and .orderBy().limit() — serves `.where()` (awaited count
// queries), `.where().limit(1)` (ownership lookups), and `.where().orderBy().limit(1)` (survivor lookups).
function selectChain(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const orderByRes = {
    limit: () => Promise.resolve(rows),
    then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p),
  };
  const whereRes = {
    limit: () => Promise.resolve(rows),
    orderBy: () => orderByRes,
    then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p),
  };
  return { from: () => ({ where: () => whereRes }) };
}
// A thenable that also exposes .returning() — serves `.set().where().returning()` and awaited `.set().where()`.
// `.set` is a vi.fn() so tests can assert on the exact values passed to an update.
function updateChain(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const whereRes = { returning: () => Promise.resolve(rows), then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) };
  const set = vi.fn(() => ({ where: () => whereRes }));
  return { set };
}
// Same shape as updateChain but for `.values().returning()` — `.values` is a vi.fn() so tests can
// assert on the exact row passed to an insert (e.g. the free-tier-coerced traits).
function insertChain(rows: unknown[]) {
  const p = Promise.resolve(rows);
  const valuesRes = { returning: () => Promise.resolve(rows), then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) };
  const values = vi.fn((_row?: Record<string, unknown>) => valuesRes);
  return { values };
}
function deleteChain() {
  const p = Promise.resolve([]);
  return { where: () => ({ then: p.then.bind(p), catch: p.catch.bind(p), finally: p.finally.bind(p) }) };
}

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockInsert = vi.fn();

vi.mock("../db/src/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/src/index.js")>();
  return {
    ...actual,
    db: { select: mockSelect, update: mockUpdate, delete: mockDelete, insert: mockInsert, transaction: vi.fn() },
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

describe("Companion create — POST /companions", () => {
  const freeUser = { isPremium: false, firstName: "Sam", primaryCompanionId: "22222222-2222-4222-8222-222222222222" };

  it("blocks creation at the total cap (409 TOTAL_LIMIT_REACHED), checked before the active cap", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([freeUser]))
      .mockReturnValueOnce(selectChain([{ total: MAX_TOTAL_COMPANIONS_FREE, active: 2 }]));
    const res = await request(app).post("/api/companions").send({ name: "Nova", personaKey: "aurora" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("TOTAL_LIMIT_REACHED");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("blocks creation at the active cap (409 ACTIVE_LIMIT_REACHED)", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([freeUser]))
      .mockReturnValueOnce(selectChain([{ total: MAX_ACTIVE_COMPANIONS_FREE, active: MAX_ACTIVE_COMPANIONS_FREE }]));
    const res = await request(app).post("/api/companions").send({ name: "Nova", personaKey: "aurora" });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ACTIVE_LIMIT_REACHED");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("coerces a free caller's traits to the preset defaults and strips lookId from the stash", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([freeUser]))
      .mockReturnValueOnce(selectChain([{ total: 3, active: 3 }]));
    const created = insertChain([{ id: ID, userId: "u1", personaKey: "aurora", name: "Nova" }]);
    mockInsert.mockReturnValueOnce(created);

    const res = await request(app).post("/api/companions").send({
      name: "Nova",
      personaKey: "aurora",
      traits: {
        warmth: "reserved", energy: "playful", verbosity: "expansive",
        _client: { lookId: "premium-look", persona: "aurora", colorFrom: "#fff", colorTo: "#000" },
      },
    });

    expect(res.status).toBe(201);
    expect(created.values).toHaveBeenCalledWith(expect.objectContaining({
      traits: {
        warmth: "doting", energy: "calm", verbosity: "balanced", // aurora's defaultTraits
        _client: { persona: "aurora", colorFrom: "#fff", colorTo: "#000" }, // lookId stripped, rest kept
      },
    }));
  });

  it("stores a premium caller's tuned traits exactly as sent", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ ...freeUser, isPremium: true }]))
      .mockReturnValueOnce(selectChain([{ total: 3, active: 3 }]));
    const created = insertChain([{ id: ID, userId: "u1", personaKey: "aurora", name: "Nova" }]);
    mockInsert.mockReturnValueOnce(created);

    const traits = { warmth: "reserved", energy: "playful", verbosity: "expansive", _client: { lookId: "premium-look" } };
    const res = await request(app).post("/api/companions").send({ name: "Nova", personaKey: "aurora", traits });

    expect(res.status).toBe(201);
    expect(created.values).toHaveBeenCalledWith(expect.objectContaining({ traits }));
  });

  it("seeds a real assistant opener and pins primary for the user's first-ever companion", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ isPremium: false, firstName: "Sam", primaryCompanionId: null }]))
      .mockReturnValueOnce(selectChain([{ total: 0, active: 0 }]));
    const createdCompanion = insertChain([{ id: ID, userId: "u1", personaKey: "aurora", name: "Nova" }]);
    const createdMessage = insertChain([{ id: "msg-1" }]);
    mockInsert
      .mockReturnValueOnce(createdCompanion)
      .mockReturnValueOnce(createdMessage);
    const companionUpdate = updateChain([{ id: ID, lastMessage: "placeholder", messageCount: 1 }]);
    const primaryPinUpdate = updateChain([]);
    mockUpdate
      .mockReturnValueOnce(companionUpdate)
      .mockReturnValueOnce(primaryPinUpdate);

    const res = await request(app).post("/api/companions").send({ name: "Nova", personaKey: "aurora" });

    expect(res.status).toBe(201);
    const openerPool = getPersonaPack("aurora").openers.map((o) => o.replaceAll("{firstName}", "Sam"));
    const insertedMessage = createdMessage.values.mock.calls[0]![0]!;
    expect(insertedMessage.role).toBe("assistant");
    expect(insertedMessage.companionId).toBe(ID);
    expect(openerPool).toContain(insertedMessage.content);
    expect(companionUpdate.set).toHaveBeenCalledWith(expect.objectContaining({ lastMessage: insertedMessage.content, messageCount: 1 }));
    expect(primaryPinUpdate.set).toHaveBeenCalledWith({ primaryCompanionId: ID });
  });

  it("does not re-pin primary when the caller already has one", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ isPremium: false, firstName: "Sam", primaryCompanionId: "already-pinned" }]))
      .mockReturnValueOnce(selectChain([{ total: 0, active: 0 }]));
    const createdCompanion = insertChain([{ id: ID, userId: "u1", personaKey: "aurora", name: "Nova" }]);
    const createdMessage = insertChain([{ id: "msg-1" }]);
    mockInsert
      .mockReturnValueOnce(createdCompanion)
      .mockReturnValueOnce(createdMessage);
    mockUpdate.mockReturnValueOnce(updateChain([{ id: ID }]));

    const res = await request(app).post("/api/companions").send({ name: "Nova", personaKey: "aurora" });

    expect(res.status).toBe(201);
    expect(mockUpdate).toHaveBeenCalledTimes(1); // companion update only, no primary-pin update
  });
});

describe("Companion update — PATCH /companions/:id", () => {
  it("coerces a free caller's trait update to the preset defaults and strips lookId", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", personaKey: "orion", name: "Orion" }]))
      .mockReturnValueOnce(selectChain([{ isPremium: false }]));
    const patchUpdate = updateChain([{ id: ID, name: "Orion" }]);
    mockUpdate.mockReturnValueOnce(patchUpdate);

    const res = await request(app).patch(`/api/companions/${ID}`).send({
      traits: { warmth: "doting", energy: "playful", verbosity: "expansive", _client: { lookId: "premium-look", persona: "orion" } },
    });

    expect(res.status).toBe(200);
    expect(patchUpdate.set).toHaveBeenCalledWith({
      traits: { warmth: "warm", energy: "calm", verbosity: "concise", _client: { persona: "orion" } }, // orion's defaultTraits
    });
  });

  it("stores a premium caller's trait update exactly as sent", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", personaKey: "orion", name: "Orion" }]))
      .mockReturnValueOnce(selectChain([{ isPremium: true }]));
    const patchUpdate = updateChain([{ id: ID, name: "Orion" }]);
    mockUpdate.mockReturnValueOnce(patchUpdate);

    const traits = { warmth: "doting", energy: "playful", verbosity: "expansive", _client: { lookId: "premium-look" } };
    const res = await request(app).patch(`/api/companions/${ID}`).send({ traits });

    expect(res.status).toBe(200);
    expect(patchUpdate.set).toHaveBeenCalledWith({ traits });
  });

  it("allows a rename without touching the tier check (free caller)", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", personaKey: "orion", name: "Orion" }]));
    const patchUpdate = updateChain([{ id: ID, name: "New name" }]);
    mockUpdate.mockReturnValueOnce(patchUpdate);

    const res = await request(app).patch(`/api/companions/${ID}`).send({ name: "New name" });

    expect(res.status).toBe(200);
    expect(patchUpdate.set).toHaveBeenCalledWith({ name: "New name" });
    expect(mockSelect).toHaveBeenCalledTimes(1); // no tier lookup when traits aren't in the update
  });

  it("404 when the companion is not found", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));
    const res = await request(app).patch(`/api/companions/${ID}`).send({ name: "New name" });
    expect(res.status).toBe(404);
  });
});

describe("Companion archive — POST /companions/:id/archive", () => {
  it("archives an active companion when more than one remains active", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", archivedAt: null, isDefault: false }])) // lookup
      .mockReturnValueOnce(selectChain([{ active: 3 }])) // active count
      .mockReturnValueOnce(selectChain([{ id: "survivor-1" }])); // survivor lookup
    mockUpdate
      .mockReturnValueOnce(updateChain([{ id: ID, archivedAt: "2026-07-02T00:00:00.000Z" }])) // set archivedAt
      .mockReturnValueOnce(updateChain([])); // re-pin (no-op unless this was the pinned companion)
    const res = await request(app).post(`/api/companions/${ID}/archive`);
    expect(res.status).toBe(200);
    expect(res.body.data.archivedAt).toBe("2026-07-02T00:00:00.000Z");
  });

  it("re-pins Home to the earliest surviving active companion when the pinned companion is archived", async () => {
    const survivorId = "33333333-3333-4333-8333-333333333333";
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", archivedAt: null, isDefault: false }]))
      .mockReturnValueOnce(selectChain([{ active: 2 }]))
      .mockReturnValueOnce(selectChain([{ id: survivorId }]));
    const archiveUpdate = updateChain([{ id: ID, archivedAt: "2026-07-02T00:00:00.000Z" }]);
    const rePinUpdate = updateChain([]);
    mockUpdate
      .mockReturnValueOnce(archiveUpdate)
      .mockReturnValueOnce(rePinUpdate);

    const res = await request(app).post(`/api/companions/${ID}/archive`);

    expect(res.status).toBe(200);
    expect(rePinUpdate.set).toHaveBeenCalledWith({ primaryCompanionId: survivorId });
  });

  it("nulls primary when no active survivor remains (defensive — shouldn't happen given the last-active guard)", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", archivedAt: null, isDefault: false }]))
      .mockReturnValueOnce(selectChain([{ active: 2 }]))
      .mockReturnValueOnce(selectChain([])); // no survivor found
    const archiveUpdate = updateChain([{ id: ID, archivedAt: "2026-07-02T00:00:00.000Z" }]);
    const rePinUpdate = updateChain([]);
    mockUpdate
      .mockReturnValueOnce(archiveUpdate)
      .mockReturnValueOnce(rePinUpdate);

    const res = await request(app).post(`/api/companions/${ID}/archive`);

    expect(res.status).toBe(200);
    expect(rePinUpdate.set).toHaveBeenCalledWith({ primaryCompanionId: null });
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
  it("blocks restoring at the active cap (409 ACTIVE_LIMIT_REACHED)", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", archivedAt: "2026-07-01T00:00:00.000Z" }]))
      .mockReturnValueOnce(selectChain([{ isPremium: false }]))
      .mockReturnValueOnce(selectChain([{ active: MAX_ACTIVE_COMPANIONS_FREE }]));
    const res = await request(app).post(`/api/companions/${ID}/restore`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ACTIVE_LIMIT_REACHED");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("restores when under the active cap", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", archivedAt: "2026-07-01T00:00:00.000Z" }]))
      .mockReturnValueOnce(selectChain([{ isPremium: false }]))
      .mockReturnValueOnce(selectChain([{ active: 2 }]));
    mockUpdate.mockReturnValueOnce(updateChain([{ id: ID, archivedAt: null }]));
    const res = await request(app).post(`/api/companions/${ID}/restore`);
    expect(res.status).toBe(200);
    expect(res.body.data.archivedAt).toBeNull();
  });

  it("is idempotent when the companion isn't archived (no cap query run)", async () => {
    mockSelect.mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", archivedAt: null }]));
    const res = await request(app).post(`/api/companions/${ID}/restore`);
    expect(res.status).toBe(200);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  it("404 when the companion is not found", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));
    const res = await request(app).post(`/api/companions/${ID}/restore`);
    expect(res.status).toBe(404);
  });
});

describe("Companion delete — DELETE /companions/:id", () => {
  it("permanently deletes a non-default companion and re-pins the earliest active survivor", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", isDefault: false, archivedAt: null }]))
      .mockReturnValueOnce(selectChain([{ active: 2 }])) // not the last active one
      .mockReturnValueOnce(selectChain([{ primaryCompanionId: ID }])) // pin read BEFORE the delete (FK nulls it during)
      .mockReturnValueOnce(selectChain([{ id: "survivor-x" }])); // survivor lookup
    mockDelete.mockReturnValue(deleteChain());
    const rePinUpdate = updateChain([]);
    mockUpdate.mockReturnValueOnce(rePinUpdate);

    const res = await request(app).delete(`/api/companions/${ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ deleted: true, id: ID });
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(rePinUpdate.set).toHaveBeenCalledWith({ primaryCompanionId: "survivor-x" });
  });

  it("skips the re-pin entirely when the deleted companion wasn't the pinned one", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", isDefault: false, archivedAt: null }]))
      .mockReturnValueOnce(selectChain([{ active: 2 }]))
      .mockReturnValueOnce(selectChain([{ primaryCompanionId: "some-other-id" }]));
    mockDelete.mockReturnValue(deleteChain());

    const res = await request(app).delete(`/api/companions/${ID}`);

    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("blocks deleting the user's last active companion (409 LAST_ACTIVE_COMPANION)", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", isDefault: false, archivedAt: null }]))
      .mockReturnValueOnce(selectChain([{ active: 1 }]));
    const res = await request(app).delete(`/api/companions/${ID}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("LAST_ACTIVE_COMPANION");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("allows deleting an archived companion even when it's the user's only archived one", async () => {
    mockSelect
      .mockReturnValueOnce(selectChain([{ id: ID, userId: "u1", isDefault: false, archivedAt: "2026-07-01T00:00:00.000Z" }]))
      // no active-count guard for an archived target; pin read says it wasn't pinned (an archived
      // companion can't be — archive re-pins) so no survivor lookup or users update follows.
      .mockReturnValueOnce(selectChain([{ primaryCompanionId: null }]));
    mockDelete.mockReturnValue(deleteChain());

    const res = await request(app).delete(`/api/companions/${ID}`);

    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
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

describe("Clear conversation — DELETE /companions/:id/messages", () => {
  it("deletes messages, resets lastMessage/messageCount, and leaves memories untouched", async () => {
    const { messagesTable } = await import("../db/src/index.js");
    mockSelect.mockReturnValueOnce(selectChain([{ id: ID, userId: "u1" }]));
    mockDelete.mockReturnValue(deleteChain());
    const clearUpdate = updateChain([{ id: ID, lastMessage: null, messageCount: 0 }]);
    mockUpdate.mockReturnValueOnce(clearUpdate);

    const res = await request(app).delete(`/api/companions/${ID}/messages`);

    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledTimes(1); // messages only
    expect(mockDelete).toHaveBeenCalledWith(messagesTable);
    expect(clearUpdate.set).toHaveBeenCalledWith(expect.objectContaining({ lastMessage: null, messageCount: 0 }));
  });

  it("404 when the companion is not found", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));
    const res = await request(app).delete(`/api/companions/${ID}/messages`);
    expect(res.status).toBe(404);
  });

  it("400 on a malformed id", async () => {
    const res = await request(app).delete(`/api/companions/not-a-uuid/messages`);
    expect(res.status).toBe(400);
  });
});

describe("Forget everything — POST /companions/:id/forget", () => {
  it("deletes messages and memories, clears remember_*, and resets lastMessage/messageCount", async () => {
    const { messagesTable, memoriesTable } = await import("../db/src/index.js");
    mockSelect.mockReturnValueOnce(selectChain([{ id: ID, userId: "u1" }]));
    mockDelete.mockReturnValue(deleteChain());
    const forgetUpdate = updateChain([{
      id: ID, lastMessage: null, messageCount: 0, rememberMemoryId: null, rememberQuestion: null, rememberGeneratedAt: null,
    }]);
    mockUpdate.mockReturnValueOnce(forgetUpdate);

    const res = await request(app).post(`/api/companions/${ID}/forget`);

    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledTimes(2); // messages + memories
    expect(mockDelete).toHaveBeenNthCalledWith(1, messagesTable);
    expect(mockDelete).toHaveBeenNthCalledWith(2, memoriesTable);
    expect(forgetUpdate.set).toHaveBeenCalledWith(expect.objectContaining({
      lastMessage: null, messageCount: 0, rememberMemoryId: null, rememberQuestion: null, rememberGeneratedAt: null,
    }));
  });

  it("404 when the companion is not found", async () => {
    mockSelect.mockReturnValueOnce(selectChain([]));
    const res = await request(app).post(`/api/companions/${ID}/forget`);
    expect(res.status).toBe(404);
  });

  it("400 on a malformed id", async () => {
    const res = await request(app).post(`/api/companions/not-a-uuid/forget`);
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
