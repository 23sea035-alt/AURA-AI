import { voice, llm, FlushSentinel } from "@livekit/agents";
import { randomUUID } from "crypto";
import { processTurn } from "../chat/turn-pipeline.js";
import { logger } from "../../lib/logger.js";

export interface AuraVoiceAgentOptions {
  userId: string;
  companionId: string;
  instructions: string | llm.Instructions;
  id?: string;
  chatCtx?: llm.ChatContext;
  stt?: any;
  vad?: any;
  llm?: any;
  tts?: any;
  turnHandling?: any;
  minConsecutiveSpeechDelay?: number;
  useTtsAlignedTranscript?: boolean;
  turnDetection?: any;
  allowInterruptions?: boolean;
}

export class AuraVoiceAgent extends voice.Agent {
  public userId: string;
  public companionId: string;

  constructor(options: AuraVoiceAgentOptions) {
    super(options as any);
    this.userId = options.userId;
    this.companionId = options.companionId;
  }

  override async llmNode(
    chatCtx: llm.ChatContext,
    _toolCtx: llm.ToolContext,
    _modelSettings: any,
  ): Promise<ReadableStream<any> | null> {
    const userMessages = chatCtx.items
      .filter((item): item is llm.ChatMessage => item.type === "message")
      .filter((msg): msg is llm.ChatMessage => msg.role === "user");

    const lastMsg = userMessages[userMessages.length - 1];
    const content = lastMsg?.textContent?.trim();
    if (!content) {
      logger.warn("Voice agent llmNode: no user message found in chat context");
      return null;
    }

    logger.info(
      { userId: this.userId, companionId: this.companionId, contentLength: content.length },
      "Voice agent processing turn",
    );

    const result = await processTurn({
      userId: this.userId,
      companionId: this.companionId,
      content,
    });

    if (result.error || !result.aiMessage) {
      logger.error({ error: result.error }, "Voice agent turn failed");
      return null;
    }

    const replyText = result.aiMessage.content;

    return new ReadableStream<any>({
      start(controller) {
        controller.enqueue({
          id: randomUUID(),
          delta: { role: "assistant" as const, content: replyText },
        });
        controller.enqueue(FlushSentinel);
        controller.close();
      },
    });
  }
}
