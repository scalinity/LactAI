import { Hono } from "hono";
import type { Context } from "hono";
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
import {
  VisionRequestSchema,
  VisionResponseSchema,
  VisionEntrySchema,
} from "../lib/schemas";
import { deviceIdMiddleware } from "../middleware/rate-limit";

const DEFAULT_MAX_IMAGE_BYTES = 10_000_000;
const DEFAULT_MAX_TOKENS = 4096;
const MAX_WARNING_LENGTH = 500;
const MAX_WARNING_COUNT = 10;
const BYTES_PER_MB = 1024 * 1024;
const BASE64_SIZE_RATIO = 3 / 4;

function errorResponse(
  c: Context,
  code: string,
  message: string,
  requestId: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return c.json(
    { error: code, message, request_id: requestId, ...extra },
    status as Parameters<typeof c.json>[1],
  );
}

function parseVisionResponse(rawResponse: string): VisionExtractResponse {
  const jsonParsed = JSON.parse(extractJson(rawResponse));
  const validated = VisionResponseSchema.safeParse(jsonParsed);

  if (validated.success) {
    return validated.data;
  }

  // Fallback: validate entries individually
  const parsed =
    typeof jsonParsed === "object" &&
    jsonParsed !== null &&
    !Array.isArray(jsonParsed)
      ? (jsonParsed as Record<string, unknown>)
      : {};

  const rawEntries = Array.isArray(parsed.entries)
    ? (parsed.entries as unknown[])
    : [];
  const validEntries: VisionExtractResponse["entries"] = [];
  for (const e of rawEntries) {
    const result = VisionEntrySchema.safeParse(e);
    if (result.success) {
      validEntries.push(result.data);
    }
  }

  const rawWarnings: string[] = [];
  if (Array.isArray(parsed.warnings)) {
    for (const w of parsed.warnings as unknown[]) {
      if (typeof w === "string") {
        rawWarnings.push(w.slice(0, MAX_WARNING_LENGTH));
        if (rawWarnings.length >= MAX_WARNING_COUNT) break;
      }
    }
  }

  return {
    entries: validEntries,
    warnings: [...rawWarnings, "Response schema partially matched"],
  };
}

const visionApp = new Hono<{ Bindings: Env }>();

visionApp.use("*", deviceIdMiddleware);

visionApp.post("/", async (c) => {
  const requestId = crypto.randomUUID();

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(
      c,
      "INVALID_JSON",
      "Request body must be valid JSON",
      requestId,
      400,
    );
  }

  const parsed = VisionRequestSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues
      .map((i) => i.path.join("."))
      .filter(Boolean);
    const message =
      fieldErrors.length > 0
        ? `Invalid fields: ${fieldErrors.join(", ")}`
        : "Invalid request format";
    return errorResponse(c, "INVALID_REQUEST", message, requestId, 400);
  }

  const { image, mime_type, context } = parsed.data;

  // Check image size (base64 is ~33% larger than binary)
  const estimatedBytes = image.length * BASE64_SIZE_RATIO;
  const maxBytes =
    parseInt(c.env.MAX_IMAGE_SIZE_BYTES, 10) || DEFAULT_MAX_IMAGE_BYTES;
  if (estimatedBytes > maxBytes) {
    return errorResponse(
      c,
      "IMAGE_TOO_LARGE",
      `Maximum image size: ${Math.round(maxBytes / BYTES_PER_MB)}MB`,
      requestId,
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
      parseInt(c.env.MAX_TOKENS_VISION, 10) || DEFAULT_MAX_TOKENS,
    );

    let data: VisionExtractResponse;
    try {
      data = parseVisionResponse(rawResponse);
    } catch {
      return errorResponse(
        c,
        "EXTRACTION_FAILED",
        "Vision model returned invalid JSON",
        requestId,
        502,
        { fallback: "text" },
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
      return errorResponse(
        c,
        "UPSTREAM_ERROR",
        "AI service temporarily unavailable",
        requestId,
        status,
      );
    }
    return errorResponse(
      c,
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      requestId,
      500,
    );
  }
});

export default visionApp;
