import { http, HttpResponse } from "msw";

const API_BASE = "http://localhost:8787";

export const handlers = [
  // Vision extract endpoint
  http.post(`${API_BASE}/api/ai/vision-extract`, () => {
    return HttpResponse.json({
      entries: [
        {
          timestamp_local: "2025-01-15T08:30:00",
          amount: 120,
          unit: "ml",
          confidence: 0.95,
          assumptions: [],
          notes: "Morning pump",
        },
      ],
      warnings: [],
    });
  }),

  // Chat endpoint
  http.post(`${API_BASE}/api/ai/chat`, () => {
    return HttpResponse.json({
      content:
        "Based on your pumping data, you're maintaining a healthy supply. Keep up the consistent schedule!",
      flags: [],
    });
  }),

  // Insights endpoint
  http.post(`${API_BASE}/api/ai/insights`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        summary: "Your output has been steady over the past week.",
        trends: [],
        patterns: [],
        tips: [],
      },
      request_id: "mock-request-id",
    });
  }),

  // Key status endpoint
  http.get(`${API_BASE}/api/ai/key-status`, () => {
    return HttpResponse.json({
      has_key: true,
      rate_limit_remaining: 100,
    });
  }),
];
