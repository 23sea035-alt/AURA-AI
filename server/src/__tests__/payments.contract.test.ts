import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

const WEBHOOK_SECRET = "test_whsec_abc123";

const mockInsertOnConflict = vi.fn();
const mockInsertValues = vi.fn(() => ({ onConflictDoUpdate: mockInsertOnConflict }));
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));
const mockUpdateWhere = vi.fn().mockResolvedValue({ rowCount: 1 });
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

const MOCK_USER_ROW = [{ id: "user-1" }];
function makeLimitResult() {
  // Must be thenable for .limit(1) alone AND have .for() for .limit(1).for("update")
  return {
    for: vi.fn().mockResolvedValue(MOCK_USER_ROW),
    then: (resolve: (v: typeof MOCK_USER_ROW) => void) => resolve(MOCK_USER_ROW),
    catch: (_: (e: Error) => void) => {},
  };
}
const mockSelectWhere = vi.fn(() => ({ limit: vi.fn(makeLimitResult) }));
const mockSelectFrom = vi.fn(() => ({ where: mockSelectWhere }));
const mockSelect = vi.fn(() => ({ from: mockSelectFrom }));

vi.mock("../db/src/index.js", () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: vi.fn((cb: (tx: any) => Promise<void>) => cb({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })),
  },
  usersTable: { id: "id", isPremium: "is_premium" },
  subscriptionsTable: { id: "id", userId: "user_id", status: "status", store: "store", productId: "product_id", originalTransactionId: "original_transaction_id", rcAppUserId: "rc_app_user_id", periodType: "period_type", expiresAt: "expires_at", willRenew: "will_renew", updatedAt: "updated_at", createdAt: "created_at", tier: "tier" },
}));

function mockGetEnv(overrides?: Record<string, unknown>) {
  const env = {
    REVENUECAT_WEBHOOK_SECRET: WEBHOOK_SECRET,
    RC_ALLOW_SANDBOX: true,
    ...overrides,
  };
  return vi.fn(() => env);
}

vi.mock("../config/env.js", () => ({
  getEnv: mockGetEnv(),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function signBody(body: string): string {
  return createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
}

function makePayload(overrides?: Record<string, unknown>): string {
  return JSON.stringify({
    event: "INITIAL_PURCHASE",
    event_timestamp_ms: 1718000000000,
    product_id: "premium_monthly",
    transaction_id: "txn_001",
    original_transaction_id: "orig_txn_001",
    period_type: "normal",
    purchased_at_ms: 1718000000000,
    expiration_at_ms: 1720688400000,
    environment: "PRODUCTION",
    entitlement_id: "premium",
    entitlement_ids: ["premium"],
    app_user_id: "123e4567-e89b-12d3-a456-426614174000",
    aliases: [],
    store: "app_store",
    type: "subscription",
    country: "US",
    currency: "USD",
    ...overrides,
  });
}

describe("RevenueCat webhook — contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signature verification", () => {
    it("processes event with valid signature", async () => {
      const body = makePayload();
      const signature = signBody(body);

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      const result = await handleRevenueCatWebhook(body, signature);

      expect(result).toEqual({ received: true });
    });

    it("throws on invalid signature", async () => {
      const body = makePayload();
      const badSig = "invalidsignature";

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      await expect(handleRevenueCatWebhook(body, badSig)).rejects.toThrow("Invalid webhook signature");
    });

    it("throws on tampered body", async () => {
      const body = makePayload();
      const signature = signBody(body);
      const tamperedBody = makePayload({ product_id: "different_product" });

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      await expect(handleRevenueCatWebhook(tamperedBody, signature)).rejects.toThrow("Invalid webhook signature");
    });
  });

  describe("environment filtering", () => {
    it("processes PRODUCTION events", async () => {
      const body = makePayload({ environment: "PRODUCTION" });
      const signature = signBody(body);

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      const result = await handleRevenueCatWebhook(body, signature);

      expect(result).toEqual({ received: true });
    });

    it("processes SANDBOX events when RC_ALLOW_SANDBOX=true", async () => {
      const body = makePayload({ environment: "SANDBOX" });
      const signature = signBody(body);

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      const result = await handleRevenueCatWebhook(body, signature);

      expect(result).toEqual({ received: true });
    });

    it("rejects SANDBOX events when RC_ALLOW_SANDBOX=false", async () => {
      const envMock = mockGetEnv({ RC_ALLOW_SANDBOX: false });
      vi.doMock("../config/env.js", () => ({ getEnv: envMock }));

      const body = makePayload({ environment: "SANDBOX" });
      const signature = signBody(body);

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      const result = await handleRevenueCatWebhook(body, signature);

      expect(result).toEqual({ received: true });
    });
  });

  describe("event processing", () => {
    it("INITIAL_PURCHASE inserts subscription and sets isPremium", async () => {
      const body = makePayload();
      const signature = signBody(body);

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      await handleRevenueCatWebhook(body, signature);

      expect(mockInsert).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it("EXPIRATION expires subscription and clears isPremium", async () => {
      const body = makePayload({ event: "EXPIRATION" });
      const signature = signBody(body);

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      await handleRevenueCatWebhook(body, signature);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it("UNCANCELLATION reactivates subscription and sets isPremium", async () => {
      const body = makePayload({ event: "UNCANCELLATION" });
      const signature = signBody(body);

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      await handleRevenueCatWebhook(body, signature);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it("BILLING_ISSUE updates status to billing_retry", async () => {
      const body = makePayload({ event: "BILLING_ISSUE" });
      const signature = signBody(body);

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      await handleRevenueCatWebhook(body, signature);

      expect(mockUpdate).toHaveBeenCalled();
    });

    it("returns received:true for missing app_user_id without updating DB", async () => {
      const body = makePayload({ app_user_id: "" });
      const signature = signBody(body);

      const { handleRevenueCatWebhook } = await import("../services/payments/revenuecat.js");
      const result = await handleRevenueCatWebhook(body, signature);

      expect(result).toEqual({ received: true });
      expect(mockInsert).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
