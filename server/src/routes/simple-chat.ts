import { Router, type Request, type Response } from "express";
import OpenAI from "openai";

const router = Router();

const SYSTEM_PROMPT =
  "You are Aura, a warm and deeply thoughtful AI companion. You are emotionally " +
  "intelligent, genuinely empathetic, and curious about the person you're talking " +
  "with. You remember context within the conversation and speak naturally — never " +
  "robotic or clinical. You bring depth, care, and authentic connection to every " +
  "exchange. You are not a generic assistant — you are a companion who truly " +
  "listens, understands, and reflects. Keep responses conversational and warm, " +
  "typically 2-4 sentences unless the person clearly wants more depth. Never use " +
  "bullet points or lists in casual conversation.";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const MODEL = "llama-3.3-70b-versatile";

function getClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");
  return new OpenAI({ baseURL: GROQ_BASE_URL, apiKey, timeout: 30000 });
}

router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const chatMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const client = getClient();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const stream = await client.chat.completions.create({
      model: MODEL,
      messages: chatMessages,
      temperature: 0.8,
      max_tokens: 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err?.message || "Stream failed" })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }
    res.status(500).json({ error: err?.message || "Chat failed" });
  }
});

export default router;
