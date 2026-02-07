import { Hono } from "hono";
import type { Env } from "../lib/types";
import { ImageGenerateRequestSchema } from "../lib/schemas";
import { deviceIdMiddleware } from "../middleware/rate-limit";

const imageApp = new Hono<{ Bindings: Env }>();

imageApp.use("*", deviceIdMiddleware);

function buildImagePrompt(
  userPrompt: string,
  dataSummary?: string,
  preferredUnit?: string,
): string {
  const unit = preferredUnit ?? "ml";

  let prompt = `Create a beautiful, clean infographic about breast milk pumping/feeding data. Style: soft pastel colors (rose pink, cream, sage green, soft purple), rounded shapes, modern minimalist design, warm and encouraging tone. NO text that could be misspelled — use icons, charts, and visual elements instead of words where possible. Any numbers or labels must be EXACTLY as specified below.\n\n`;

  prompt += `User request: ${userPrompt}\n`;
  prompt += `Unit: ${unit}\n`;

  if (dataSummary) {
    // Extract key stats for the image prompt — send a condensed version
    // to keep the prompt reasonable for image generation
    const lines = dataSummary.split("\n");
    const keyLines = lines.filter(
      (l) =>
        l.includes("Pumping:") ||
        l.includes("Feeding:") ||
        l.includes("Total pumped:") ||
        l.includes("Total fed:") ||
        l.includes("Daily avg") ||
        l.includes("Trend:") ||
        l.includes("Side breakdown") ||
        l.includes("sessions") ||
        l.includes("Days logged") ||
        l.startsWith("##") ||
        l.startsWith("###"),
    );
    if (keyLines.length > 0) {
      prompt += `\nData to visualize:\n${keyLines.slice(0, 30).join("\n")}\n`;
    }
  }

  return prompt;
}

imageApp.post("/", async (c) => {
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

  const parsed = ImageGenerateRequestSchema.safeParse(body);
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

  const { prompt, data_summary, preferred_unit } = parsed.data;

  if (!c.env.OPENAI_API_KEY) {
    return c.json(
      {
        error: "CONFIG_ERROR",
        message: "Image generation is not configured",
        request_id: requestId,
      },
      503,
    );
  }

  const imagePrompt = buildImagePrompt(prompt, data_summary, preferred_unit);

  try {
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1-mini",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "medium",
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `OpenAI returned ${response.status}`;
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed?.error?.message ?? message;
      } catch {
        /* ignore */
      }
      console.error("OpenAI image generation error:", message);
      return c.json(
        {
          error: "UPSTREAM_ERROR",
          message: "Image generation failed",
          request_id: requestId,
        },
        502,
      );
    }

    const result = (await response.json()) as {
      data: Array<{ b64_json?: string; url?: string }>;
    };

    const imageData = result.data?.[0];
    if (!imageData?.b64_json) {
      return c.json(
        {
          error: "UPSTREAM_ERROR",
          message: "No image data in response",
          request_id: requestId,
        },
        502,
      );
    }

    return c.json(
      {
        data: {
          image_base64: imageData.b64_json,
          mime_type: "image/png",
        },
      },
      200,
      {
        "X-Request-ID": requestId,
      },
    );
  } catch (err) {
    console.error("Image generation error:", err);
    return c.json(
      {
        error: "UPSTREAM_ERROR",
        message: "Image generation service unavailable",
        request_id: requestId,
      },
      502,
    );
  }
});

export default imageApp;
