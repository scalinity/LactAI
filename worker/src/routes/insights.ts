import { Hono } from "hono";
import type { Env } from "../lib/types";
import {
  OpenRouterClient,
  OpenRouterError,
  extractJson,
} from "../lib/openrouter";
import { getInsightsSystemPrompt } from "../lib/prompts";
import { InsightsRequestSchema } from "../lib/schemas";
import { deviceIdMiddleware } from "../middleware/rate-limit";

const insightsApp = new Hono<{ Bindings: Env }>();

insightsApp.use("*", deviceIdMiddleware);

insightsApp.post("/", async (c) => {
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

  const parsed = InsightsRequestSchema.safeParse(body);
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

  const { entries, period, questions } = parsed.data;
  const client = new OpenRouterClient(c.env);
  const systemPrompt = getInsightsSystemPrompt();

  const userMessage = JSON.stringify({
    entries,
    period,
    questions: questions ?? [],
  });

  try {
    const responseText = await client.chat(
      c.env.INSIGHTS_MODEL,
      systemPrompt,
      [{ role: "user", content: userMessage }],
      parseInt(c.env.MAX_TOKENS_INSIGHTS, 10),
      0.3,
    );

    let data;
    try {
      data = JSON.parse(extractJson(responseText));
    } catch {
      return c.json(
        {
          error: "ANALYSIS_FAILED",
          message: "Insights model returned invalid JSON",
          request_id: requestId,
        },
        502,
      );
    }

    return c.json({ success: true, data, request_id: requestId });
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

export default insightsApp;
