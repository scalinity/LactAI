import { createMiddleware } from "hono/factory";
import type { Env } from "../lib/types";

/**
 * Rate limiter using Cloudflare KV for persistence.
 *
 * KNOWN LIMITATIONS:
 * 1. TOCTOU race: KV-based rate limiting has a race condition between
 *    get (read current count) and put (write incremented count). Under
 *    high concurrency, this could allow slightly more requests than the
 *    configured limit.
 * 2. Partial PUT failure: If one counter PUT succeeds and the other fails
 *    (e.g., worker timeout), the user's quota is decremented without
 *    receiving service. Impact is minor (1-2 requests per failure).
 *
 * These limitations are acceptable for the current usage pattern
 * (low-traffic consumer app). For strict enforcement, migrate to
 * Durable Objects which support atomic read-modify-write.
 *
 * Rate limiting also uses CF-Connecting-IP as a secondary key alongside
 * X-Device-ID to mitigate device ID rotation attacks.
 */

const DEFAULT_DAILY_LIMIT = 100;
const IP_LIMIT_MULTIPLIER = 5;
const SECONDS_PER_DAY = 86_400;
const RETRY_AFTER_SECONDS = 3600;

function parseCounter(str: string | null): number {
  if (!str) return 0;
  const parsed = parseInt(str, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseLimit(envValue: string | undefined, fallback: number): number {
  if (!envValue) return fallback;
  const parsed = parseInt(envValue, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const deviceIdMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const deviceId = c.req.header("X-Device-ID");
    if (!deviceId || !UUID_V4_PATTERN.test(deviceId)) {
      return c.json(
        {
          error: "INVALID_DEVICE_ID",
          message: "X-Device-ID header must be a valid UUID v4",
        },
        400,
      );
    }
    await next();
  },
);

export const dailyBudgetMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const deviceId = c.req.header("X-Device-ID")!;
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
      null;
    const today = new Date().toISOString().slice(0, 10);

    const deviceKey = `daily:${deviceId}:${today}`;
    const max = parseLimit(
      c.env.MAX_DAILY_REQUESTS_PER_DEVICE,
      DEFAULT_DAILY_LIMIT,
    );
    const ipMax = max * IP_LIMIT_MULTIPLIER;

    // Always check device-based rate limit; only check IP if available
    const ipKey = ip ? `daily-ip:${ip}:${today}` : null;
    const [deviceStr, ipStr] = await Promise.all([
      c.env.IMAGE_CACHE.get(deviceKey),
      ipKey ? c.env.IMAGE_CACHE.get(ipKey) : Promise.resolve(null),
    ]);

    const deviceCurrent = parseCounter(deviceStr);
    const ipCurrent = parseCounter(ipStr);

    if (deviceCurrent >= max) {
      return c.json(
        {
          error: "DAILY_LIMIT_EXCEEDED",
          message: `Maximum ${max} AI requests per day reached`,
          resets: "midnight UTC",
        },
        {
          status: 429,
          headers: { "Retry-After": String(RETRY_AFTER_SECONDS) },
        },
      );
    }

    if (ipKey && ipCurrent >= ipMax) {
      return c.json(
        {
          error: "DAILY_LIMIT_EXCEEDED",
          message: "Rate limit exceeded for this network",
          resets: "midnight UTC",
        },
        {
          status: 429,
          headers: { "Retry-After": String(RETRY_AFTER_SECONDS) },
        },
      );
    }

    // Increment counters (await, not waitUntil)
    const puts: Promise<void>[] = [
      c.env.IMAGE_CACHE.put(deviceKey, String(deviceCurrent + 1), {
        expirationTtl: SECONDS_PER_DAY,
      }),
    ];
    if (ipKey) {
      puts.push(
        c.env.IMAGE_CACHE.put(ipKey, String(ipCurrent + 1), {
          expirationTtl: SECONDS_PER_DAY,
        }),
      );
    }
    await Promise.all(puts);

    await next();
  },
);
