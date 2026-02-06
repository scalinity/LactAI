import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OpenRouterClient,
  OpenRouterError,
  extractJson,
  stripThinkTags,
} from "./openrouter";
import type { Env } from "./types";

describe("OpenRouter Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEnv: Env = {
    OPENROUTER_API_KEY: "test-api-key",
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    VISION_MODEL: "anthropic/claude-3-opus",
    CHAT_MODEL: "anthropic/claude-3-haiku",
    INSIGHTS_MODEL: "anthropic/claude-3-sonnet",
    MAX_IMAGE_SIZE_BYTES: "10485760",
    MAX_TOKENS_VISION: "2000",
    MAX_TOKENS_CHAT: "1000",
    MAX_TOKENS_INSIGHTS: "1500",
    MAX_DAILY_REQUESTS_PER_DEVICE: "100",
    APP_REFERER: "http://localhost",
    APP_TITLE: "Test App",
    IMAGE_CACHE: {} as KVNamespace,
  };

  describe("OpenRouterError", () => {
    it("should create error with correct properties", () => {
      const error = new OpenRouterError(429, "Rate limited", "rate_limit");

      expect(error.status).toBe(429);
      expect(error.message).toBe("Rate limited");
      expect(error.type).toBe("rate_limit");
      expect(error.name).toBe("OpenRouterError");
    });

    it("should identify retryable errors", () => {
      const retryableErrors = [
        new OpenRouterError(429, "Too many requests", "rate_limit"),
        new OpenRouterError(500, "Internal error", "server_error"),
        new OpenRouterError(502, "Bad gateway", "bad_gateway"),
        new OpenRouterError(503, "Service unavailable", "unavailable"),
      ];

      retryableErrors.forEach((err) => {
        expect(err.isRetryable).toBe(true);
      });
    });

    it("should identify non-retryable errors", () => {
      const nonRetryableErrors = [
        new OpenRouterError(400, "Bad request", "invalid_request"),
        new OpenRouterError(401, "Unauthorized", "unauthorized"),
        new OpenRouterError(403, "Forbidden", "forbidden"),
        new OpenRouterError(404, "Not found", "not_found"),
      ];

      nonRetryableErrors.forEach((err) => {
        expect(err.isRetryable).toBe(false);
      });
    });
  });

  describe("extractJson", () => {
    it("should return valid JSON as-is", () => {
      const input = '{"key": "value"}';
      expect(extractJson(input)).toBe(input);
    });

    it("should extract JSON from text with think tags", () => {
      const input = '<think>reasoning here</think>{"result": 42}';
      const output = extractJson(input);
      expect(JSON.parse(output)).toEqual({ result: 42 });
    });

    it("should extract first JSON object from mixed content", () => {
      const input = 'Some text before {"data": "extracted"} and after';
      const output = extractJson(input);
      expect(JSON.parse(output)).toEqual({ data: "extracted" });
    });

    it("should extract JSON array", () => {
      const input = "prefix [1, 2, 3] suffix";
      const output = extractJson(input);
      expect(JSON.parse(output)).toEqual([1, 2, 3]);
    });

    it("should handle nested JSON", () => {
      const input = 'text {"outer": {"inner": "value"}} more text';
      const output = extractJson(input);
      expect(JSON.parse(output)).toEqual({ outer: { inner: "value" } });
    });

    it("should return original if no JSON found", () => {
      const input = "no json here";
      expect(extractJson(input)).toBe(input);
    });

    it("should handle multiple think tags", () => {
      const input =
        '<think>first</think>middle text<think>second</think>{"final": true}';
      const output = extractJson(input);
      expect(JSON.parse(output)).toEqual({ final: true });
    });
  });

  describe("stripThinkTags", () => {
    it("should remove think tags", () => {
      const input = "<think>internal reasoning</think>User-facing text";
      expect(stripThinkTags(input)).toBe("User-facing text");
    });

    it("should remove multiple think tags", () => {
      const input = "<think>first</think>text<think>second</think>more text";
      expect(stripThinkTags(input)).toBe("textmore text");
    });

    it("should handle multiline think tags", () => {
      const input = `<think>
        line 1
        line 2
      </think>Result`;
      expect(stripThinkTags(input).trim()).toBe("Result");
    });

    it("should return unchanged if no think tags", () => {
      const input = "Plain text response";
      expect(stripThinkTags(input)).toBe(input);
    });
  });

  describe("OpenRouterClient", () => {
    it("should construct with environment variables", () => {
      const client = new OpenRouterClient(mockEnv);
      expect(client).toBeDefined();
    });

    describe("chatCompletion", () => {
      it("should make successful chat completion request", async () => {
        const mockResponse = {
          id: "test-id",
          choices: [
            {
              message: { content: "Hello!", role: "assistant" },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const client = new OpenRouterClient(mockEnv);
        const result = await client.chatCompletion({
          model: "test-model",
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 100,
        });

        expect(result).toEqual(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith(
          "https://openrouter.ai/api/v1/chat/completions",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({
              Authorization: "Bearer test-api-key",
              "Content-Type": "application/json",
              "HTTP-Referer": "http://localhost",
              "X-Title": "Test App",
            }),
          }),
        );
      });

      it("should include temperature when provided", async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ choices: [] }),
        });

        const client = new OpenRouterClient(mockEnv);
        await client.chatCompletion({
          model: "test-model",
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 100,
          temperature: 0.5,
        });

        const fetchCall = vi.mocked(global.fetch).mock.calls[0];
        const body = JSON.parse(fetchCall[1]?.body as string);
        expect(body.temperature).toBe(0.5);
      });

      it("should throw OpenRouterError on API error", async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          text: async () =>
            JSON.stringify({
              error: {
                message: "Rate limit exceeded",
                type: "rate_limit",
              },
            }),
        });

        const client = new OpenRouterClient(mockEnv);

        await expect(
          client.chatCompletion({
            model: "test-model",
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 100,
          }),
        ).rejects.toThrow(OpenRouterError);

        try {
          await client.chatCompletion({
            model: "test-model",
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 100,
          });
        } catch (err) {
          expect(err).toBeInstanceOf(OpenRouterError);
          const error = err as OpenRouterError;
          expect(error.status).toBe(429);
          expect(error.message).toBe("Rate limit exceeded");
          expect(error.type).toBe("rate_limit");
        }
      });

      it("should handle malformed error response", async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => "Internal Server Error",
        });

        const client = new OpenRouterClient(mockEnv);

        await expect(
          client.chatCompletion({
            model: "test-model",
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 100,
          }),
        ).rejects.toThrow("OpenRouter returned 500");
      });
    });

    describe("chatCompletionStream", () => {
      it("should return streaming response", async () => {
        const mockStream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"delta": {"content": "Hi"}}\n\n',
              ),
            );
            controller.close();
          },
        });

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          body: mockStream,
        });

        const client = new OpenRouterClient(mockEnv);
        const response = await client.chatCompletionStream({
          model: "test-model",
          messages: [{ role: "user", content: "Hello" }],
          max_tokens: 100,
        });

        expect(response).toBeDefined();
        expect(response.body).toBeTruthy();

        const fetchCall = vi.mocked(global.fetch).mock.calls[0];
        const body = JSON.parse(fetchCall[1]?.body as string);
        expect(body.stream).toBe(true);
      });

      it("should throw OpenRouterError on stream error", async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: async () =>
            JSON.stringify({
              error: {
                message: "Invalid API key",
                type: "auth_error",
              },
            }),
        });

        const client = new OpenRouterClient(mockEnv);

        await expect(
          client.chatCompletionStream({
            model: "test-model",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 100,
          }),
        ).rejects.toThrow(OpenRouterError);
      });
    });

    describe("visionExtract", () => {
      it("should extract vision data from image", async () => {
        const mockResponse = {
          choices: [
            {
              message: {
                content: '{"entries": [], "warnings": []}',
                role: "assistant",
              },
              finish_reason: "stop",
            },
          ],
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const client = new OpenRouterClient(mockEnv);
        const result = await client.visionExtract(
          "vision-model",
          "base64data",
          "image/png",
          "System prompt",
          2000,
        );

        expect(result).toBe('{"entries": [], "warnings": []}');

        const fetchCall = vi.mocked(global.fetch).mock.calls[0];
        const body = JSON.parse(fetchCall[1]?.body as string);
        expect(body.response_format).toEqual({ type: "json_object" });
        expect(body.temperature).toBe(0.1);
        expect(body.messages).toHaveLength(2);
        expect(body.messages[0].role).toBe("system");
        expect(body.messages[1].role).toBe("user");
        expect(body.messages[1].content).toEqual([
          {
            type: "image_url",
            image_url: { url: "data:image/png;base64,base64data" },
          },
          {
            type: "text",
            text: expect.stringContaining("Extract all breast milk"),
          },
        ]);
      });

      it("should return empty string for empty response", async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ choices: [] }),
        });

        const client = new OpenRouterClient(mockEnv);
        const result = await client.visionExtract(
          "vision-model",
          "base64data",
          "image/jpeg",
          "System prompt",
          2000,
        );

        expect(result).toBe("");
      });
    });

    describe("chat", () => {
      it("should perform simple chat", async () => {
        const mockResponse = {
          choices: [
            {
              message: { content: "Assistant response", role: "assistant" },
              finish_reason: "stop",
            },
          ],
        };

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => mockResponse,
        });

        const client = new OpenRouterClient(mockEnv);
        const result = await client.chat(
          "chat-model",
          "System prompt",
          [{ role: "user", content: "Hello" }],
          1000,
        );

        expect(result).toBe("Assistant response");

        const fetchCall = vi.mocked(global.fetch).mock.calls[0];
        const body = JSON.parse(fetchCall[1]?.body as string);
        expect(body.temperature).toBe(0.7);
        expect(body.messages).toHaveLength(2);
      });

      it("should use custom temperature", async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: "Response" } }],
          }),
        });

        const client = new OpenRouterClient(mockEnv);
        await client.chat(
          "chat-model",
          "System prompt",
          [{ role: "user", content: "Hello" }],
          1000,
          0.3,
        );

        const fetchCall = vi.mocked(global.fetch).mock.calls[0];
        const body = JSON.parse(fetchCall[1]?.body as string);
        expect(body.temperature).toBe(0.3);
      });

      it("should return empty string for empty response", async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ choices: [] }),
        });

        const client = new OpenRouterClient(mockEnv);
        const result = await client.chat(
          "chat-model",
          "System prompt",
          [{ role: "user", content: "Hello" }],
          1000,
        );

        expect(result).toBe("");
      });
    });

    describe("Request Headers", () => {
      it("should include all required headers", async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ choices: [] }),
        });

        const client = new OpenRouterClient(mockEnv);
        await client.chatCompletion({
          model: "test-model",
          messages: [{ role: "user", content: "Hi" }],
          max_tokens: 100,
        });

        const fetchCall = vi.mocked(global.fetch).mock.calls[0];
        const headers = fetchCall[1]?.headers as Record<string, string>;

        expect(headers["Authorization"]).toBe("Bearer test-api-key");
        expect(headers["Content-Type"]).toBe("application/json");
        expect(headers["HTTP-Referer"]).toBe("http://localhost");
        expect(headers["X-Title"]).toBe("Test App");
      });
    });
  });
});
