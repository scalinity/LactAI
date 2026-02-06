export type Unit = "ml" | "oz";
export type Side = "left" | "right" | "both" | "unknown";
export type SessionSource = "manual" | "imported" | "ocr" | "ai_vision";
export type SessionType = "feeding" | "pumping";

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export type RangePreset = "1W" | "1M" | "3M" | "6M" | "1Y" | "ALL";
