import { z } from "zod";

// Timezone must match IANA-like pattern or UTC offset
const timezoneRegex = /^[A-Za-z_\-+/0-9]{1,50}$/;
// Date hint must be ISO date-like
const dateHintRegex = /^\d{4}-\d{2}-\d{2}$/;

const ContextSchema = z
  .object({
    timezone: z
      .string()
      .max(50)
      .regex(timezoneRegex, "Invalid timezone format")
      .optional(),
    preferred_unit: z.enum(["ml", "oz"]).optional(),
    date_hint: z
      .string()
      .max(10)
      .regex(dateHintRegex, "Date hint must be YYYY-MM-DD")
      .optional(),
  })
  .optional();

export const VisionRequestSchema = z.object({
  image: z.string().min(100),
  mime_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  context: ContextSchema,
});

export const VisionResponseSchema = z.object({
  entries: z.array(
    z.object({
      timestamp_local: z.string(),
      amount: z.number(),
      unit: z.enum(["ml", "oz", "fl_oz"]),
      notes: z.string().optional(),
      confidence: z.number().min(0).max(1),
      assumptions: z.array(z.string()),
    }),
  ),
  warnings: z.array(z.string()),
});

// Individual entry validation for fallback parsing
export const VisionEntrySchema = z.object({
  timestamp_local: z.string(),
  amount: z.number(),
  unit: z.enum(["ml", "oz", "fl_oz"]),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  assumptions: z.array(z.string()).optional().default([]),
});

const ChatMessageContentPart = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().min(1).max(2000) }),
  z.object({
    type: z.literal("image_url"),
    image_url: z.object({
      url: z
        .string()
        .min(1)
        .max(15_000_000)
        .refine(
          (u) => u.startsWith("data:image/") || u.startsWith("https://"),
          "URL must be a data: URI or https:// URL",
        ),
    }),
  }),
]);

export const ChatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.union([
          z.string().min(1).max(2000),
          z.array(ChatMessageContentPart).min(1),
        ]),
      }),
    )
    .min(1)
    .max(11),
  context: z
    .object({
      baby_age_weeks: z.number().min(0).max(260).optional(),
      expression_method: z.enum(["pump", "hand", "both"]).optional(),
      data_summary: z.string().max(8000).optional(),
      session_count: z.number().min(0).optional(),
      preferred_unit: z.enum(["ml", "oz"]).optional(),
      thread_summaries: z.string().max(1000).optional(),
    })
    .optional(),
});

export const TitleRequestSchema = z.object({
  user_message: z.string().min(1).max(2000),
  assistant_message: z.string().min(1).max(2000),
});

export const InsightsRequestSchema = z.object({
  entries: z
    .array(
      z.object({
        timestamp_local: z.string(),
        amount: z.number().min(0),
        unit: z.string(),
      }),
    )
    .min(2)
    .max(500),
  period: z.enum(["7d", "14d", "30d", "all"]).optional().default("7d"),
  questions: z.array(z.string().max(200)).max(3).optional(),
});
