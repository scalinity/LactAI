import { describe, it, expect, vi, beforeEach } from "vitest";
import { env, createExecutionContext } from "cloudflare:test";
import chatApp from "./chat";
import { OpenRouterError } from "../lib/openrouter";

describe("Chat Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TEST_DEVICE_ID = "550e8400-e29b-41d4-a716-446655440000";

  const mockEnv = {
    ...env,
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    CHAT_MODEL: "anthropic/claude-3-haiku",
    VISION_MODEL: "anthropic/claude-3-opus",
    MAX_TOKENS_CHAT: "1000",
    APP_REFERER: "http://localhost",
    APP_TITLE: "Test App",
    MAX_DAILY_REQUESTS_PER_DEVICE: "100",
  };

  describe("Validation", () => {
    it("should reject missing X-Device-ID header", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "hello" }],
        }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "INVALID_DEVICE_ID",
        message: expect.stringContaining("UUID"),
      });
    });

    it("should reject non-UUID X-Device-ID header", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "not-a-uuid",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "hello" }],
        }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "INVALID_DEVICE_ID",
      });
    });

    it("should reject invalid JSON body", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: "invalid json",
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "INVALID_JSON",
      });
    });

    it("should reject missing messages field", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: JSON.stringify({}),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "INVALID_REQUEST",
      });
    });

    it("should reject empty messages array", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: JSON.stringify({ messages: [] }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "INVALID_REQUEST",
      });
    });

    it("should reject messages with invalid role", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: JSON.stringify({
          messages: [{ role: "system", content: "invalid" }],
        }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "INVALID_REQUEST",
      });
    });
  });

  describe("Model Selection", () => {
    it("should use CHAT_MODEL for text-only messages", async () => {
      const mockStreamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
              ),
            );
            controller.close();
          },
        }),
        {
          headers: { "Content-Type": "text/event-stream" },
        },
      );

      global.fetch = vi.fn().mockResolvedValue(mockStreamResponse);

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("chat/completions"),
        expect.objectContaining({
          body: expect.stringContaining(mockEnv.CHAT_MODEL),
        }),
      );
    });

    it("should use VISION_MODEL for messages with images", async () => {
      const mockStreamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"I see"}}]}\n\n',
              ),
            );
            controller.close();
          },
        }),
        {
          headers: { "Content-Type": "text/event-stream" },
        },
      );

      global.fetch = vi.fn().mockResolvedValue(mockStreamResponse);

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "What's in this image?" },
                {
                  type: "image_url",
                  image_url: { url: "data:image/png;base64,abc" },
                },
              ],
            },
          ],
        }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("chat/completions"),
        expect.objectContaining({
          body: expect.stringContaining(mockEnv.VISION_MODEL),
        }),
      );
    });
  });

  describe("Streaming", () => {
    it("should return streaming response with correct headers", async () => {
      const mockStreamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
              ),
            );
            controller.close();
          },
        }),
        {
          headers: { "Content-Type": "text/event-stream" },
        },
      );

      global.fetch = vi.fn().mockResolvedValue(mockStreamResponse);

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");
      expect(res.headers.get("Cache-Control")).toBe("no-cache");
      expect(res.headers.get("X-Request-ID")).toBeTruthy();
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
        "http://localhost:3000",
      );
    });

    it("should handle missing upstream response body", async () => {
      const mockStreamResponse = new Response(null);
      global.fetch = vi.fn().mockResolvedValue(mockStreamResponse);

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(502);
      expect(json).toMatchObject({
        error: "UPSTREAM_ERROR",
        message: "No response body from upstream",
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle OpenRouter errors", async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(
          new OpenRouterError(429, "Rate limit exceeded", "rate_limit"),
        );

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(502);
      expect(json).toMatchObject({
        error: "UPSTREAM_ERROR",
        message: "AI service temporarily unavailable",
      });
    });

    it("should return 500 for non-OpenRouter errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hello" }],
        }),
      });

      const res = await chatApp.fetch(req, mockEnv, createExecutionContext());

      // Hono catches unhandled errors and returns 500
      expect(res.status).toBe(500);
    });
  });
});
