import { Hono } from "hono";
import type { Env, VisionExtractResponse } from "../lib/types";
import {
  OpenRouterClient,
  OpenRouterError,
  extractJson,
} from "../lib/openrouter";
import {
  hashImage,
  getCachedExtraction,
  cacheExtraction,
} from "../lib/image-cache";
import { getVisionSystemPrompt } from "../lib/prompts";
import { VisionRequestSchema, VisionResponseSchema } from "../lib/schemas";
import {
  deviceIdMiddleware,
  dailyBudgetMiddleware,
} from "../middleware/rate-limit";

const visionApp = new Hono<{ Bindings: Env }>();

visionApp.use("*", deviceIdMiddleware, dailyBudgetMiddleware);

visionApp.post("/", async (c) => {
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

  const parsed = VisionRequestSchema.safeParse(body);
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

  const { image, mime_type, context } = parsed.data;

  // Check image size (base64 is ~33% larger than binary)
  const estimatedBytes = (image.length * 3) / 4;
  const maxBytes = parseInt(c.env.MAX_IMAGE_SIZE_BYTES, 10);
  if (estimatedBytes > maxBytes) {
    return c.json(
      {
        error: "IMAGE_TOO_LARGE",
        message: `Maximum image size: ${Math.round(maxBytes / 1024 / 1024)}MB`,
        request_id: requestId,
      },
      413,
    );
  }

  // Check cache
  const imageHash = await hashImage(image);
  const cached = await getCachedExtraction(c.env.IMAGE_CACHE, imageHash);
  if (cached) {
    return c.json({
      success: true,
      data: cached,
      cached: true,
      request_id: requestId,
    });
  }

  // Call OpenRouter vision model
  const client = new OpenRouterClient(c.env);
  const systemPrompt = getVisionSystemPrompt(context);

  try {
    const rawResponse = await client.visionExtract(
      c.env.VISION_MODEL,
      image,
      mime_type,
      systemPrompt,
      parseInt(c.env.MAX_TOKENS_VISION, 10),
    );

    let data: VisionExtractResponse;
    try {
      const jsonParsed = JSON.parse(extractJson(rawResponse));
      const validated = VisionResponseSchema.safeParse(jsonParsed);
      if (!validated.success) {
        data = {
          entries: jsonParsed.entries ?? [],
          warnings: [
            ...(jsonParsed.warnings ?? []),
            "Response schema partially matched",
          ],
        };
      } else {
        data = validated.data;
      }
    } catch {
      return c.json(
        {
          error: "EXTRACTION_FAILED",
          message: "Vision model returned invalid JSON",
          fallback: "text",
          request_id: requestId,
        },
        502,
      );
    }

    // Cache result
    c.executionCtx.waitUntil(
      cacheExtraction(c.env.IMAGE_CACHE, imageHash, data),
    );

    return c.json({
      success: true,
      data,
      cached: false,
      request_id: requestId,
    });
  } catch (err) {
    if (err instanceof OpenRouterError) {
      const status = err.isRetryable ? 503 : 502;
      return c.json(
        {
          error: "UPSTREAM_ERROR",
          message: err.message,
          request_id: requestId,
        },
        status,
      );
    }
    throw err;
  }
});

export default visionApp;
