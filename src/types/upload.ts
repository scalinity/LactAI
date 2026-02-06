export type AIStatus = "queued" | "processing" | "done" | "failed";

export interface Upload {
  id?: number;
  created_at: Date;
  original_filename: string;
  mime_type: string;
  local_blob_ref?: Blob;
  ai_status: AIStatus;
  ai_raw_text?: string;
  ai_raw_json?: string;
}

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
