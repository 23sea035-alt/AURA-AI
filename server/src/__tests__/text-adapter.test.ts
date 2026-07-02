import { describe, it, expect, vi } from "vitest";

const mockSendJsonFrame = vi.fn();
vi.mock("../websocket/frame-utils.js", () => ({
  sendJsonFrame: mockSendJsonFrame,
}));

describe("makeTextAdapter", () => {
  const ws = {} as any;
  const companionId = "c1";

  it("onToken sends token frame", async () => {
    const { makeTextAdapter } = await import("../services/chat/text-adapter.js");
    const adapter = makeTextAdapter(ws, companionId);
    adapter.onToken!("Hello");
    expect(mockSendJsonFrame).toHaveBeenCalledWith(ws, { type: "token", token: "Hello", companionId });
  });

  it("onAbort sends abort frame with reason and detail", async () => {
    const { makeTextAdapter } = await import("../services/chat/text-adapter.js");
    const adapter = makeTextAdapter(ws, companionId);
    adapter.onAbort("input_blocked", "Profanity");
    expect(mockSendJsonFrame).toHaveBeenCalledWith(ws, { type: "abort", code: "input_blocked", detail: "Profanity", companionId });
  });

  it("onAbort sends abort frame without detail", async () => {
    const { makeTextAdapter } = await import("../services/chat/text-adapter.js");
    const adapter = makeTextAdapter(ws, companionId);
    adapter.onAbort("rate_limited");
    expect(mockSendJsonFrame).toHaveBeenCalledWith(ws, { type: "abort", code: "rate_limited", detail: undefined, companionId });
  });

  it("onComplete sends complete frame with all fields", async () => {
    const { makeTextAdapter } = await import("../services/chat/text-adapter.js");
    const adapter = makeTextAdapter(ws, companionId);
    const result = {
      userMessage: { id: "um1" } as any,
      aiMessage: { id: "am1" } as any,
      turnId: "t1",
      memoriesUsed: true,
      crisisResources: ["988"],
      breakReminder: "Take a break",
    };
    adapter.onComplete(result);
    expect(mockSendJsonFrame).toHaveBeenCalledWith(ws, {
      type: "complete",
      turnId: "t1",
      aiMessageId: "am1",
      userMessageId: "um1",
      memoriesUsed: true,
      breakReminder: "Take a break",
      aiDisclosure: false,
      crisisResources: ["988"],
      companionId,
    });
  });

  it("onComplete sends null for missing optional fields", async () => {
    const { makeTextAdapter } = await import("../services/chat/text-adapter.js");
    const adapter = makeTextAdapter(ws, companionId);
    const result = {
      userMessage: { id: "um1" } as any,
      aiMessage: { id: "am1" } as any,
      turnId: "t1",
      memoriesUsed: false,
    };
    adapter.onComplete(result);
    expect(mockSendJsonFrame).toHaveBeenCalledWith(ws, expect.objectContaining({
      breakReminder: null,
      crisisResources: null,
    }));
  });
});
