import type { Env } from "./types";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens: number;
  temperature?: number;
  response_format?: { type: "json_object" };
  stream?: boolean;
  reasoning?: { enabled: boolean };
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: { content: string; role: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Strip reasoning model preamble (e.g. <think>...</think> tags) and extract
 * the first valid JSON object or array from a model response.
 */
export function extractJson(raw: string): string {
  // Remove <think>...</think> blocks (reasoning models)
  let cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // If it already parses, return as-is
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Try to find the first { ... } or [ ... ]
  }

  const start = cleaned.search(/[{\[]/);
  if (start === -1) return raw;

  const opener = cleaned[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;

  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === opener) depth++;
    else if (cleaned[i] === closer) depth--;
    if (depth === 0) {
      return cleaned.slice(start, i + 1);
    }
  }

  return raw;
}

/**
 * Strip <think>...</think> tags from reasoning model output,
 * returning only the user-facing response text.
 */
export function stripThinkTags(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export class OpenRouterError extends Error {
  constructor(
    public status: number,
    message: string,
    public type: string,
  ) {
    super(message);
    this.name = "OpenRouterError";
  }

  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

export class OpenRouterClient {
  private baseUrl: string;
  private apiKey: string;
  private referer: string;
  private title: string;

  constructor(env: Env) {
    this.baseUrl = env.OPENROUTER_BASE_URL;
    this.apiKey = env.OPENROUTER_API_KEY;
    this.referer = env.APP_REFERER;
    this.title = env.APP_TITLE;
  }

  async chatCompletion(
    request: OpenRouterRequest,
  ): Promise<OpenRouterResponse> {
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": this.referer,
        "X-Title": this.title,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `OpenRouter returned ${response.status}`;
      let type = "upstream_error";
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed?.error?.message ?? message;
        type = parsed?.error?.type ?? type;
      } catch {
        /* ignore */
      }

      throw new OpenRouterError(response.status, message, type);
    }

    return response.json() as Promise<OpenRouterResponse>;
  }

  async chatCompletionStream(
    request: Omit<OpenRouterRequest, "stream">,
  ): Promise<Response> {
    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": this.referer,
        "X-Title": this.title,
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let message = `OpenRouter returned ${response.status}`;
      let type = "upstream_error";
      try {
        const parsed = JSON.parse(errorBody);
        message = parsed?.error?.message ?? message;
        type = parsed?.error?.type ?? type;
      } catch {
        /* ignore */
      }

      throw new OpenRouterError(response.status, message, type);
    }

    return response;
  }

  async visionExtract(
    model: string,
    base64Image: string,
    mimeType: string,
    systemPrompt: string,
    maxTokens: number,
  ): Promise<string> {
    const result = await this.chatCompletion({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            {
              type: "text",
              text: "Extract all breast milk expression data from this image. Return ONLY valid JSON.",
            },
          ],
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    return result.choices[0]?.message?.content ?? "";
  }

  async chat(
    model: string,
    systemPrompt: string,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    maxTokens: number,
    temperature = 0.7,
  ): Promise<string> {
    const result = await this.chatCompletion({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: maxTokens,
      temperature,
    });

    return result.choices[0]?.message?.content ?? "";
  }
}
