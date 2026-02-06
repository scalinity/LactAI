import { describe, it, expect, beforeEach } from "vitest";
import { isDuplicate, findDuplicates } from "./dedupe";
import { db } from "@/db";

describe("isDuplicate", () => {
  it("detects duplicate within time and amount tolerance", () => {
    const a = { timestamp: new Date("2025-01-15T08:00:00"), amount_ml: 120 };
    const b = { timestamp: new Date("2025-01-15T08:05:00"), amount_ml: 122 };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("rejects sessions outside time tolerance (>10 min)", () => {
    const a = { timestamp: new Date("2025-01-15T08:00:00"), amount_ml: 120 };
    const b = { timestamp: new Date("2025-01-15T08:15:00"), amount_ml: 120 };
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("rejects sessions outside amount tolerance (>5 ml)", () => {
    const a = { timestamp: new Date("2025-01-15T08:00:00"), amount_ml: 120 };
    const b = { timestamp: new Date("2025-01-15T08:00:00"), amount_ml: 130 };
    expect(isDuplicate(a, b)).toBe(false);
  });

  it("handles exact matches", () => {
    const a = { timestamp: new Date("2025-01-15T08:00:00"), amount_ml: 120 };
    const b = { timestamp: new Date("2025-01-15T08:00:00"), amount_ml: 120 };
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("handles edge case at boundary (exactly 10 min)", () => {
    const a = { timestamp: new Date("2025-01-15T08:00:00"), amount_ml: 120 };
    const b = { timestamp: new Date("2025-01-15T08:10:00"), amount_ml: 120 };
    // 10 min is within tolerance (<=10 min)
    expect(isDuplicate(a, b)).toBe(true);
  });

  it("handles edge case at boundary (exactly 5 ml diff)", () => {
    const a = { timestamp: new Date("2025-01-15T08:00:00"), amount_ml: 120 };
    const b = { timestamp: new Date("2025-01-15T08:00:00"), amount_ml: 125 };
    // 5 ml is within tolerance (<=5 ml)
    expect(isDuplicate(a, b)).toBe(true);
  });
});

describe("findDuplicates", () => {
  beforeEach(async () => {
    await db.sessions.bulkAdd([
      {
        timestamp: new Date("2025-01-15T08:00:00"),
        amount_ml: 120,
        amount_entered: 120,
        unit_entered: "ml",
        source: "manual",
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        timestamp: new Date("2025-01-15T12:00:00"),
        amount_ml: 90,
        amount_entered: 90,
        unit_entered: "ml",
        source: "manual",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  });

  it("finds duplicates of a matching session", async () => {
    const result = await findDuplicates({
      timestamp: new Date("2025-01-15T08:05:00"),
      amount_ml: 121,
    });
    expect(result.length).toBe(1);
    expect(result[0].amount_ml).toBe(120);
  });

  it("returns empty for non-matching session", async () => {
    const result = await findDuplicates({
      timestamp: new Date("2025-01-15T16:00:00"),
      amount_ml: 150,
    });
    expect(result.length).toBe(0);
  });
});
