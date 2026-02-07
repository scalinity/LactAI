import { Hono } from "hono";
import type { Env } from "../lib/types";
import {
  OpenRouterClient,
  OpenRouterError,
  stripThinkTags,
} from "../lib/openrouter";
import { TitleRequestSchema } from "../lib/schemas";
import { deviceIdMiddleware } from "../middleware/rate-limit";

const titleApp = new Hono<{ Bindings: Env }>();

titleApp.use("*", deviceIdMiddleware);

const FALLBACK_TITLE_MODEL = "x-ai/grok-4.1-fast";

const TITLE_SYSTEM_PROMPT = `You generate short, descriptive titles for chat conversations. Given the first user message and assistant reply, produce a concise title (max 6 words). Return ONLY the title text, no quotes, no punctuation at the end, no explanation.`;

titleApp.post("/", async (c) => {
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

  const parsed = TitleRequestSchema.safeParse(body);
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

  const { user_message, assistant_message } = parsed.data;
  const client = new OpenRouterClient(c.env);
  const model = c.env.TITLE_MODEL || FALLBACK_TITLE_MODEL;

  try {
    const raw = await client.chat(
      model,
      TITLE_SYSTEM_PROMPT,
      [
        { role: "user", content: user_message },
        { role: "assistant", content: assistant_message },
        {
          role: "user",
          content: "Generate a short title for this conversation.",
        },
      ],
      30,
      0.3,
    );

    const cleaned = stripThinkTags(raw)
      .replace(/<[^>]*>/g, "")
      .replace(/[\r\n]+/g, " ")
      .replace(/^["']|["']$/g, "")
      .trim()
      .slice(0, 80);

    return c.json({ data: { title: cleaned || "New conversation" } });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      return c.json(
        {
          error: "UPSTREAM_ERROR",
          message: "Title generation unavailable",
          request_id: requestId,
        },
        502,
      );
    }
    throw err;
  }
});

export default titleApp;
