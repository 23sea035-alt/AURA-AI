import { voice, inference } from "@livekit/agents";
import type { JobContext } from "@livekit/agents";
import { STT as DeepgramSTT } from "@livekit/agents-plugin-deepgram";
import { TTS as CartesiaTTS } from "@livekit/agents-plugin-cartesia";
import { getEnv } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { AuraVoiceAgent } from "./agent.js";

export async function entrypoint(jobCtx: JobContext): Promise<void> {
  logger.info({ jobId: jobCtx.job.id }, "Voice agent job started");

  const room = jobCtx.job.room;
  let userId = "";
  let companionId = "";

  if (room?.metadata) {
    try {
      const meta = JSON.parse(room.metadata);
      userId = meta.userId ?? "";
      companionId = meta.companionId ?? "";
    } catch {
      logger.warn("Failed to parse room metadata");
    }
  }

  if (!userId || !companionId) {
    logger.error("Missing userId or companionId in room metadata");
    jobCtx.shutdown("Missing required metadata");
    return;
  }

  await jobCtx.connect();

  const env = getEnv();

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
    room: jobCtx.room,
    inputOptions: { audioSampleRate: 16000, audioEnabled: true } as any,
    outputOptions: { audioSampleRate: 24000, audioEnabled: true } as any,
  });

  logger.info({ userId, companionId }, "Voice agent session started");
}

if (process.argv[1] && new URL(process.argv[1], "file:").pathname === new URL(import.meta.url).pathname) {
  const { cli, ServerOptions } = await import("@livekit/agents");
  cli.runApp(new ServerOptions({
    agent: import.meta.filename,
    requestFunc: async (job: any) => {
      logger.info({ jobId: job.id }, "Accepting voice agent job");
      await job.accept();
    },
  }));
}
