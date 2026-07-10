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
import { styleTagFor, deliveryModeFor, baseRateFor, effectiveSpeakingRate, localeFor } from "./voice-tuning.js";

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

// Per-persona style tag / delivery mode / base speaking rate live in ./voice-tuning.js (pure + tested);
// the user's SPEAKING PACE setting multiplies the base rate there. Only the 3 anchors are voice-cast
// today — the 9 gallery presets are pre-tuned but dormant until their Inworld voiceId is assigned.

function getVoiceId(personaKey: PersonaKey): string | undefined {
  const env = getEnv();
  // Cast voices are env-keyed per persona (INWORLD_VOICE_ID_<PERSONA>). Unset → undefined, and the
  // adapter degrades gracefully (no audio) until that persona is cast — so casting is a config drop-in.
  const byPersona: Record<PersonaKey, string | undefined> = {
    aurora: env.INWORLD_VOICE_ID_AURORA,
    orion: env.INWORLD_VOICE_ID_ORION,
    lyra: env.INWORLD_VOICE_ID_LYRA,
    sage: env.INWORLD_VOICE_ID_SAGE,
    amara: env.INWORLD_VOICE_ID_AMARA,
    eli: env.INWORLD_VOICE_ID_ELI,
    selene: env.INWORLD_VOICE_ID_SELENE,
    soren: env.INWORLD_VOICE_ID_SOREN,
    juno: env.INWORLD_VOICE_ID_JUNO,
    thea: env.INWORLD_VOICE_ID_THEA,
    cyrus: env.INWORLD_VOICE_ID_CYRUS,
    wren: env.INWORLD_VOICE_ID_WREN,
  };
  return byPersona[personaKey];
}

export interface VoiceSessionParams {
  userId: string;
  companionId: string;
  personaKey: PersonaKey;
  /** The user's SPEAKING PACE setting as a multiplier on the persona's base rate (default 1.0 =
   * "natural"). relaxed / natural / brisk map to <1 / 1 / >1 on the client; carried in on voice_start. */
  speakingRateMultiplier?: number;
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

    const deliveryMode = deliveryModeFor(this.params.personaKey);
    const language = localeFor(this.params.personaKey);
    const speakingRate = effectiveSpeakingRate(baseRateFor(this.params.personaKey), this.params.speakingRateMultiplier ?? 1.0);
    const fillerTexts = [...VOICE_FILLER_TEXTS].slice(0, VOICE_FILLER_CLIP_COUNT);

    try {
      const [clips, fallback] = await Promise.all([
        synthesizeBatch(fillerTexts, { voiceId, deliveryMode, speakingRate, language }),
        synthesizeSpeech({ text: VOICE_FALLBACK_TEXT, voiceId, deliveryMode, styleTag: "[calm and measured]", speakingRate, language }),
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

    const styleTag = opts?.crisis ? "[calm and measured]" : styleTagFor(this.params.personaKey);
    const deliveryMode = opts?.crisis ? "STABLE" : deliveryModeFor(this.params.personaKey);
    // Crisis speaks at the persona's base tempo — a user's "brisk" pace must never rush a 988 reply.
    const paceMultiplier = opts?.crisis ? 1.0 : (this.params.speakingRateMultiplier ?? 1.0);
    const speakingRate = effectiveSpeakingRate(baseRateFor(this.params.personaKey), paceMultiplier);
    const language = localeFor(this.params.personaKey);
    return synthesizeSpeech({ text, voiceId, deliveryMode, styleTag, speakingRate, language });
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
