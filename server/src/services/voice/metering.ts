import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "../../db/src/index.js";
import { voiceUsageTable } from "../../db/src/index.js";
import { VOICE_DAILY_LIMIT_SECONDS, VOICE_CALL_MAX_DURATION_SECONDS } from "@aura/shared";

export interface VoiceMeteringResult {
  allowed: boolean;
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
  reason?: string;
}

export async function checkVoiceDailyLimit(userId: string): Promise<VoiceMeteringResult> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [result] = await db
    .select({ totalSeconds: sql<number>`coalesce(sum(${voiceUsageTable.durationSeconds}), 0)` })
    .from(voiceUsageTable)
    .where(and(
      eq(voiceUsageTable.userId, userId),
      gte(voiceUsageTable.createdAt, today),
    ));

  const usedSeconds = result?.totalSeconds ?? 0;
  const remainingSeconds = Math.max(0, VOICE_DAILY_LIMIT_SECONDS - usedSeconds);

  return {
    allowed: usedSeconds < VOICE_DAILY_LIMIT_SECONDS,
    usedSeconds,
    limitSeconds: VOICE_DAILY_LIMIT_SECONDS,
    remainingSeconds,
  };
}

export async function checkCallDurationLimit(_userId: string, requestedSeconds: number): Promise<VoiceMeteringResult> {
  if (requestedSeconds > VOICE_CALL_MAX_DURATION_SECONDS) {
    return {
      allowed: false,
      usedSeconds: 0,
      limitSeconds: VOICE_CALL_MAX_DURATION_SECONDS,
      remainingSeconds: VOICE_CALL_MAX_DURATION_SECONDS,
      reason: `Call duration ${requestedSeconds}s exceeds maximum ${VOICE_CALL_MAX_DURATION_SECONDS}s`,
    };
  }
  const daily = await checkVoiceDailyLimit(_userId);
  if (!daily.allowed) {
    return { ...daily, reason: "Daily voice limit reached — upgrade to premium or wait until tomorrow" };
  }
  if (requestedSeconds > daily.remainingSeconds) {
    return {
      ...daily,
      allowed: false,
      reason: `Only ${daily.remainingSeconds}s of voice time remaining today`,
    };
  }
  return daily;
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
