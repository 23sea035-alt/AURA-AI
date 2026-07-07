import { logger } from "../../lib/logger.js";
import { getEnv } from "../../config/env.js";
import {
  VOICE_FILLER_TEXTS,
  VOICE_FALLBACK_TEXT,
  VOICE_FILLER_CLIP_COUNT,
} from "@aura/shared";
import { synthesizeSpeech, synthesizeBatch } from "./inworld-tts.js";
import { classifyInterruption } from "./interruption.js";
import type { InterruptionClass } from "./interruption.js";
import type { PersonaKey } from "@aura/shared";
import type { DeliveryMode } from "./inworld-tts.js";

export type VoiceState =
  | "IDLE"
  | "AI_SPEAKING"
  | "INTERRUPTED"
  | "CLASSIFYING"
  | "RESUMING"
  | "ACKNOWLEDGING"
  | "USER_SPEAKING"
  | "PROCESSING"
  | "ERROR";

// Prosody per persona. Only the 3 anchors are voice-cast so far; the 9 gallery presets fall back to a
// warm neutral prosody (and no cast voiceId) until their Inworld voices are assigned. See
// docs/specs/companion-gallery-identities.md (voiceId wiring is the remaining voice task).
const DEFAULT_STYLE_TAG = "[warm and gentle]";
const DEFAULT_DELIVERY_MODE: DeliveryMode = "BALANCED";

const PERSONA_STYLE_TAG: Partial<Record<PersonaKey, string>> = {
  aurora: "[warm and gentle]",
  orion: "[direct and grounded]",
  lyra: "[bright and expressive]",
};

const PERSONA_DELIVERY_MODE: Partial<Record<PersonaKey, DeliveryMode>> = {
  aurora: "BALANCED",
  orion: "STABLE",
  lyra: "CREATIVE",
};

function getVoiceId(personaKey: PersonaKey): string | undefined {
  const env = getEnv();
  switch (personaKey) {
    case "aurora": return env.INWORLD_VOICE_ID_AURORA;
    case "orion": return env.INWORLD_VOICE_ID_ORION;
    case "lyra": return env.INWORLD_VOICE_ID_LYRA;
    default: return undefined; // 9 gallery presets not yet cast → adapter uses its default voice
  }
}

export interface VoiceSessionParams {
  userId: string;
  companionId: string;
  personaKey: PersonaKey;
}

export class VoiceSession {
  state: VoiceState = "IDLE";
  /** Metered voice-seconds (STT + TTS) accumulated over this call; drives the per-call ceiling. */
  callSeconds = 0;
  private fillerClips: Buffer[] = [];
  private fallbackClip: Buffer | undefined;
  private fillerIndex = 0;

  constructor(readonly params: VoiceSessionParams) {}

  /** Add metered seconds to the running per-call total (STT input or TTS output). */
  addCallSeconds(seconds: number): void {
    this.callSeconds += Math.max(0, seconds);
  }

  async open(): Promise<void> {
    const voiceId = getVoiceId(this.params.personaKey);
    if (!voiceId) {
      logger.warn({ personaKey: this.params.personaKey }, "Voice ID not configured — skipping filler clip pre-gen");
      return;
    }

    const deliveryMode = PERSONA_DELIVERY_MODE[this.params.personaKey] ?? DEFAULT_DELIVERY_MODE;
    const fillerTexts = [...VOICE_FILLER_TEXTS].slice(0, VOICE_FILLER_CLIP_COUNT);

    try {
      const [clips, fallback] = await Promise.all([
        synthesizeBatch(fillerTexts, { voiceId, deliveryMode }),
        synthesizeSpeech({ text: VOICE_FALLBACK_TEXT, voiceId, deliveryMode, styleTag: "[calm and measured]" }),
      ]);
      this.fillerClips = clips;
      this.fallbackClip = fallback;
      logger.info({ count: clips.length }, "Voice filler clips pre-generated");
    } catch (err) {
      logger.warn({ err }, "Filler clip pre-gen failed — continuing without fillers");
    }
  }

  async synthesizeReply(text: string, opts?: { crisis?: boolean }): Promise<Buffer> {
    const voiceId = getVoiceId(this.params.personaKey);
    if (!voiceId) {
      throw new Error(`Voice ID not set for ${this.params.personaKey} — configure INWORLD_VOICE_ID_${this.params.personaKey.toUpperCase()}`);
    }

    const styleTag = opts?.crisis ? "[calm and measured]" : (PERSONA_STYLE_TAG[this.params.personaKey] ?? DEFAULT_STYLE_TAG);
    const deliveryMode = opts?.crisis ? "STABLE" : (PERSONA_DELIVERY_MODE[this.params.personaKey] ?? DEFAULT_DELIVERY_MODE);
    return synthesizeSpeech({ text, voiceId, deliveryMode, styleTag });
  }

  nextFillerClip(): Buffer | undefined {
    if (this.fillerClips.length === 0) return this.fallbackClip;
    const clip = this.fillerClips[this.fillerIndex % this.fillerClips.length];
    this.fillerIndex++;
    return clip;
  }

  transitionTo(next: VoiceState): void {
    logger.debug({ from: this.state, to: next, userId: this.params.userId }, "VoiceSession state →");
    this.state = next;
  }

  onInterrupt(transcript: string): InterruptionClass {
    this.transitionTo("CLASSIFYING");
    const cls = classifyInterruption(transcript);
    if (cls === "resume") {
      this.transitionTo("RESUMING");
    } else if (cls === "interjection") {
      this.transitionTo("ACKNOWLEDGING");
    } else {
      this.transitionTo("PROCESSING");
    }
    return cls;
  }

  close(): void {
    this.transitionTo("IDLE");
    this.fillerClips = [];
    this.fallbackClip = undefined;
    this.callSeconds = 0;
  }
}
