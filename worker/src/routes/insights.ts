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
    period,
    sessions: entries,
    questions: questions ?? [],
  });

  try {
    const result = await client.chatCompletion({
      model: c.env.INSIGHTS_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: parseInt(c.env.MAX_TOKENS_INSIGHTS, 10),
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const responseText = result.choices[0]?.message?.content ?? "";

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

    // Ensure response has expected shape with safe defaults and item-level validation
    const isValidTrend = (
      t: unknown,
    ): t is { metric: string; direction: string; description: string } =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as Record<string, unknown>).description === "string";

    const isValidPattern = (
      p: unknown,
    ): p is { type: string; description: string } =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as Record<string, unknown>).description === "string";

    const isValidTip = (t: unknown): t is { tip: string; rationale: string } =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as Record<string, unknown>).tip === "string";

    const rawTips = Array.isArray(data.tips)
      ? data.tips
      : Array.isArray(data.recommendations)
        ? data.recommendations.map((r: unknown) =>
            typeof r === "string" ? { tip: r, rationale: "" } : r,
          )
        : [];

    const response = {
      summary: typeof data.summary === "string" ? data.summary : "",
      trends: (Array.isArray(data.trends) ? data.trends : []).filter(
        isValidTrend,
      ),
      patterns: (Array.isArray(data.patterns) ? data.patterns : []).filter(
        isValidPattern,
      ),
      tips: rawTips.filter(isValidTip),
    };

    return c.json({ success: true, data: response, request_id: requestId });
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
