import { Hono } from "hono";
import type { Env } from "../lib/types";
import { OpenRouterClient, OpenRouterError } from "../lib/openrouter";
import { getChatSystemPrompt } from "../lib/prompts";
import { ChatRequestSchema } from "../lib/schemas";
import { deviceIdMiddleware } from "../middleware/rate-limit";
import { getAllowedOrigins } from "../index";

const chatApp = new Hono<{ Bindings: Env }>();

chatApp.use("*", deviceIdMiddleware);

function hasImageContent(
  messages: Array<{ role: string; content: unknown }>,
): boolean {
  return messages.some(
    (m) =>
      Array.isArray(m.content) &&
      m.content.some((p: { type: string }) => p.type === "image_url"),
  );
}

chatApp.post("/", async (c) => {
  const requestId = crypto.randomUUID();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: "INVALID_JSON",
        message: "Request body must be valid JSON",
        request_id: requestId,
      },
      400,
    );
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        error: "INVALID_REQUEST",
        message: parsed.error.message,
        request_id: requestId,
      },
      400,
    );
  }

  const { messages, context } = parsed.data;
  const client = new OpenRouterClient(c.env);
  const systemPrompt = getChatSystemPrompt(context);

  // Use vision model when any message contains an image
  const model = hasImageContent(messages)
    ? c.env.VISION_MODEL
    : c.env.CHAT_MODEL;

  try {
    const upstreamResponse = await client.chatCompletionStream({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: parseInt(c.env.MAX_TOKENS_CHAT, 10),
      temperature: 0.7,
    });

    const upstreamBody = upstreamResponse.body;
    if (!upstreamBody) {
      return c.json(
        {
          error: "UPSTREAM_ERROR",
          message: "No response body from upstream",
          request_id: requestId,
        },
        502,
      );
    }

    const requestOrigin = c.req.header("Origin") ?? "";
    const allowedOrigins = getAllowedOrigins(c.env);
    const corsOrigin = allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0];

    return new Response(upstreamBody, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Request-ID": requestId,
        "Access-Control-Allow-Origin": corsOrigin,
        "Access-Control-Allow-Headers": "Content-Type, X-Device-ID",
      },
    });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return c.json(
        {
          error: "UPSTREAM_ERROR",
          message: "AI service temporarily unavailable",
          request_id: requestId,
        },
        502,
      );
    }
    throw err;
  }
});

export default chatApp;
