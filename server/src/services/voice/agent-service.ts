import { Room } from "@livekit/rtc-node";
import { voice, inference } from "@livekit/agents";
import { STT as DeepgramSTT } from "@livekit/agents-plugin-deepgram";
import { TTS as CartesiaTTS } from "@livekit/agents-plugin-cartesia";
import { eq } from "drizzle-orm";
import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { db, deviceTokensTable } from "../../db/src/index.js";
import { sendPushNotification } from "../notifications/apns.js";
import { AuraVoiceAgent } from "./agent.js";
import { generateAgentToken } from "./livekit.js";

export interface VoiceSessionHandle {
  room: Room;
  session: voice.AgentSession;
  roomName: string;
}

const activeSessions = new Map<string, VoiceSessionHandle>();

export function getActiveSession(roomName: string): VoiceSessionHandle | undefined {
  return activeSessions.get(roomName);
}

export async function startVoiceSession(
  userId: string,
  companionId: string,
  roomName: string,
): Promise<VoiceSessionHandle> {
  const existing = activeSessions.get(roomName);
  if (existing) {
    logger.warn({ roomName }, "Voice session already active for this room");
    return existing;
  }

  const env = getEnv();

  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error("LiveKit not configured");
  }

  const room = new Room();
  const tokenResult = await generateAgentToken(`agent-${userId}`, roomName);

  room.on("participantConnected", (participant) => {
    logger.info({ identity: participant.identity }, "Participant joined voice room");
  });

  room.on("participantDisconnected", (participant) => {
    logger.info({ identity: participant.identity }, "Participant left voice room");
  });

  room.on("disconnected", () => {
    logger.info({ roomName }, "Agent disconnected from room");
    activeSessions.delete(roomName);
    notifyCallEnded(userId, companionId).catch((err) => logger.warn({ err }, "Push notification failed"));
  });

  await room.connect(tokenResult.url, tokenResult.token);
  logger.info({ roomName, userId }, "Agent connected to LiveKit room");

  const stt = new DeepgramSTT({
    apiKey: env.DEEPGRAM_API_KEY,
    model: "nova-2-general",
    interimResults: true,
    punctuate: true,
    smartFormat: true,
  });

  const tts = new CartesiaTTS({
    apiKey: env.CARTESIA_API_KEY,
    model: "sonic-3.5",
    voice: env.CARTESIA_VOICE_ID,
    sampleRate: 24000,
  });

  const vad = new inference.VAD({ model: "silero" });

  const agent = new AuraVoiceAgent({
    instructions:
      "You are a warm, empathetic AI companion for adults. Keep responses conversational, natural, and moderately detailed for voice.",
    stt,
    tts,
    userId,
    companionId,
  });

  const session = new voice.AgentSession({
    vad,
    stt,
    tts,
    turnHandling: {} as any,
  });

  const evt = voice.AgentSessionEventTypes;
  session.on(evt.AgentStateChanged, (ev: any) => {
    logger.debug({ state: ev.state }, "Agent state changed");
  });
  session.on(evt.UserInputTranscribed, (ev: any) => {
    logger.debug({ text: ev.text, isFinal: ev.isFinal }, "User input transcribed");
  });

  await session.start({
    agent,
    room,
    inputOptions: { audioSampleRate: 16000, audioEnabled: true } as any,
    outputOptions: { audioSampleRate: 24000, audioEnabled: true } as any,
  });

  const handle: VoiceSessionHandle = { room, session, roomName };
  activeSessions.set(roomName, handle);

  logger.info({ userId, companionId, roomName }, "Voice session started");

  notifyCallStarted(userId, companionId).catch((err) => logger.warn({ err }, "Push notification failed"));

  return handle;
}

async function notifyCallStarted(userId: string, companionId: string): Promise<void> {
  const tokens = await db
    .select({ token: deviceTokensTable.token, platform: deviceTokensTable.platform })
    .from(deviceTokensTable)
    .where(eq(deviceTokensTable.userId, userId));
  await Promise.allSettled(
    tokens.map((t) =>
      sendPushNotification(t.token, {
        alert: { title: "Voice Call", body: "Your AI companion is ready to talk" },
        data: { type: "voice_call_started", companionId },
      }),
    ),
  );
}

async function notifyCallEnded(userId: string, companionId: string): Promise<void> {
  const tokens = await db
    .select({ token: deviceTokensTable.token, platform: deviceTokensTable.platform })
    .from(deviceTokensTable)
    .where(eq(deviceTokensTable.userId, userId));
  await Promise.allSettled(
    tokens.map((t) =>
      sendPushNotification(t.token, {
        alert: { title: "Voice Call Ended", body: "Your call has ended" },
        data: { type: "voice_call_ended", companionId },
      }),
    ),
  );
}

export async function stopVoiceSession(roomName: string): Promise<void> {
  const handle = activeSessions.get(roomName);
  if (!handle) {
    logger.warn({ roomName }, "No active voice session found");
    return;
  }

  try {
    handle.session.close();
  } catch (err) {
    logger.error({ err }, "Error closing voice session");
  }

  try {
    handle.room.disconnect();
  } catch (err) {
    logger.error({ err }, "Error disconnecting room");
  }

  activeSessions.delete(roomName);
  logger.info({ roomName }, "Voice session stopped");
}

export async function stopAllSessions(): Promise<void> {
  const names = Array.from(activeSessions.keys());
  await Promise.allSettled(names.map(stopVoiceSession));
}
