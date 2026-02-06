import { z } from "zod";

const ContextSchema = z
  .object({
    timezone: z.string().optional(),
    preferred_unit: z.enum(["ml", "oz"]).optional(),
    date_hint: z.string().optional(),
  })
  .optional();

export const VisionRequestSchema = z.object({
  image: z.string().min(100),
  mime_type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  context: ContextSchema,
});

export const VisionTextRequestSchema = z.object({
  text: z.string().min(5).max(5000),
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

const ChatMessageContentPart = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: z.string().min(1).max(2000) }),
  z.object({
    type: z.literal("image_url"),
    image_url: z.object({ url: z.string().min(1).max(15_000_000) }),
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
    })
    .optional(),
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
