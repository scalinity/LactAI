import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { bodyLimit } from "hono/body-limit";
import type { Env } from "./lib/types";

import visionApp from "./routes/vision";
import chatApp from "./routes/chat";
import titleApp from "./routes/title";
import insightsApp from "./routes/insights";
import statusApp from "./routes/status";

const app = new Hono<{ Bindings: Env }>();

const PRODUCTION_ORIGINS = [
  "https://scalintiy.cloud",
  "https://www.scalintiy.cloud",
  "https://claudiaflow.app",
];
const DEV_ORIGINS = [
  "https://scalintiy.cloud",
  "https://www.scalintiy.cloud",
  "https://claudiaflow.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

export function getAllowedOrigins(env: Env): string[] {
  return env.ENVIRONMENT === "production" ? PRODUCTION_ORIGINS : DEV_ORIGINS;
}

// Global middleware
app.use("*", secureHeaders());
app.use("/api/*", async (c, next) => {
  const origins = getAllowedOrigins(c.env);
  const corsMiddleware = cors({
    origin: origins,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Device-ID"],
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// Body size limit for POST endpoints (15MB)
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 15 * 1024 * 1024,
    onError: (c) => {
      return c.json(
        {
          error: "PAYLOAD_TOO_LARGE",
          message: "Request body exceeds maximum size (15MB)",
        },
        413,
      );
    },
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
app.route("/api/ai/chat/title", titleApp);
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
