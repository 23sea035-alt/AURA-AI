import { eq, and, gte, sql } from "drizzle-orm";
import { db, voiceUsageTable } from "../../db/src/index.js";
import {
  VOICE_DAILY_LIMIT_SECONDS, VOICE_DAILY_LIMIT_SECONDS_PREMIUM,
  VOICE_CALL_MAX_DURATION_SECONDS, VOICE_CALL_MAX_DURATION_SECONDS_PREMIUM,
} from "@aura/shared";

export interface VoiceMeteringResult {
  allowed: boolean;
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
}

/** Daily voice-seconds cap for the tier (premium gets the higher bucket). */
export function dailyLimitSeconds(isPremium: boolean): number {
  return isPremium ? VOICE_DAILY_LIMIT_SECONDS_PREMIUM : VOICE_DAILY_LIMIT_SECONDS;
}

/** Per-call voice-seconds ceiling for the tier. */
export function callMaxSeconds(isPremium: boolean): number {
  return isPremium ? VOICE_CALL_MAX_DURATION_SECONDS_PREMIUM : VOICE_CALL_MAX_DURATION_SECONDS;
}

export async function checkVoiceDailyLimit(userId: string, isPremium = false): Promise<VoiceMeteringResult> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [result] = await db
    .select({ totalSeconds: sql<number>`coalesce(sum(${voiceUsageTable.durationSeconds}), 0)` })
    .from(voiceUsageTable)
    .where(and(
      eq(voiceUsageTable.userId, userId),
      gte(voiceUsageTable.createdAt, today),
    ));

  const usedSeconds = Number(result?.totalSeconds ?? 0);
  const limitSeconds = dailyLimitSeconds(isPremium);
  const remainingSeconds = Math.max(0, limitSeconds - usedSeconds);

  return { allowed: usedSeconds < limitSeconds, usedSeconds, limitSeconds, remainingSeconds };
}

export async function recordVoiceUsage(
  userId: string,
  companionId: string,
  durationSeconds: number,
  direction: "stt" | "tts",
  modelId: string,
): Promise<void> {
  await db.insert(voiceUsageTable).values({
    userId,
    companionId,
    durationSeconds,
    direction,
    modelId,
  });
}

// Estimate the spoken duration of a piece of text for TTS metering, without decoding audio.
// ~165 wpm ≈ ~14 chars/sec; floored at 1s so any synthesized reply costs at least a second.
const CHARS_PER_SECOND = 14;
export function estimateSpeechSeconds(text: string): number {
  const chars = text.trim().length;
  if (chars === 0) return 0;
  return Math.max(1, Math.round(chars / CHARS_PER_SECOND));
}
