import { describe, it, expect } from "vitest";
import {
  computeDailyTotals,
  computeMovingAverage,
  computeSessionStats,
} from "./aggregation";
import type { Session } from "@/types/session";

function makeSession(date: string, amount: number): Session {
  return {
    id: Math.random(),
    timestamp: new Date(date),
    amount_ml: amount,
    amount_entered: amount,
    unit_entered: "ml",
    source: "manual",
    created_at: new Date(date),
    updated_at: new Date(date),
  };
}

describe("computeDailyTotals", () => {
  it("groups sessions by date and sums amounts", () => {
    const sessions = [
      makeSession("2025-01-15T08:00:00", 100),
      makeSession("2025-01-15T12:00:00", 80),
      makeSession("2025-01-16T09:00:00", 120),
    ];

    const totals = computeDailyTotals(sessions);
    expect(totals).toHaveLength(2);
    expect(totals[0].total_ml).toBe(180);
    expect(totals[0].count).toBe(2);
    expect(totals[1].total_ml).toBe(120);
    expect(totals[1].count).toBe(1);
  });

  it("handles empty input", () => {
    expect(computeDailyTotals([])).toEqual([]);
  });

  it("handles single session", () => {
    const sessions = [makeSession("2025-01-15T08:00:00", 100)];
    const totals = computeDailyTotals(sessions);
    expect(totals).toHaveLength(1);
    expect(totals[0].total_ml).toBe(100);
    expect(totals[0].count).toBe(1);
  });
});

describe("computeMovingAverage", () => {
  it("computes 7-day moving average", () => {
    const totals = Array.from({ length: 14 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, "0")}`,
      dateObj: new Date(2025, 0, i + 1),
      total_ml: 100 + i * 10,
      count: 3,
    }));

    const avg = computeMovingAverage(totals);
    expect(avg.length).toBeGreaterThan(0);
    // Each point should be the average of up to 7 preceding days
    // Day 7 should average days 1-7: (100+110+120+130+140+150+160)/7 = 130
    const day7 = avg.find((a) => a.date === "2025-01-07");
    expect(day7?.avg).toBeCloseTo(130, 0);
  });

  it("handles fewer than 7 days", () => {
    const totals = [
      {
        date: "2025-01-01",
        dateObj: new Date(2025, 0, 1),
        total_ml: 100,
        count: 2,
      },
      {
        date: "2025-01-02",
        dateObj: new Date(2025, 0, 2),
        total_ml: 200,
        count: 3,
      },
    ];
    const avg = computeMovingAverage(totals);
    expect(avg.length).toBe(2);
  });

  it("handles empty input", () => {
    expect(computeMovingAverage([])).toEqual([]);
  });
});

describe("computeSessionStats", () => {
  it("computes basic statistics", () => {
    const sessions = [
      makeSession("2025-01-15T08:00:00", 100),
      makeSession("2025-01-15T12:00:00", 80),
      makeSession("2025-01-15T18:00:00", 120),
    ];

    const stats = computeSessionStats(sessions);
    expect(stats.count).toBe(3);
    expect(stats.total).toBe(300);
    expect(stats.avg).toBe(100);
    expect(stats.max).toBe(120);
    expect(stats.min).toBe(80);
  });

  it("handles empty input", () => {
    const stats = computeSessionStats([]);
    expect(stats.count).toBe(0);
    expect(stats.total).toBe(0);
    expect(stats.avg).toBe(0);
  });
});
