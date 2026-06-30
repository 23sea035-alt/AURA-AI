import { describe, it, expect, vi } from "vitest";

vi.mock("../config/env.js", () => ({
  getEnv: vi.fn(() => ({
    LIVEKIT_API_KEY: "test-key",
    LIVEKIT_API_SECRET: "test-secret",
    LIVEKIT_URL: "wss://test.livekit.cloud",
    CARTESIA_API_KEY: "sk_car_test",
    CARTESIA_VOICE_ID: "test-voice",
  })),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("LiveKit token service", () => {
  it("generateVoiceToken returns token, url, room, and identity", async () => {
    const { generateVoiceToken } = await import("../services/voice/livekit.js");
    const result = await generateVoiceToken("user-123");
    expect(result).toHaveProperty("token");
    expect(result.url).toBe("wss://test.livekit.cloud");
    expect(result.room).toBe("voice-user-123");
    expect(result.identity).toBe("user-user-123");
  });

  it("generateVoiceToken uses custom room name", async () => {
    const { generateVoiceToken } = await import("../services/voice/livekit.js");
    const result = await generateVoiceToken("user-123", "custom-room");
    expect(result.room).toBe("custom-room");
  });

  it("generateAgentToken returns agent token", async () => {
    const { generateAgentToken } = await import("../services/voice/livekit.js");
    const result = await generateAgentToken("agent-1", "room-abc");
    expect(result).toHaveProperty("token");
    expect(result.identity).toBe("agent-agent-1");
    expect(result.room).toBe("room-abc");
  });

  it("throws when LiveKit not configured", async () => {
    vi.mocked(await import("../config/env.js")).getEnv.mockReturnValueOnce({
      LIVEKIT_API_KEY: undefined,
      LIVEKIT_API_SECRET: undefined,
      LIVEKIT_URL: undefined,
    } as any);

    const { generateVoiceToken } = await import("../services/voice/livekit.js");
    await expect(generateVoiceToken("user-1")).rejects.toThrow("LiveKit not configured");
  });
});
