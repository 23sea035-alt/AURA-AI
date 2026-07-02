import { eq, and, gte, sql } from "drizzle-orm";
import { db, voiceUsageTable } from "../../db/src/index.js";
import {
  VOICE_MONTHLY_LIMIT_SECONDS, VOICE_MONTHLY_LIMIT_SECONDS_PREMIUM,
  VOICE_CALL_MAX_DURATION_SECONDS, VOICE_CALL_MAX_DURATION_SECONDS_PREMIUM,
} from "@aura/shared";

export interface VoiceMeteringResult {
  allowed: boolean;
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
}

/** Monthly voice-seconds cap for the tier (premium gets the higher bucket). */
export function monthlyLimitSeconds(isPremium: boolean): number {
  return isPremium ? VOICE_MONTHLY_LIMIT_SECONDS_PREMIUM : VOICE_MONTHLY_LIMIT_SECONDS;
}

/** Per-call voice-seconds ceiling for the tier. */
export function callMaxSeconds(isPremium: boolean): number {
  return isPremium ? VOICE_CALL_MAX_DURATION_SECONDS_PREMIUM : VOICE_CALL_MAX_DURATION_SECONDS;
}

/** Start of the current UTC calendar month — the voice budget window (resets monthly). */
export function currentMonthStartUTC(now: Date = new Date()): Date {
  const d = new Date(now.getTime());
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Sums a user's voice-seconds (stt + tts) since the start of the current UTC calendar month and
// compares against the tier's monthly cap. Voice is metered monthly (text is daily) because the
// per-minute cost is ~200× a text turn — see docs/specs/voice-pricing-economics.md.
export async function checkVoiceMonthlyLimit(userId: string, isPremium = false): Promise<VoiceMeteringResult> {
  const monthStart = currentMonthStartUTC();

  const [result] = await db
    .select({ totalSeconds: sql<number>`coalesce(sum(${voiceUsageTable.durationSeconds}), 0)` })
    .from(voiceUsageTable)
    .where(and(
      eq(voiceUsageTable.userId, userId),
      gte(voiceUsageTable.createdAt, monthStart),
    ));

  const usedSeconds = Number(result?.totalSeconds ?? 0);
  const limitSeconds = monthlyLimitSeconds(isPremium);
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
