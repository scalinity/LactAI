import { describe, it, expect, vi, beforeEach } from "vitest";
import { env, createExecutionContext } from "cloudflare:test";
import visionApp from "./vision";
import { OpenRouterError } from "../lib/openrouter";

describe("Vision Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEnv = {
    ...env,
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    VISION_MODEL: "anthropic/claude-3-opus",
    MAX_TOKENS_VISION: "2000",
    MAX_IMAGE_SIZE_BYTES: "10485760", // 10MB
    APP_REFERER: "http://localhost",
    APP_TITLE: "Test App",
    MAX_DAILY_REQUESTS_PER_DEVICE: "100",
  };

  const validBase64Image =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  describe("Validation", () => {
    it("should reject missing X-Device-ID header", async () => {
      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "MISSING_DEVICE_ID",
      });
    });

    it("should reject invalid JSON body", async () => {
      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "1234567890123456",
        },
        body: "not json",
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "INVALID_JSON",
      });
    });

    it("should reject missing image field", async () => {
      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "1234567890123456",
        },
        body: JSON.stringify({
          mime_type: "image/png",
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "INVALID_REQUEST",
      });
    });

    it("should reject invalid mime_type", async () => {
      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "1234567890123456",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/gif",
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "INVALID_REQUEST",
      });
    });

    it("should accept valid mime_types", async () => {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];

      for (const mimeType of validTypes) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    entries: [],
                    warnings: [],
                  }),
                },
              },
            ],
          }),
        });

        const req = new Request("http://localhost/vision", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Device-ID": `test-device-${mimeType.replace("/", "-")}`,
          },
          body: JSON.stringify({
            image: validBase64Image,
            mime_type: mimeType,
          }),
        });

        const res = await visionApp.fetch(
          req,
          mockEnv,
          createExecutionContext(),
        );
        expect(res.status).toBe(200);
      }
    });

    it("should reject images exceeding size limit", async () => {
      const smallEnv = {
        ...mockEnv,
        MAX_IMAGE_SIZE_BYTES: "100", // 100 bytes
      };

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "1234567890123456",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res = await visionApp.fetch(
        req,
        smallEnv,
        createExecutionContext(),
      );
      const json = await res.json();

      expect(res.status).toBe(413);
      expect(json).toMatchObject({
        error: "IMAGE_TOO_LARGE",
      });
    });
  });

  describe("Caching", () => {
    it("should return cached result for same image", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  entries: [
                    {
                      timestamp_local: "2024-01-01T10:00:00",
                      amount: 120,
                      unit: "ml",
                      confidence: 0.95,
                      assumptions: [],
                    },
                  ],
                  warnings: [],
                }),
              },
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      // First request - should call OpenRouter
      const req1 = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "cache-test-device-001",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res1 = await visionApp.fetch(
        req1,
        mockEnv,
        createExecutionContext(),
      );
      const json1 = await res1.json();

      expect(res1.status).toBe(200);
      expect(json1.cached).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Wait for cache to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second request - should use cache
      const req2 = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "cache-test-device-002",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res2 = await visionApp.fetch(
        req2,
        mockEnv,
        createExecutionContext(),
      );
      const json2 = await res2.json();

      expect(res2.status).toBe(200);
      expect(json2.cached).toBe(true);
      expect(json2.data).toEqual(json1.data);
      // fetch should still be called only once (from first request)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Extraction", () => {
    it("should successfully extract vision data", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  entries: [
                    {
                      timestamp_local: "2024-01-01T10:00:00",
                      amount: 120,
                      unit: "ml",
                      notes: "left breast",
                      confidence: 0.95,
                      assumptions: ["time zone assumed UTC"],
                    },
                  ],
                  warnings: ["handwriting unclear in one spot"],
                }),
              },
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "extract-test-device-123",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
          context: {
            timezone: "America/New_York",
            preferred_unit: "ml",
          },
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.entries).toHaveLength(1);
      expect(json.data.entries[0]).toMatchObject({
        amount: 120,
        unit: "ml",
        confidence: 0.95,
      });
      expect(json.data.warnings).toHaveLength(1);
    });

    it("should handle partial schema validation", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  entries: [
                    {
                      timestamp_local: "2024-01-01T10:00:00",
                      amount: 120,
                      unit: "ml",
                      confidence: 0.95,
                      assumptions: [],
                      // Missing some optional fields
                    },
                  ],
                  warnings: [],
                  // Extra unexpected field
                  extra_field: "ignored",
                }),
              },
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "partial-schema-device-456",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
    });

    it("should handle invalid JSON from vision model", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: "This is not valid JSON",
              },
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "invalid-json-device-789",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(502);
      expect(json).toMatchObject({
        error: "EXTRACTION_FAILED",
        message: "Vision model returned invalid JSON",
      });
    });

    it("should strip reasoning tags and extract JSON", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  '<think>This is internal reasoning</think>{"entries":[],"warnings":[]}',
              },
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "reasoning-tags-device-abc",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toMatchObject({
        entries: [],
        warnings: [],
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle retryable OpenRouter errors with 503", async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(
          new OpenRouterError(500, "Internal server error", "server_error"),
        );

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "error-test-device-123",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json).toMatchObject({
        error: "UPSTREAM_ERROR",
        message: "Internal server error",
      });
    });

    it("should handle non-retryable OpenRouter errors with 502", async () => {
      global.fetch = vi
        .fn()
        .mockRejectedValue(
          new OpenRouterError(400, "Invalid request", "invalid_request"),
        );

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "error-test-device-456",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(502);
      expect(json).toMatchObject({
        error: "UPSTREAM_ERROR",
        message: "Invalid request",
      });
    });

    it("should propagate non-OpenRouter errors", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network failure"));

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "network-error-device-789",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      await expect(
        visionApp.fetch(req, mockEnv, createExecutionContext()),
      ).rejects.toThrow("Network failure");
    });
  });

  describe("Context Handling", () => {
    it("should accept optional context parameters", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  entries: [],
                  warnings: [],
                }),
              },
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "context-test-device-xyz",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
          context: {
            timezone: "America/Los_Angeles",
            preferred_unit: "oz",
            date_hint: "2024-01-15",
          },
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      expect(res.status).toBe(200);
    });

    it("should work without context", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  entries: [],
                  warnings: [],
                }),
              },
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const req = new Request("http://localhost/vision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": "no-context-device-000",
        },
        body: JSON.stringify({
          image: validBase64Image,
          mime_type: "image/png",
        }),
      });

      const res = await visionApp.fetch(req, mockEnv, createExecutionContext());
      expect(res.status).toBe(200);
    });
  });
});
