import { AccessToken } from "livekit-server-sdk";
import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";

const ROOM_TTL_SECONDS = 3600;

export interface VoiceTokenResult {
  token: string;
  url: string;
  room: string;
  identity: string;
}

export async function generateVoiceToken(userId: string, roomName?: string, companionId?: string): Promise<VoiceTokenResult> {
  const env = getEnv();
  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.LIVEKIT_URL) {
    throw new Error("LiveKit not configured — set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET");
  }

  const room = roomName ?? `voice-${userId}`;
  const identity = `user-${userId}`;

  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity,
    ttl: ROOM_TTL_SECONDS,
    metadata: JSON.stringify({ userId, companionId }),
  });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    roomRecord: false,
  });

  const token = await at.toJwt();
  logger.info({ userId, room, identity }, "LiveKit token generated");

  return { token, url: env.LIVEKIT_URL, room, identity };
}

export async function generateAgentToken(agentId: string, roomName: string): Promise<VoiceTokenResult> {
  const env = getEnv();
  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET || !env.LIVEKIT_URL) {
    throw new Error("LiveKit not configured");
  }

  const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: `agent-${agentId}`,
    ttl: ROOM_TTL_SECONDS,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomRecord: false,
    hidden: true,
  });

  return { token: await at.toJwt(), url: env.LIVEKIT_URL, room: roomName, identity: `agent-${agentId}` };
}
