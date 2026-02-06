import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { Env } from "./lib/types";

import visionApp from "./routes/vision";
import chatApp from "./routes/chat";
import insightsApp from "./routes/insights";
import statusApp from "./routes/status";

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", secureHeaders());
app.use(
  "/api/*",
  cors({
    origin: [
      "https://claudiaflow.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Device-ID"],
    maxAge: 86400,
  }),
);

// Global error handler
app.onError((err, c) => {
  console.error(`[${c.req.method}] ${c.req.path}:`, err.message);
  return c.json(
    {
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      request_id: crypto.randomUUID(),
    },
    500,
  );
});

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "claudiaflow-api" }));

// Route mounting
app.route("/api/ai/vision-extract", visionApp);
app.route("/api/ai/chat", chatApp);
app.route("/api/ai/insights", insightsApp);
app.route("/api/ai/key-status", statusApp);

// 404
app.notFound((c) =>
  c.json(
    {
      error: "NOT_FOUND",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404,
  ),
);

export default app;
