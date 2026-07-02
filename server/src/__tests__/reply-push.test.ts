import { describe, it, expect, vi, beforeEach } from "vitest";

const mockIsConnected = vi.fn();
vi.mock("../websocket/connection-manager.js", () => ({ connectionManager: { isConnected: mockIsConnected } }));

const mockSendPush = vi.fn().mockResolvedValue(undefined);
vi.mock("../services/notifications/apns.js", () => ({ sendPushNotification: mockSendPush }));

let tokensResult: unknown[] = [];
const mockWhere = vi.fn(() => Promise.resolve(tokensResult));
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));
vi.mock("../db/src/index.js", () => ({ db: { select: mockSelect }, deviceTokensTable: {} }));
vi.mock("../lib/logger.js", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

describe("maybeSendReplyPush", () => {
  beforeEach(() => { vi.clearAllMocks(); tokensResult = []; });

  it("does not push when the user is live on a WS connection", async () => {
    mockIsConnected.mockReturnValue(true);
    const { maybeSendReplyPush } = await import("../services/chat/reply-push.js");
    await maybeSendReplyPush("u1", "c1", "Aurora");
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it("does not push when the user has no device tokens", async () => {
    mockIsConnected.mockReturnValue(false);
    tokensResult = [];
    const { maybeSendReplyPush } = await import("../services/chat/reply-push.js");
    await maybeSendReplyPush("u1", "c1", "Aurora");
    expect(mockSendPush).not.toHaveBeenCalled();
  });

  it("pushes to each device token when the user is away", async () => {
    mockIsConnected.mockReturnValue(false);
    tokensResult = [{ token: "tok-1" }, { token: "tok-2" }];
    const { maybeSendReplyPush } = await import("../services/chat/reply-push.js");
    await maybeSendReplyPush("u1", "c1", "Aurora");
    expect(mockSendPush).toHaveBeenCalledTimes(2);
    expect(mockSendPush).toHaveBeenCalledWith("tok-1", expect.objectContaining({
      alert: { title: "Aurora", body: "Sent you a reply" },
    }));
  });

  it("swallows errors (best-effort — never affects the turn)", async () => {
    mockIsConnected.mockReturnValue(false);
    tokensResult = [{ token: "tok-1" }];
    mockSendPush.mockRejectedValueOnce(new Error("APNs down"));
    const { maybeSendReplyPush } = await import("../services/chat/reply-push.js");
    await expect(maybeSendReplyPush("u1", "c1", "Aurora")).resolves.toBeUndefined();
  });
});
