export type MessageRole = "user" | "assistant" | "system";
export type MessageFlag = "medical_caution" | "urgent_refer_out";

export interface ChatImageData {
  base64: string;
  mime_type: "image/jpeg" | "image/png" | "image/webp";
}

export interface ChatThread {
  id?: number;
  created_at: Date;
  title: string;
}

export interface ChatMessage {
  id?: number;
  thread_id: number;
  role: MessageRole;
  content: string;
  created_at: Date;
  flags?: MessageFlag[];
  image?: ChatImageData;
}

export interface ChatResponse {
  response: string;
  has_red_flags: boolean;
  red_flag_message?: string;
  suggested_followup?: string[];
}
