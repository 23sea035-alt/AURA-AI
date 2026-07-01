import { describe, it, expect, vi, beforeEach } from "vitest";

// Must be before any imports of the module under test
vi.mock("../services/voice/inworld-tts.js", () => ({
  synthesizeSpeech: vi.fn().mockResolvedValue(Buffer.from("audio")),
  synthesizeBatch: vi.fn().mockResolvedValue([Buffer.from("clip1"), Buffer.from("clip2")]),
}));

// Shared constants used by VoiceSession
vi.mock("@aura/shared", () => ({
  VOICE_FILLER_TEXTS: ["Anyway...", "So, as I was saying...", "Right, where were we..."],
  VOICE_FALLBACK_TEXT: "I lost my train of thought for a second — say that again?",
  VOICE_FILLER_CLIP_COUNT: 3,
  INTERJECTION_MAX_WORDS: 7,
  PERSONA_KEYS: ["aurora", "orion", "lyra"],
}));

describe("VoiceSession", () => {
  let VoiceSession: typeof import("../services/voice/voice-session.js").VoiceSession;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../services/voice/voice-session.js");
    VoiceSession = mod.VoiceSession;
  });

  describe("onInterrupt state transitions", () => {
    it('empty transcript: IDLE → CLASSIFYING → RESUMING, returns "resume"', () => {
      const session = new VoiceSession({ userId: "u1", companionId: "c1", personaKey: "aurora" });
      const result = session.onInterrupt("");
      expect(result).toBe("resume");
      expect(session.state).toBe("RESUMING");
    });

    it('"yes": IDLE → CLASSIFYING → ACKNOWLEDGING, returns "interjection"', () => {
      const session = new VoiceSession({ userId: "u1", companionId: "c1", personaKey: "aurora" });
      const result = session.onInterrupt("yes");
      expect(result).toBe("interjection");
      expect(session.state).toBe("ACKNOWLEDGING");
    });

    it('"what do you think about that": IDLE → CLASSIFYING → PROCESSING, returns "detour"', () => {
      const session = new VoiceSession({ userId: "u1", companionId: "c1", personaKey: "aurora" });
      const result = session.onInterrupt("what do you think about that");
      expect(result).toBe("detour");
      expect(session.state).toBe("PROCESSING");
    });
  });

  describe("nextFillerClip", () => {
    it("returns fallback clip when fillerClips is empty and fallbackClip is defined", () => {
      const session = new VoiceSession({ userId: "u1", companionId: "c1", personaKey: "aurora" });
      const fallback = Buffer.from("fallback");
      // Bypass open() and set directly
      (session as any).fillerClips = [];
      (session as any).fallbackClip = fallback;
      expect(session.nextFillerClip()).toBe(fallback);
    });

    it("cycles through clips by index modulo length", () => {
      const session = new VoiceSession({ userId: "u1", companionId: "c1", personaKey: "aurora" });
      const clips = [Buffer.from("a"), Buffer.from("b"), Buffer.from("c")];
      (session as any).fillerClips = clips;
      (session as any).fallbackClip = undefined;
      expect(session.nextFillerClip()).toBe(clips[0]);
      expect(session.nextFillerClip()).toBe(clips[1]);
      expect(session.nextFillerClip()).toBe(clips[2]);
      expect(session.nextFillerClip()).toBe(clips[0]); // wraps around
    });
  });

  describe("transitionTo", () => {
    it("updates state", () => {
      const session = new VoiceSession({ userId: "u1", companionId: "c1", personaKey: "aurora" });
      expect(session.state).toBe("IDLE");
      session.transitionTo("AI_SPEAKING");
      expect(session.state).toBe("AI_SPEAKING");
    });
  });

  describe("close", () => {
    it("resets state and clears buffers", () => {
      const session = new VoiceSession({ userId: "u1", companionId: "c1", personaKey: "aurora" });
      (session as any).fillerClips = [Buffer.from("a")];
      (session as any).fallbackClip = Buffer.from("f");
      session.close();
      expect(session.state).toBe("IDLE");
      expect((session as any).fillerClips).toEqual([]);
      expect((session as any).fallbackClip).toBeUndefined();
    });
  });
});
