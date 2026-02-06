import type { RangePreset } from "@/types/common";

export const ML_PER_OZ = 29.5735;

export const RANGE_PRESETS: {
  label: string;
  value: RangePreset;
  days: number | null;
}[] = [
  { label: "1W", value: "1W", days: 7 },
  { label: "1M", value: "1M", days: 30 },
  { label: "3M", value: "3M", days: 90 },
  { label: "6M", value: "6M", days: 180 },
  { label: "1Y", value: "1Y", days: 365 },
  { label: "All", value: "ALL", days: null },
];

export const MAX_REASONABLE_AMOUNT_ML = 500;
export const DEDUPE_TIME_TOLERANCE_MIN = 10;
export const DEDUPE_AMOUNT_TOLERANCE_ML = 5;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8787";
