import { describe, it, expect } from "vitest";
import {
  computeDailyTotals,
  computeMovingAverage,
  computeSessionStats,
  computeMonthlyTotals,
  computeDurationStats,
  computeSideVolumes,
  computeSessionRegularity,
  computeWeeklyTotals,
} from "./aggregation";
import type { Session } from "@/types/session";

function makeSession(
  date: string,
  amount: number,
  overrides?: Partial<Session>,
): Session {
  return {
    id: Math.random(),
    timestamp: new Date(date),
    amount_ml: amount,
    amount_entered: amount,
    unit_entered: "ml",
    source: "manual",
    created_at: new Date(date),
    updated_at: new Date(date),
    ...overrides,
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
      feed_ml: 60 + i * 6,
      pump_ml: 40 + i * 4,
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
        feed_ml: 60,
        pump_ml: 40,
        count: 2,
      },
      {
        date: "2025-01-02",
        dateObj: new Date(2025, 0, 2),
        total_ml: 200,
        feed_ml: 120,
        pump_ml: 80,
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

describe("computeMonthlyTotals", () => {
  it("groups sessions by month", () => {
    const sessions = [
      makeSession("2025-01-15T08:00:00", 100, { session_type: "pumping" }),
      makeSession("2025-01-20T08:00:00", 200, { session_type: "feeding" }),
      makeSession("2025-02-10T08:00:00", 150, { session_type: "pumping" }),
    ];
    const totals = computeMonthlyTotals(sessions);
    expect(totals).toHaveLength(2);
    expect(totals[0].month).toBe("2025-01");
    expect(totals[0].total_ml).toBe(300);
    expect(totals[0].pump_ml).toBe(100);
    expect(totals[0].feed_ml).toBe(200);
    expect(totals[0].count).toBe(2);
    expect(totals[0].days_with_data).toBe(2);
    expect(totals[0].avg_daily_ml).toBe(150); // 300 / 2 days
    expect(totals[1].month).toBe("2025-02");
    expect(totals[1].total_ml).toBe(150);
  });

  it("handles empty input", () => {
    expect(computeMonthlyTotals([])).toEqual([]);
  });

  it("counts unique days correctly", () => {
    const sessions = [
      makeSession("2025-03-01T08:00:00", 100),
      makeSession("2025-03-01T12:00:00", 80),
      makeSession("2025-03-01T18:00:00", 120),
    ];
    const totals = computeMonthlyTotals(sessions);
    expect(totals).toHaveLength(1);
    expect(totals[0].days_with_data).toBe(1);
    expect(totals[0].avg_daily_ml).toBe(300);
  });
});

describe("computeDurationStats", () => {
  it("computes duration stats for sessions with duration", () => {
    const sessions = [
      makeSession("2025-01-15T08:00:00", 100, { duration_min: 10 }),
      makeSession("2025-01-15T12:00:00", 80, { duration_min: 20 }),
      makeSession("2025-01-15T18:00:00", 120, { duration_min: 15 }),
    ];
    const stats = computeDurationStats(sessions);
    expect(stats.avg_min).toBe(15);
    expect(stats.min_min).toBe(10);
    expect(stats.max_min).toBe(20);
    expect(stats.count_with_duration).toBe(3);
    expect(stats.total_count).toBe(3);
  });

  it("excludes sessions without duration", () => {
    const sessions = [
      makeSession("2025-01-15T08:00:00", 100, { duration_min: 10 }),
      makeSession("2025-01-15T12:00:00", 80),
      makeSession("2025-01-15T18:00:00", 120, { duration_min: 20 }),
    ];
    const stats = computeDurationStats(sessions);
    expect(stats.count_with_duration).toBe(2);
    expect(stats.total_count).toBe(3);
    expect(stats.avg_min).toBe(15);
  });

  it("handles no sessions with duration", () => {
    const sessions = [
      makeSession("2025-01-15T08:00:00", 100),
      makeSession("2025-01-15T12:00:00", 80),
    ];
    const stats = computeDurationStats(sessions);
    expect(stats.count_with_duration).toBe(0);
    expect(stats.avg_min).toBe(0);
  });

  it("handles empty input", () => {
    const stats = computeDurationStats([]);
    expect(stats.count_with_duration).toBe(0);
    expect(stats.total_count).toBe(0);
  });
});

describe("computeSideVolumes", () => {
  it("groups by side and computes averages", () => {
    const sessions = [
      makeSession("2025-01-15T08:00:00", 100, { side: "left" }),
      makeSession("2025-01-15T10:00:00", 120, { side: "left" }),
      makeSession("2025-01-15T12:00:00", 80, { side: "right" }),
      makeSession("2025-01-15T14:00:00", 200, { side: "both" }),
    ];
    const vols = computeSideVolumes(sessions);
    expect(vols.left_count).toBe(2);
    expect(vols.left_total_ml).toBe(220);
    expect(vols.left_avg_ml).toBe(110);
    expect(vols.right_count).toBe(1);
    expect(vols.right_total_ml).toBe(80);
    expect(vols.right_avg_ml).toBe(80);
    expect(vols.both_count).toBe(1);
    expect(vols.both_total_ml).toBe(200);
  });

  it("excludes unknown side", () => {
    const sessions = [
      makeSession("2025-01-15T08:00:00", 100, { side: "unknown" }),
      makeSession("2025-01-15T10:00:00", 120, { side: "left" }),
    ];
    const vols = computeSideVolumes(sessions);
    expect(vols.left_count).toBe(1);
    expect(vols.right_count).toBe(0);
    expect(vols.both_count).toBe(0);
  });

  it("handles empty input", () => {
    const vols = computeSideVolumes([]);
    expect(vols.left_count).toBe(0);
    expect(vols.right_count).toBe(0);
    expect(vols.left_avg_ml).toBe(0);
    expect(vols.right_avg_ml).toBe(0);
  });
});

describe("computeSessionRegularity", () => {
  it("computes gaps between sessions", () => {
    const sessions = [
      makeSession("2025-01-15T06:00:00", 100),
      makeSession("2025-01-15T09:00:00", 80), // 3h gap
      makeSession("2025-01-15T12:00:00", 120), // 3h gap
      makeSession("2025-01-15T15:00:00", 90), // 3h gap
    ];
    const reg = computeSessionRegularity(sessions);
    expect(reg.avg_gap_hours).toBe(3);
    expect(reg.min_gap_hours).toBe(3);
    expect(reg.max_gap_hours).toBe(3);
    expect(reg.typical_sessions_per_day).toBe(8); // 24/3
  });

  it("handles irregular gaps", () => {
    const sessions = [
      makeSession("2025-01-15T06:00:00", 100),
      makeSession("2025-01-15T08:00:00", 80), // 2h
      makeSession("2025-01-15T14:00:00", 120), // 6h
    ];
    const reg = computeSessionRegularity(sessions);
    expect(reg.avg_gap_hours).toBe(4); // (2+6)/2
    expect(reg.min_gap_hours).toBe(2);
    expect(reg.max_gap_hours).toBe(6);
  });

  it("handles single session", () => {
    const sessions = [makeSession("2025-01-15T08:00:00", 100)];
    const reg = computeSessionRegularity(sessions);
    expect(reg.avg_gap_hours).toBe(0);
    expect(reg.typical_sessions_per_day).toBe(0);
  });

  it("handles empty input", () => {
    const reg = computeSessionRegularity([]);
    expect(reg.avg_gap_hours).toBe(0);
  });
});

describe("computeWeeklyTotals", () => {
  it("groups sessions by ISO week", () => {
    // Mon Jan 13 to Sun Jan 19 = one ISO week
    // Mon Jan 20 to Sun Jan 26 = next ISO week
    const sessions = [
      makeSession("2025-01-13T08:00:00", 100),
      makeSession("2025-01-14T08:00:00", 200),
      makeSession("2025-01-20T08:00:00", 150),
    ];
    const totals = computeWeeklyTotals(sessions);
    expect(totals).toHaveLength(2);
    expect(totals[0].total_ml).toBe(300);
    expect(totals[0].count).toBe(2);
    expect(totals[0].days_with_data).toBe(2);
    expect(totals[1].total_ml).toBe(150);
    expect(totals[1].count).toBe(1);
  });

  it("handles empty input", () => {
    expect(computeWeeklyTotals([])).toEqual([]);
  });
});
