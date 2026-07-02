import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRecordVoiceUsage = vi.fn().mockResolvedValue(undefined);
const mockSendBinaryFrame = vi.fn();
const mockSendJsonFrame = vi.fn();

// enqueueTts runs the thunk immediately (no real queue in the unit test).
vi.mock("../services/chat/turn-queue.js", () => ({
  enqueueTts: (fn: () => Promise<unknown>) => fn(),
}));
vi.mock("../websocket/frame-utils.js", () => ({
  sendBinaryFrame: mockSendBinaryFrame,
  sendJsonFrame: mockSendJsonFrame,
}));
vi.mock("../services/voice/metering.js", () => ({
  recordVoiceUsage: mockRecordVoiceUsage,
  estimateSpeechSeconds: (t: string) => Math.max(1, Math.round(t.trim().length / 14)),
}));
vi.mock("../services/voice/inworld-tts.js", () => ({
  TTS_MODEL_ID: "inworld-tts-2",
  synthesizeSpeech: vi.fn(),
  synthesizeBatch: vi.fn(),
}));
vi.mock("../lib/logger.js", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

function makeSession() {
  return {
    params: { userId: "u1", companionId: "c1", personaKey: "aurora" as const },
    transitionTo: vi.fn(),
    addCallSeconds: vi.fn(),
    nextFillerClip: vi.fn(() => Buffer.from("filler")),
    synthesizeReply: vi.fn().mockResolvedValue(Buffer.from("mp3-bytes")),
  };
}

describe("makeVoiceAdapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("synthesizes an approved sentence, sends an audio frame, and meters TTS", async () => {
    const { makeVoiceAdapter } = await import("../services/voice/voice-adapter.js");
    const session = makeSession();
    const adapter = makeVoiceAdapter({} as any, session as any, "c1");

    adapter.onToken!("Hello there friend."); // 19 chars → ceil(19/14)=1s
    await vi.waitFor(() => expect(mockSendBinaryFrame).toHaveBeenCalled());

    expect(session.synthesizeReply).toHaveBeenCalledWith("Hello there friend.", { crisis: undefined });
    expect(session.addCallSeconds).toHaveBeenCalledWith(1);
    expect(mockRecordVoiceUsage).toHaveBeenCalledWith("u1", "c1", 1, "tts", "inworld-tts-2");
  });

  it("passes the crisis flag through to the calm delivery style", async () => {
    const { makeVoiceAdapter } = await import("../services/voice/voice-adapter.js");
    const session = makeSession();
    const adapter = makeVoiceAdapter({} as any, session as any, "c1");

    adapter.onToken!("Please reach out to 988.", { crisis: true });
    await vi.waitFor(() => expect(session.synthesizeReply).toHaveBeenCalled());

    expect(session.synthesizeReply).toHaveBeenCalledWith("Please reach out to 988.", { crisis: true });
  });

  it("falls back to a filler clip when synthesis fails (no crash, no metering)", async () => {
    const { makeVoiceAdapter } = await import("../services/voice/voice-adapter.js");
    const session = makeSession();
    session.synthesizeReply.mockRejectedValueOnce(new Error("TTS 500"));
    const adapter = makeVoiceAdapter({} as any, session as any, "c1");

    adapter.onToken!("This will fail to synthesize.");
    await vi.waitFor(() => expect(session.nextFillerClip).toHaveBeenCalled());

    expect(mockSendBinaryFrame).toHaveBeenCalled(); // the filler clip
    expect(mockRecordVoiceUsage).not.toHaveBeenCalled();
  });

  it("onAbort sends an abort frame and returns to IDLE", async () => {
    const { makeVoiceAdapter } = await import("../services/voice/voice-adapter.js");
    const session = makeSession();
    const adapter = makeVoiceAdapter({} as any, session as any, "c1");

    adapter.onAbort("output_blocked", "withheld");
    expect(session.transitionTo).toHaveBeenCalledWith("IDLE");
    expect(mockSendJsonFrame).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: "abort", code: "output_blocked" }));
  });

  it("onComplete sends a voice_complete frame", async () => {
    const { makeVoiceAdapter } = await import("../services/voice/voice-adapter.js");
    const session = makeSession();
    const adapter = makeVoiceAdapter({} as any, session as any, "c1");

    adapter.onComplete({
      userMessage: { id: "um" } as any,
      aiMessage: { id: "am" } as any,
      turnId: "t1",
      memoriesUsed: false,
    });
    expect(mockSendJsonFrame).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ type: "voice_complete", turnId: "t1" }));
  });
});
