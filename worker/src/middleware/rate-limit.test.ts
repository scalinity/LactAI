import { describe, it, expect, vi, beforeEach } from "vitest";
import { env, createExecutionContext } from "cloudflare:test";
import { Hono } from "hono";
import { deviceIdMiddleware, dailyBudgetMiddleware } from "./rate-limit";
import type { Env } from "../lib/types";

describe("Rate Limit Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEnv: Env = {
    ...env,
    IMAGE_CACHE: env.IMAGE_CACHE,
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
    VISION_MODEL: "vision-model",
    CHAT_MODEL: "chat-model",
    INSIGHTS_MODEL: "insights-model",
    MAX_IMAGE_SIZE_BYTES: "10485760",
    MAX_TOKENS_VISION: "2000",
    MAX_TOKENS_CHAT: "1000",
    MAX_TOKENS_INSIGHTS: "1500",
    MAX_DAILY_REQUESTS_PER_DEVICE: "100",
    APP_REFERER: "http://localhost",
    APP_TITLE: "Test App",
  };

  describe("deviceIdMiddleware", () => {
    it("should accept valid device ID", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware);
      app.get("/test", (c) => c.json({ success: true }));

      const req = new Request("http://localhost/test", {
        headers: {
          "X-Device-ID": "valid-device-id-1234567890",
        },
      });

      const res = await app.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
    });

    it("should reject missing device ID", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware);
      app.get("/test", (c) => c.json({ success: true }));

      const req = new Request("http://localhost/test");
      const res = await app.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "MISSING_DEVICE_ID",
        message: expect.stringContaining("X-Device-ID"),
      });
    });

    it("should reject device ID shorter than 16 chars", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware);
      app.get("/test", (c) => c.json({ success: true }));

      const req = new Request("http://localhost/test", {
        headers: {
          "X-Device-ID": "short",
        },
      });

      const res = await app.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "MISSING_DEVICE_ID",
      });
    });

    it("should reject device ID longer than 128 chars", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware);
      app.get("/test", (c) => c.json({ success: true }));

      const longId = "a".repeat(129);
      const req = new Request("http://localhost/test", {
        headers: {
          "X-Device-ID": longId,
        },
      });

      const res = await app.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "MISSING_DEVICE_ID",
      });
    });

    it("should accept device ID at minimum length (16 chars)", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware);
      app.get("/test", (c) => c.json({ success: true }));

      const req = new Request("http://localhost/test", {
        headers: {
          "X-Device-ID": "a".repeat(16),
        },
      });

      const res = await app.fetch(req, mockEnv, createExecutionContext());
      expect(res.status).toBe(200);
    });

    it("should accept device ID at maximum length (128 chars)", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware);
      app.get("/test", (c) => c.json({ success: true }));

      const req = new Request("http://localhost/test", {
        headers: {
          "X-Device-ID": "a".repeat(128),
        },
      });

      const res = await app.fetch(req, mockEnv, createExecutionContext());
      expect(res.status).toBe(200);
    });

    it("should accept device IDs with various characters", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware);
      app.get("/test", (c) => c.json({ success: true }));

      const validIds = [
        "1234567890123456",
        "abcdef1234567890",
        "device-id-with-dashes-12345",
        "device_id_with_underscores_123",
        "MixedCaseDeviceId123",
      ];

      for (const deviceId of validIds) {
        const req = new Request("http://localhost/test", {
          headers: { "X-Device-ID": deviceId },
        });

        const res = await app.fetch(req, mockEnv, createExecutionContext());
        expect(res.status).toBe(200);
      }
    });
  });

  describe("dailyBudgetMiddleware", () => {
    it("should allow requests under daily limit", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware, dailyBudgetMiddleware);
      app.post("/test", (c) => c.json({ success: true }));

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: {
          "X-Device-ID": "budget-device-under-limit-123",
        },
      });

      const res = await app.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
    });

    it("should block requests exceeding daily limit", async () => {
      const limitedEnv = {
        ...mockEnv,
        MAX_DAILY_REQUESTS_PER_DEVICE: "2",
      };

      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware, dailyBudgetMiddleware);
      app.post("/test", (c) => c.json({ success: true }));

      const deviceId = "budget-device-limit-test-456";

      // First two requests should succeed
      for (let i = 0; i < 2; i++) {
        const req = new Request("http://localhost/test", {
          method: "POST",
          headers: { "X-Device-ID": deviceId },
        });

        const res = await app.fetch(req, limitedEnv, createExecutionContext());
        expect(res.status).toBe(200);
      }

      // Wait for KV writes to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Third request should be blocked
      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "X-Device-ID": deviceId },
      });

      const res = await app.fetch(req, limitedEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(429);
      expect(json).toMatchObject({
        error: "DAILY_LIMIT_EXCEEDED",
        message: expect.stringContaining("2"),
        resets: "midnight UTC",
      });
    });

    it("should track different devices independently", async () => {
      const limitedEnv = {
        ...mockEnv,
        MAX_DAILY_REQUESTS_PER_DEVICE: "1",
      };

      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware, dailyBudgetMiddleware);
      app.post("/test", (c) => c.json({ success: true }));

      const device1 = "independent-device-1-abcdefgh";
      const device2 = "independent-device-2-ijklmnop";

      // First request from device 1
      const req1 = new Request("http://localhost/test", {
        method: "POST",
        headers: { "X-Device-ID": device1 },
      });
      const res1 = await app.fetch(req1, limitedEnv, createExecutionContext());
      expect(res1.status).toBe(200);

      // First request from device 2 should still work
      const req2 = new Request("http://localhost/test", {
        method: "POST",
        headers: { "X-Device-ID": device2 },
      });
      const res2 = await app.fetch(req2, limitedEnv, createExecutionContext());
      expect(res2.status).toBe(200);

      // Wait for KV writes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second request from device 1 should be blocked
      const req3 = new Request("http://localhost/test", {
        method: "POST",
        headers: { "X-Device-ID": device1 },
      });
      const res3 = await app.fetch(req3, limitedEnv, createExecutionContext());
      expect(res3.status).toBe(429);

      // Second request from device 2 should also be blocked
      const req4 = new Request("http://localhost/test", {
        method: "POST",
        headers: { "X-Device-ID": device2 },
      });
      const res4 = await app.fetch(req4, limitedEnv, createExecutionContext());
      expect(res4.status).toBe(429);
    });

    it("should increment counter on each request", async () => {
      const limitedEnv = {
        ...mockEnv,
        MAX_DAILY_REQUESTS_PER_DEVICE: "5",
      };

      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware, dailyBudgetMiddleware);
      app.post("/test", (c) => c.json({ success: true }));

      const deviceId = "counter-increment-device-qwerty";

      // Make 5 requests (all should succeed)
      for (let i = 0; i < 5; i++) {
        const req = new Request("http://localhost/test", {
          method: "POST",
          headers: { "X-Device-ID": deviceId },
        });

        const res = await app.fetch(req, limitedEnv, createExecutionContext());
        expect(res.status).toBe(200);
      }

      // Wait for KV writes
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 6th request should be blocked
      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "X-Device-ID": deviceId },
      });

      const res = await app.fetch(req, limitedEnv, createExecutionContext());
      expect(res.status).toBe(429);
    });

    it("should use today's date in KV key", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware, dailyBudgetMiddleware);
      app.post("/test", (c) => c.json({ success: true }));

      const deviceId = "date-key-device-asdfgh";

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "X-Device-ID": deviceId },
      });

      await app.fetch(req, mockEnv, createExecutionContext());

      // Wait for KV write
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify the key format: daily:{deviceId}:{YYYY-MM-DD}
      const today = new Date().toISOString().slice(0, 10);
      const expectedKey = `daily:${deviceId}:${today}`;

      const value = await mockEnv.IMAGE_CACHE.get(expectedKey);
      expect(value).not.toBeNull();
      expect(parseInt(value!, 10)).toBeGreaterThan(0);
    });

    it("should set 24-hour TTL on KV entries", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware, dailyBudgetMiddleware);
      app.post("/test", (c) => c.json({ success: true }));

      const mockPut = vi.spyOn(mockEnv.IMAGE_CACHE, "put");

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "X-Device-ID": "ttl-test-device-zxcvbn" },
      });

      await app.fetch(req, mockEnv, createExecutionContext());

      // Wait for async KV operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockPut).toHaveBeenCalledWith(
        expect.stringMatching(/^daily:/),
        expect.any(String),
        { expirationTtl: 86400 },
      );
    });

    it("should handle missing counter as zero", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware, dailyBudgetMiddleware);
      app.post("/test", (c) => c.json({ success: true }));

      const deviceId = "new-device-no-counter-123456";

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "X-Device-ID": deviceId },
      });

      const res = await app.fetch(req, mockEnv, createExecutionContext());
      expect(res.status).toBe(200);

      // Wait for KV write
      await new Promise((resolve) => setTimeout(resolve, 100));

      const today = new Date().toISOString().slice(0, 10);
      const key = `daily:${deviceId}:${today}`;
      const value = await mockEnv.IMAGE_CACHE.get(key);

      expect(value).toBe("1");
    });
  });

  describe("Combined Middleware", () => {
    it("should require device ID before checking budget", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware, dailyBudgetMiddleware);
      app.post("/test", (c) => c.json({ success: true }));

      const req = new Request("http://localhost/test", {
        method: "POST",
      });

      const res = await app.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json).toMatchObject({
        error: "MISSING_DEVICE_ID",
      });
    });

    it("should pass both middleware checks for valid requests", async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use("*", deviceIdMiddleware, dailyBudgetMiddleware);
      app.post("/test", (c) => c.json({ success: true }));

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: {
          "X-Device-ID": "valid-combined-device-1234567890",
        },
      });

      const res = await app.fetch(req, mockEnv, createExecutionContext());
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
    });
  });
});
