import type { VisionExtractResponse } from "./types";

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function hashImage(base64Data: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(base64Data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getCachedExtraction(
  kv: KVNamespace,
  imageHash: string,
): Promise<VisionExtractResponse | null> {
  const cached = await kv.get(`vision:${imageHash}`, "json");
  return cached as VisionExtractResponse | null;
}

export async function cacheExtraction(
  kv: KVNamespace,
  imageHash: string,
  data: VisionExtractResponse,
): Promise<void> {
  await kv.put(`vision:${imageHash}`, JSON.stringify(data), {
    expirationTtl: CACHE_TTL_SECONDS,
  });
}
