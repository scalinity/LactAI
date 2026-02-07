import { Hono } from "hono";
import type { Env } from "../lib/types";
import { deviceIdMiddleware } from "../middleware/rate-limit";

const statusApp = new Hono<{ Bindings: Env }>();

statusApp.use("*", deviceIdMiddleware);

statusApp.get("/", async (c) => {
  try {
    const response = await fetch(`${c.env.OPENROUTER_BASE_URL}/auth/key`, {
      headers: { Authorization: `Bearer ${c.env.OPENROUTER_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return c.json({ success: true, data: { has_credits: false } });
    }

    const keyInfo = (await response.json()) as {
      data?: { usage?: number; limit?: number | null };
    };

    return c.json({
      success: true,
      data: {
        has_credits:
          keyInfo.data?.limit === null ||
          (keyInfo.data?.limit ?? 0) > (keyInfo.data?.usage ?? 0),
      },
    });
  } catch {
    return c.json({
      success: true,
      data: { has_credits: null },
    });
  }
});

export default statusApp;
