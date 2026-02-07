import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { hashImage, getCachedExtraction, cacheExtraction } from "./image-cache";
import type { VisionExtractResponse } from "./types";

describe("Image Cache", () => {
  beforeEach(async () => {
    // Clear cache before each test
    const keys = await env.IMAGE_CACHE.list();
    for (const key of keys.keys) {
      await env.IMAGE_CACHE.delete(key.name);
    }
  });

  describe("hashImage", () => {
    it("should generate consistent hash for same input", async () => {
      const input = "test-image-data-123";
      const hash1 = await hashImage(input);
      const hash2 = await hashImage(input);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeTruthy();
      expect(typeof hash1).toBe("string");
    });

    it("should generate different hashes for different inputs", async () => {
      const input1 = "image-data-1";
      const input2 = "image-data-2";

      const hash1 = await hashImage(input1);
      const hash2 = await hashImage(input2);

      expect(hash1).not.toBe(hash2);
    });

    it("should generate hex string hash", async () => {
      const hash = await hashImage("test-data");

      // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle empty string", async () => {
      const hash = await hashImage("");
      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle large input", async () => {
      const largeInput = "x".repeat(1000000); // 1MB
      const hash = await hashImage(largeInput);

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should handle special characters", async () => {
      const input = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
      const hash = await hashImage(input);

      expect(hash).toBeTruthy();
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should generate different hashes for similar inputs", async () => {
      const hash1 = await hashImage("test-data");
      const hash2 = await hashImage("test-data ");
      const hash3 = await hashImage("test-datA");

      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash2).not.toBe(hash3);
    });
  });

  describe("getCachedExtraction", () => {
    it("should return null for non-existent cache entry", async () => {
      const result = await getCachedExtraction(
        env.IMAGE_CACHE,
        "non-existent-hash",
      );

      expect(result).toBeNull();
    });

    it("should retrieve cached extraction", async () => {
      const hash = "test-hash-123";
      const data: VisionExtractResponse = {
        entries: [
          {
            timestamp_local: "2024-01-01T10:00:00",
            amount: 120,
            unit: "ml",
            confidence: 0.95,
            assumptions: [],
          },
        ],
        warnings: ["test warning"],
      };

      // Cache the data
      await env.IMAGE_CACHE.put(`vision:${hash}`, JSON.stringify(data));

      const result = await getCachedExtraction(env.IMAGE_CACHE, hash);

      expect(result).not.toBeNull();
      expect(result).toEqual(data);
    });

    it("should handle malformed JSON in cache", async () => {
      const hash = "malformed-hash";

      // Store invalid JSON
      await env.IMAGE_CACHE.put(`vision:${hash}`, "invalid json");

      // KV .get() with "json" type throws on invalid JSON
      await expect(
        getCachedExtraction(env.IMAGE_CACHE, hash),
      ).rejects.toThrow();
    });

    it("should use correct key prefix", async () => {
      const hash = "prefix-test-hash";
      const data: VisionExtractResponse = {
        entries: [],
        warnings: [],
      };

      // Cache with correct prefix
      await env.IMAGE_CACHE.put(`vision:${hash}`, JSON.stringify(data));

      const result = await getCachedExtraction(env.IMAGE_CACHE, hash);
      expect(result).toEqual(data);

      // Verify it doesn't match without prefix
      const wrongKey = await env.IMAGE_CACHE.get(hash);
      expect(wrongKey).toBeNull();
    });

    it("should return complete vision response structure", async () => {
      const hash = "complete-structure-hash";
      const data: VisionExtractResponse = {
        entries: [
          {
            timestamp_local: "2024-01-15T14:30:00",
            amount: 85,
            unit: "ml",
            notes: "left breast",
            confidence: 0.88,
            assumptions: ["timezone assumed", "date inferred"],
          },
          {
            timestamp_local: "2024-01-15T16:00:00",
            amount: 95,
            unit: "ml",
            confidence: 0.92,
            assumptions: [],
          },
        ],
        warnings: ["handwriting unclear", "time partially obscured"],
      };

      await env.IMAGE_CACHE.put(`vision:${hash}`, JSON.stringify(data));

      const result = await getCachedExtraction(env.IMAGE_CACHE, hash);

      expect(result).toEqual(data);
      expect(result?.entries).toHaveLength(2);
      expect(result?.warnings).toHaveLength(2);
      expect(result?.entries[0].notes).toBe("left breast");
    });
  });

  describe("cacheExtraction", () => {
    it("should cache extraction data", async () => {
      const hash = "cache-test-hash";
      const data: VisionExtractResponse = {
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
      };

      await cacheExtraction(env.IMAGE_CACHE, hash, data);

      // Verify it was cached
      const cached = await env.IMAGE_CACHE.get(`vision:${hash}`, "json");
      expect(cached).toEqual(data);
    });

    it("should set expiration TTL", async () => {
      const hash = "ttl-test-hash";
      const data: VisionExtractResponse = {
        entries: [],
        warnings: [],
      };

      await cacheExtraction(env.IMAGE_CACHE, hash, data);

      // Verify metadata includes expiration
      const metadata = await env.IMAGE_CACHE.getWithMetadata(`vision:${hash}`);
      expect(metadata.value).toBeTruthy();
      // Note: In tests, we can't easily verify the exact TTL,
      // but we can confirm the data was stored
    });

    it("should use correct key format", async () => {
      const hash = "key-format-hash";
      const data: VisionExtractResponse = {
        entries: [],
        warnings: [],
      };

      await cacheExtraction(env.IMAGE_CACHE, hash, data);

      // Check the key includes the "vision:" prefix
      const keys = await env.IMAGE_CACHE.list({ prefix: "vision:" });
      const matchingKey = keys.keys.find((k) => k.name === `vision:${hash}`);

      expect(matchingKey).toBeDefined();
    });

    it("should overwrite existing cache entry", async () => {
      const hash = "overwrite-hash";
      const data1: VisionExtractResponse = {
        entries: [
          {
            timestamp_local: "2024-01-01T10:00:00",
            amount: 100,
            unit: "ml",
            confidence: 0.9,
            assumptions: [],
          },
        ],
        warnings: ["original"],
      };
      const data2: VisionExtractResponse = {
        entries: [
          {
            timestamp_local: "2024-01-01T11:00:00",
            amount: 150,
            unit: "ml",
            confidence: 0.95,
            assumptions: [],
          },
        ],
        warnings: ["updated"],
      };

      // Cache first version
      await cacheExtraction(env.IMAGE_CACHE, hash, data1);

      // Cache second version (should overwrite)
      await cacheExtraction(env.IMAGE_CACHE, hash, data2);

      // Verify only the second version is cached
      const cached = await getCachedExtraction(env.IMAGE_CACHE, hash);
      expect(cached).toEqual(data2);
      expect(cached?.warnings).toEqual(["updated"]);
    });

    it("should cache empty entries", async () => {
      const hash = "empty-entries-hash";
      const data: VisionExtractResponse = {
        entries: [],
        warnings: [],
      };

      await cacheExtraction(env.IMAGE_CACHE, hash, data);

      const cached = await getCachedExtraction(env.IMAGE_CACHE, hash);
      expect(cached).toEqual(data);
      expect(cached?.entries).toHaveLength(0);
    });

    it("should handle multiple warnings", async () => {
      const hash = "multiple-warnings-hash";
      const data: VisionExtractResponse = {
        entries: [],
        warnings: ["warning 1", "warning 2", "warning 3"],
      };

      await cacheExtraction(env.IMAGE_CACHE, hash, data);

      const cached = await getCachedExtraction(env.IMAGE_CACHE, hash);
      expect(cached?.warnings).toHaveLength(3);
    });
  });

  describe("Integration", () => {
    it("should hash, cache, and retrieve extraction data", async () => {
      const imageData = "test-image-base64-data-12345";
      const extractionData: VisionExtractResponse = {
        entries: [
          {
            timestamp_local: "2024-01-15T09:30:00",
            amount: 110,
            unit: "ml",
            notes: "morning expression",
            confidence: 0.93,
            assumptions: ["timezone UTC"],
          },
        ],
        warnings: ["image quality low"],
      };

      // 1. Hash the image
      const hash = await hashImage(imageData);
      expect(hash).toBeTruthy();

      // 2. Check cache (should be empty)
      const cachedBefore = await getCachedExtraction(env.IMAGE_CACHE, hash);
      expect(cachedBefore).toBeNull();

      // 3. Cache the extraction
      await cacheExtraction(env.IMAGE_CACHE, hash, extractionData);

      // 4. Retrieve from cache
      const cachedAfter = await getCachedExtraction(env.IMAGE_CACHE, hash);
      expect(cachedAfter).toEqual(extractionData);

      // 5. Hash the same image again (should get same hash)
      const hash2 = await hashImage(imageData);
      expect(hash2).toBe(hash);

      // 6. Retrieve again (should still work)
      const cachedAgain = await getCachedExtraction(env.IMAGE_CACHE, hash2);
      expect(cachedAgain).toEqual(extractionData);
    });

    it("should handle different images with different cache entries", async () => {
      const image1 = "image-1-data";
      const image2 = "image-2-data";

      const data1: VisionExtractResponse = {
        entries: [
          {
            timestamp_local: "2024-01-01T10:00:00",
            amount: 100,
            unit: "ml",
            confidence: 0.9,
            assumptions: [],
          },
        ],
        warnings: [],
      };

      const data2: VisionExtractResponse = {
        entries: [
          {
            timestamp_local: "2024-01-01T11:00:00",
            amount: 150,
            unit: "ml",
            confidence: 0.95,
            assumptions: [],
          },
        ],
        warnings: [],
      };

      // Hash and cache both images
      const hash1 = await hashImage(image1);
      const hash2 = await hashImage(image2);
      await cacheExtraction(env.IMAGE_CACHE, hash1, data1);
      await cacheExtraction(env.IMAGE_CACHE, hash2, data2);

      // Verify both are cached correctly
      const cached1 = await getCachedExtraction(env.IMAGE_CACHE, hash1);
      const cached2 = await getCachedExtraction(env.IMAGE_CACHE, hash2);

      expect(cached1).toEqual(data1);
      expect(cached2).toEqual(data2);
      expect(cached1).not.toEqual(cached2);
    });

    it("should handle cache hit scenario", async () => {
      const imageData = "cached-image-data";
      const hash = await hashImage(imageData);

      const data: VisionExtractResponse = {
        entries: [
          {
            timestamp_local: "2024-01-15T12:00:00",
            amount: 125,
            unit: "ml",
            confidence: 0.97,
            assumptions: [],
          },
        ],
        warnings: [],
      };

      // First request - cache miss
      let cached = await getCachedExtraction(env.IMAGE_CACHE, hash);
      expect(cached).toBeNull();

      // Cache the result
      await cacheExtraction(env.IMAGE_CACHE, hash, data);

      // Second request - cache hit
      cached = await getCachedExtraction(env.IMAGE_CACHE, hash);
      expect(cached).toEqual(data);

      // Third request - still cache hit
      cached = await getCachedExtraction(env.IMAGE_CACHE, hash);
      expect(cached).toEqual(data);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long hash values", async () => {
      // SHA-256 always produces 64 hex chars, but test with long input
      const longInput = "x".repeat(10000);
      const hash = await hashImage(longInput);

      const data: VisionExtractResponse = {
        entries: [],
        warnings: [],
      };

      await cacheExtraction(env.IMAGE_CACHE, hash, data);
      const cached = await getCachedExtraction(env.IMAGE_CACHE, hash);

      expect(cached).toEqual(data);
    });

    it("should handle special characters in extraction data", async () => {
      const hash = "special-chars-hash";
      const data: VisionExtractResponse = {
        entries: [
          {
            timestamp_local: "2024-01-01T10:00:00",
            amount: 120,
            unit: "ml",
            notes: "Special: !@#$%^&*()_+-=[]{}|;:',.<>?/~`",
            confidence: 0.95,
            assumptions: ["contains unicode: 你好 世界"],
          },
        ],
        warnings: ["emoji test: 😀 🎉 ✨"],
      };

      await cacheExtraction(env.IMAGE_CACHE, hash, data);
      const cached = await getCachedExtraction(env.IMAGE_CACHE, hash);

      expect(cached).toEqual(data);
    });

    it("should handle large entry arrays", async () => {
      const hash = "large-array-hash";
      const entries = Array.from({ length: 100 }, (_, i) => ({
        timestamp_local: `2024-01-01T${String(i % 24).padStart(2, "0")}:00:00`,
        amount: 100 + i,
        unit: "ml" as const,
        confidence: 0.9,
        assumptions: [],
      }));

      const data: VisionExtractResponse = {
        entries,
        warnings: [],
      };

      await cacheExtraction(env.IMAGE_CACHE, hash, data);
      const cached = await getCachedExtraction(env.IMAGE_CACHE, hash);

      expect(cached?.entries).toHaveLength(100);
      expect(cached).toEqual(data);
    });
  });
});
