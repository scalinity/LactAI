import { Hono } from "hono";
import type { Env } from "../lib/types";

const statusApp = new Hono<{ Bindings: Env }>();

statusApp.get("/", async (c) => {
  try {
    const response = await fetch(`${c.env.OPENROUTER_BASE_URL}/auth/key`, {
      headers: { Authorization: `Bearer ${c.env.OPENROUTER_API_KEY}` },
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
        usage_this_month: keyInfo.data?.usage,
        limit: keyInfo.data?.limit,
      },
    });
  } catch {
    return c.json({ success: true, data: { has_credits: true } });
  }
});

export default statusApp;
