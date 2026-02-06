import { API_BASE_URL } from "./constants";
import type { VisionExtractResponse } from "@/types/upload";

function getDeviceId(): string {
  let id = localStorage.getItem("claudiaflow-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("claudiaflow-device-id", id);
  }
  return id;
}

async function apiRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": getDeviceId(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  const result = await response.json();
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
  },
  context?: { baby_age_weeks?: number; expression_method?: string },
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": getDeviceId(),
    },
    body: JSON.stringify({ messages, context }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `API error: ${response.status}`);
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
        if (!trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            callbacks.onChunk(fullText);
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  callbacks.onDone(fullText);
}

export async function getInsights(
  entries: Array<{ timestamp_local: string; amount: number; unit: string }>,
  period?: string,
): Promise<unknown> {
  return apiRequest("/api/ai/insights", { entries, period });
}
