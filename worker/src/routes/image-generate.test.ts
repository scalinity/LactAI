import { describe, it, expect, vi, beforeEach } from "vitest";
import { env, createExecutionContext } from "cloudflare:test";
import imageApp from "./image-generate";

describe("Image Generate Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TEST_DEVICE_ID = "550e8400-e29b-41d4-a716-446655440000";

  const mockEnv = {
    ...env,
    OPENAI_API_KEY: "test-openai-key",
    MAX_DAILY_REQUESTS_PER_DEVICE: "100",
  };

  function makeRequest(body: unknown, deviceId = TEST_DEVICE_ID) {
    return new Request("http://localhost/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Device-ID": deviceId,
      },
      body: JSON.stringify(body),
    });
  }

  describe("Validation", () => {
    it("should reject missing X-Device-ID header", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test" }),
      });

      const res = await imageApp.fetch(req, mockEnv, createExecutionContext());
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: string };
      expect(json.error).toBe("INVALID_DEVICE_ID");
    });

    it("should reject invalid JSON body", async () => {
      const req = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-ID": TEST_DEVICE_ID,
        },
        body: "not json",
      });

      const res = await imageApp.fetch(req, mockEnv, createExecutionContext());
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: string };
      expect(json.error).toBe("INVALID_JSON");
    });

    it("should reject empty prompt", async () => {
      const res = await imageApp.fetch(
        makeRequest({ prompt: "" }),
        mockEnv,
        createExecutionContext(),
      );
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: string };
      expect(json.error).toBe("INVALID_REQUEST");
    });

    it("should reject prompt exceeding max length", async () => {
      const res = await imageApp.fetch(
        makeRequest({ prompt: "x".repeat(5001) }),
        mockEnv,
        createExecutionContext(),
      );
      expect(res.status).toBe(400);
      const json = (await res.json()) as { error: string };
      expect(json.error).toBe("INVALID_REQUEST");
    });
  });

  describe("Configuration", () => {
    it("should return 503 when OPENAI_API_KEY is not set", async () => {
      const envWithoutKey = { ...mockEnv, OPENAI_API_KEY: "" };
      const res = await imageApp.fetch(
        makeRequest({ prompt: "Create a weekly infographic" }),
        envWithoutKey,
        createExecutionContext(),
      );
      expect(res.status).toBe(503);
      const json = (await res.json()) as { error: string; message: string };
      expect(json.error).toBe("CONFIG_ERROR");
      expect(json.message).toBe("Image generation is not configured");
    });
  });

  describe("OpenAI integration", () => {
    it("should return image data on successful generation", async () => {
      const mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ";

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ b64_json: mockBase64 }],
          }),
          { status: 200 },
        ),
      );

      const res = await imageApp.fetch(
        makeRequest({ prompt: "Create a weekly infographic" }),
        mockEnv,
        createExecutionContext(),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        data: { image_base64: string; mime_type: string };
      };
      expect(json.data.image_base64).toBe(mockBase64);
      expect(json.data.mime_type).toBe("image/png");

      // Verify the OpenAI request was correct
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.openai.com/v1/images/generations",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-openai-key",
          }),
        }),
      );

      fetchSpy.mockRestore();
    });

    it("should return 502 when OpenAI returns an error", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ error: { message: "Rate limit exceeded" } }),
            { status: 429 },
          ),
        );

      const res = await imageApp.fetch(
        makeRequest({ prompt: "Create an infographic" }),
        mockEnv,
        createExecutionContext(),
      );

      expect(res.status).toBe(502);
      const json = (await res.json()) as { error: string; message: string };
      expect(json.error).toBe("UPSTREAM_ERROR");
      expect(json.message).toBe("Image generation failed");

      fetchSpy.mockRestore();
    });

    it("should return 502 when OpenAI response has no b64_json", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ data: [{ url: "https://example.com/img.png" }] }),
            { status: 200 },
          ),
        );

      const res = await imageApp.fetch(
        makeRequest({ prompt: "Create an infographic" }),
        mockEnv,
        createExecutionContext(),
      );

      expect(res.status).toBe(502);
      const json = (await res.json()) as { error: string; message: string };
      expect(json.error).toBe("UPSTREAM_ERROR");
      expect(json.message).toBe("No image data in response");

      fetchSpy.mockRestore();
    });

    it("should return 502 when fetch throws (network error)", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValueOnce(new Error("Network failure"));

      const res = await imageApp.fetch(
        makeRequest({ prompt: "Create an infographic" }),
        mockEnv,
        createExecutionContext(),
      );

      expect(res.status).toBe(502);
      const json = (await res.json()) as { error: string };
      expect(json.error).toBe("UPSTREAM_ERROR");

      fetchSpy.mockRestore();
    });

    it("should include data_summary context in prompt sent to OpenAI", async () => {
      const mockBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ";
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: [{ b64_json: mockBase64 }] }), {
            status: 200,
          }),
        );

      await imageApp.fetch(
        makeRequest({
          prompt: "Create a weekly infographic",
          data_summary:
            "### Today\nPumping: 3 sessions | Total: 300 ml\nFeeding: 2 sessions | Total: 200 ml",
          preferred_unit: "ml",
        }),
        mockEnv,
        createExecutionContext(),
      );

      // Verify the prompt sent to OpenAI includes data
      const fetchCall = fetchSpy.mock.calls[0];
      const sentBody = JSON.parse(fetchCall[1]?.body as string);
      expect(sentBody.prompt).toContain("Pumping:");
      expect(sentBody.prompt).toContain("Feeding:");
      expect(sentBody.prompt).toContain("Unit: ml");

      fetchSpy.mockRestore();
    });
  });
});
