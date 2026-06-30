import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../config/env.js", () => ({
  getEnv: vi.fn(() => ({
    CARTESIA_API_KEY: "sk_car_test-key",
    CARTESIA_VOICE_ID: "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4",
  })),
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("TTS service — contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listVoices", () => {
    it("returns cached voices on second call", async () => {
      const fakeVoices = { data: [{ id: "v1", name: "Test", description: "A test voice" }] };
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(fakeVoices),
      } as any);

      const { listVoices, clearVoicesCache } = await import("../services/voice/tts.js");
      clearVoicesCache();

      const first = await listVoices();
      expect(first).toHaveLength(1);
      expect(first[0].id).toBe("v1");
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const second = await listVoices();
      expect(second).toHaveLength(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("generateSpeech", () => {
    it("generates audio buffer for text", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as any);

      const { generateSpeech } = await import("../services/voice/tts.js");
      const result = await generateSpeech({ text: "Hello world" });
      expect(Buffer.isBuffer(result)).toBe(true);

      const callUrl = fetchMock.mock.calls[0]?.[0];
      expect(callUrl).toContain("/tts/bytes");
    });

    it("throws on API error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Voice not found"),
      } as any);

      const { generateSpeech } = await import("../services/voice/tts.js");
      await expect(generateSpeech({ text: "test" })).rejects.toThrow("Cartesia TTS error 404");
    });

    it("uses custom voice and model", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as any);

      const { generateSpeech } = await import("../services/voice/tts.js");
      await generateSpeech({ text: "Hi", voiceId: "custom-voice", modelId: "sonic-2" });

      const init = fetchMock.mock.calls[0]?.[1] as { body: string } | undefined;
      const body = JSON.parse(init?.body ?? "{}");
      expect(body.voice.id).toBe("custom-voice");
      expect(body.model_id).toBe("sonic-2");
    });
  });

  describe("generateSpeechForTurn", () => {
    it("uses env voice ID and calls generateSpeech", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as any);

      const { generateSpeechForTurn } = await import("../services/voice/tts.js");
      await generateSpeechForTurn("Hello");
      expect(fetchMock).toHaveBeenCalled();
      const init2 = fetchMock.mock.calls[0]?.[1] as { body: string } | undefined;
      const body = JSON.parse(init2?.body ?? "{}");
      expect(body.transcript).toBe("Hello");
    });
  });

  describe("streamSpeech", () => {
    it("yields chunks from SSE stream", async () => {
      const chunk1 = Buffer.from("audio1").toString("base64");
      const sseData = [
        `data: ${JSON.stringify({ type: "chunk", audio: chunk1 })}\n\n`,
        "data: [DONE]\n\n",
      ].join("");
      const encoder = new TextEncoder();

      const mockReader = (() => {
        let i = 0;
        return {
          read: vi.fn().mockImplementation(() => {
            if (i < sseData.length) {
              const chunk = sseData.slice(i, i + 20);
              i += 20;
              return Promise.resolve({ done: false, value: encoder.encode(chunk) });
            }
            return Promise.resolve({ done: true, value: undefined });
          }),
          releaseLock: vi.fn(),
        };
      })();

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        body: { getReader: () => mockReader },
      } as any);

      const { streamSpeech } = await import("../services/voice/tts.js");
      const chunks: any[] = [];
      for await (const chunk of streamSpeech({ text: "Hello" })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].audio).toBeInstanceOf(Buffer);
      expect(chunks[0].isFinal).toBe(false);
    });
  });
});
