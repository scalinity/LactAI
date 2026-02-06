import { createMiddleware } from "hono/factory";
import type { Env } from "../lib/types";

export const deviceIdMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const deviceId = c.req.header("X-Device-ID");
    if (!deviceId || deviceId.length < 16 || deviceId.length > 128) {
      return c.json(
        {
          error: "MISSING_DEVICE_ID",
          message: "X-Device-ID header required (16-128 chars)",
        },
        400,
      );
    }
    c.set("deviceId" as never, deviceId as never);
    await next();
  },
);

export const dailyBudgetMiddleware = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    const deviceId = c.req.header("X-Device-ID")!;
    const today = new Date().toISOString().slice(0, 10);
    const kvKey = `daily:${deviceId}:${today}`;

    const currentStr = await c.env.IMAGE_CACHE.get(kvKey);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const max = parseInt(c.env.MAX_DAILY_REQUESTS_PER_DEVICE, 10);

    if (current >= max) {
      return c.json(
        {
          error: "DAILY_LIMIT_EXCEEDED",
          message: `Maximum ${max} AI requests per day reached`,
          resets: "midnight UTC",
        },
        429,
      );
    }

    c.executionCtx.waitUntil(
      c.env.IMAGE_CACHE.put(kvKey, String(current + 1), {
        expirationTtl: 86400,
      }),
    );

    await next();
  },
);
