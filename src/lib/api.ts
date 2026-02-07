import { API_BASE_URL } from "./constants";
import type { VisionExtractResponse } from "@/types/upload";

export interface InsightTrend {
  metric: string;
  direction: "increasing" | "decreasing" | "stable" | "variable";
  description: string;
}

export interface InsightPattern {
  type: string;
  description: string;
}

export interface InsightTip {
  tip: string;
  rationale: string;
}

export interface InsightsResponse {
  summary: string;
  trends: InsightTrend[];
  patterns: InsightPattern[];
  tips: InsightTip[];
}

const API_TIMEOUT_MS = 30_000;
const INSIGHTS_TIMEOUT_MS = 45_000;
const STREAM_TIMEOUT_MS = 60_000;
const MAX_STREAM_LENGTH = 1_000_000;
const SSE_DATA_PREFIX = "data: ";
const OFFLINE_ERROR_MSG =
  "You appear to be offline. Please check your connection.";

function assertOnline(): void {
  if (!navigator.onLine) {
    throw new Error(OFFLINE_ERROR_MSG);
  }
}

function sanitizeErrorMessage(status: number, serverMessage?: string): string {
  const isClientError = status >= 400 && status < 500;
  return isClientError && serverMessage
    ? serverMessage
    : `Request failed (${status})`;
}

async function throwApiError(response: Response): Promise<never> {
  const error = await response
    .json()
    .catch(() => ({ message: "Request failed" }));
  throw new Error(sanitizeErrorMessage(response.status, error.message));
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let cachedDeviceId: string | null = null;

function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;
  let id: string | null = null;
  try {
    id = localStorage.getItem("claudiaflow-device-id");
  } catch {
    // localStorage unavailable (incognito mode, security policy)
  }
  if (!id || !UUID_PATTERN.test(id)) {
    id = crypto.randomUUID();
    try {
      localStorage.setItem("claudiaflow-device-id", id);
    } catch {
      // Failed to persist - ID will regenerate on reload
    }
  }
  cachedDeviceId = id;
  return id;
}

async function apiRequest<T>(
  path: string,
  body: unknown,
  timeoutMs = API_TIMEOUT_MS,
  signal?: AbortSignal,
): Promise<T> {
  assertOnline();

  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": getDeviceId(),
    },
    body: JSON.stringify(body),
    signal: combinedSignal,
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  let result: Record<string, unknown>;
  try {
    result = await response.json();
  } catch {
    throw new Error("Invalid response from server");
  }
  return result.data as T;
}

export async function extractFromImage(
  imageBase64: string,
  mimeType: string,
  context?: { timezone?: string; preferred_unit?: string; date_hint?: string },
): Promise<VisionExtractResponse> {
  return apiRequest<VisionExtractResponse>("/api/ai/vision-extract", {
    image: imageBase64,
    mime_type: mimeType,
    context,
  });
}

type MessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export async function streamChatMessage(
  messages: Array<{ role: "user" | "assistant"; content: MessageContent }>,
  callbacks: {
    onChunk: (text: string) => void;
    onDone: (fullText: string) => void;
    onError: (error: Error) => void;
  },
  context?: {
    baby_age_weeks?: number;
    expression_method?: string;
    data_summary?: string;
    session_count?: number;
    preferred_unit?: "ml" | "oz";
    thread_summaries?: string;
  },
  signal?: AbortSignal,
): Promise<void> {
  assertOnline();

  const timeoutSignal = AbortSignal.timeout(STREAM_TIMEOUT_MS);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": getDeviceId(),
    },
    body: JSON.stringify({ messages, context }),
    signal: combinedSignal,
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue;
        if (!trimmed.startsWith(SSE_DATA_PREFIX)) continue;

        const data = trimmed.slice(SSE_DATA_PREFIX.length);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            if (fullText.length > MAX_STREAM_LENGTH) {
              callbacks.onDone(fullText);
              return;
            }
            callbacks.onChunk(fullText);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    callbacks.onDone(fullText);
  } catch (err) {
    // Preserve partial content so the user doesn't lose what was already streamed
    if (fullText) {
      callbacks.onDone(fullText);
    }

    // Sanitize error message to avoid leaking server internals
    let safeMessage: string;
    if (err instanceof DOMException && err.name === "AbortError") {
      // Distinguish user cancellation from timeout
      safeMessage = signal?.aborted
        ? "Request was cancelled"
        : "Request timed out";
    } else {
      safeMessage = "Connection to server was interrupted";
    }
    callbacks.onError(new Error(safeMessage));
  } finally {
    reader.releaseLock();
  }
}

export async function generateChatTitle(
  userMessage: string,
  assistantMessage: string,
): Promise<string> {
  const result = await apiRequest<{ title: string }>("/api/ai/chat/title", {
    user_message: userMessage.slice(0, 2000),
    assistant_message: assistantMessage.slice(0, 2000),
  });
  return result.title;
}

export async function generateImage(
  prompt: string,
  context?: {
    data_summary?: string;
    preferred_unit?: "ml" | "oz";
  },
  signal?: AbortSignal,
): Promise<{ image_base64: string; mime_type: string }> {
  return apiRequest<{ image_base64: string; mime_type: string }>(
    "/api/ai/image-generate",
    {
      prompt,
      data_summary: context?.data_summary,
      preferred_unit: context?.preferred_unit,
    },
    60_000, // Image generation takes longer
    signal,
  );
}

export interface InsightsEntry {
  timestamp_local: string;
  amount: number;
  unit: string;
  session_type?: "feeding" | "pumping";
  side?: string;
  duration_min?: number;
  amount_left_ml?: number;
  amount_right_ml?: number;
}

export async function getInsights(
  entries: InsightsEntry[],
  period: string,
  signal?: AbortSignal,
): Promise<InsightsResponse> {
  assertOnline();

  const timeoutSignal = AbortSignal.timeout(INSIGHTS_TIMEOUT_MS);
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  const response = await fetch(`${API_BASE_URL}/api/ai/insights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": getDeviceId(),
    },
    body: JSON.stringify({ entries, period }),
    signal: combinedSignal,
  });

  if (!response.ok) {
    await throwApiError(response);
  }

  let result: Record<string, unknown>;
  try {
    result = await response.json();
  } catch {
    throw new Error("Invalid response from server");
  }
  return result.data as InsightsResponse;
}
