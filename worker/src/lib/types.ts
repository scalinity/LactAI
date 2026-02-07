export type Env = {
  IMAGE_CACHE: KVNamespace;
  OPENROUTER_API_KEY: string;
  OPENROUTER_BASE_URL: string;
  OPENAI_API_KEY: string;
  VISION_MODEL: string;
  CHAT_MODEL: string;
  TITLE_MODEL?: string;
  INSIGHTS_MODEL: string;
  MAX_IMAGE_SIZE_BYTES: string;
  MAX_TOKENS_VISION: string;
  MAX_TOKENS_CHAT: string;
  MAX_TOKENS_INSIGHTS: string;
  MAX_DAILY_REQUESTS_PER_DEVICE: string;
  APP_REFERER: string;
  APP_TITLE: string;
  ENVIRONMENT?: string;
};

export interface VisionEntry {
  timestamp_local: string;
  amount: number;
  unit: "ml" | "oz" | "fl_oz";
  notes?: string;
  confidence: number;
  assumptions: string[];
}

export interface VisionExtractResponse {
  entries: VisionEntry[];
  warnings: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
