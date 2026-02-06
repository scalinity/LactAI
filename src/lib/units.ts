import { ML_PER_OZ } from "./constants";
import type { Unit } from "@/types/common";

export function mlToOz(ml: number): number {
  return Math.round((ml / ML_PER_OZ) * 10) / 10;
}

export function ozToMl(oz: number): number {
  return Math.round(oz * ML_PER_OZ);
}

export function convertAmount(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  return from === "ml" ? mlToOz(value) : ozToMl(value);
}

export function formatAmount(value: number, unit: Unit): string {
  if (unit === "oz") {
    return `${value.toFixed(1)} oz`;
  }
  return `${Math.round(value)} ml`;
}

export function parseAmountInput(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, ".");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

export function toMl(value: number, unit: Unit): number {
  return unit === "oz" ? ozToMl(value) : value;
}
