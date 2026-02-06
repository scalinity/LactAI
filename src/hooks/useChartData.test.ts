import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useChartData } from "./useChartData";
import { db } from "@/db";
import { subDays } from "date-fns";

describe("useChartData", () => {
  beforeEach(async () => {
    // Clear is handled by test setup, but ensure clean state
    const allSessions = await db.sessions.toArray();
    if (allSessions.length > 0) {
      await db.sessions.clear();
    }
  });

  it("should return empty arrays when no sessions exist", async () => {
    const { result } = renderHook(() => useChartData("1W"));

    await waitFor(() => {
      expect(result.current.sessions).toEqual([]);
      expect(result.current.dailyTotals).toEqual([]);
      expect(result.current.movingAvg).toEqual([]);
    });
  });

  it("should return sessions sorted by timestamp", async () => {
    const now = new Date();
    const sessions = [
      {
        timestamp: subDays(now, 3),
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      },
      {
        timestamp: subDays(now, 1),
        amount_entered: 150,
        unit_entered: "ml",
        amount_ml: 150,
      },
      {
        timestamp: subDays(now, 5),
        amount_entered: 80,
        unit_entered: "ml",
        amount_ml: 80,
      },
    ];

    await db.sessions.bulkAdd(sessions);

    const { result } = renderHook(() => useChartData("1W"));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(3);
      expect(result.current.sessions[0].amount_ml).toBe(80); // oldest first
      expect(result.current.sessions[1].amount_ml).toBe(100);
      expect(result.current.sessions[2].amount_ml).toBe(150); // newest last
    });
  });

  it("should filter sessions by 7d range", async () => {
    const now = new Date();
    const sessions = [
      {
        timestamp: subDays(now, 3),
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      },
      {
        timestamp: subDays(now, 10),
        amount_entered: 150,
        unit_entered: "ml",
        amount_ml: 150,
      },
    ];

    await db.sessions.bulkAdd(sessions);

    const { result } = renderHook(() => useChartData("1W"));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].amount_ml).toBe(100);
    });
  });

  it("should filter sessions by 30d range", async () => {
    const now = new Date();
    const sessions = [
      {
        timestamp: subDays(now, 15),
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      },
      {
        timestamp: subDays(now, 45),
        amount_entered: 150,
        unit_entered: "ml",
        amount_ml: 150,
      },
    ];

    await db.sessions.bulkAdd(sessions);

    const { result } = renderHook(() => useChartData("1M"));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].amount_ml).toBe(100);
    });
  });

  it("should return all sessions for all range", async () => {
    const now = new Date();
    const sessions = [
      {
        timestamp: subDays(now, 10),
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      },
      {
        timestamp: subDays(now, 100),
        amount_entered: 150,
        unit_entered: "ml",
        amount_ml: 150,
      },
    ];

    await db.sessions.bulkAdd(sessions);

    const { result } = renderHook(() => useChartData("ALL"));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
    });
  });

  it("should compute daily totals correctly", async () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const sessions = [
      {
        timestamp: new Date(today.getTime() + 1000),
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      },
      {
        timestamp: new Date(today.getTime() + 2000),
        amount_entered: 150,
        unit_entered: "ml",
        amount_ml: 150,
      },
      {
        timestamp: subDays(today, 1),
        amount_entered: 200,
        unit_entered: "ml",
        amount_ml: 200,
      },
    ];

    await db.sessions.bulkAdd(sessions);

    const { result } = renderHook(() => useChartData("1W"));

    await waitFor(() => {
      expect(result.current.dailyTotals.length).toBeGreaterThan(0);
      const todayTotal = result.current.dailyTotals.find(
        (d) => d.dateObj.getTime() === today.getTime(),
      );
      expect(todayTotal?.total_ml).toBe(250); // 100 + 150
    });
  });

  it("should compute moving average", async () => {
    const now = new Date();
    const sessions = [
      {
        timestamp: subDays(now, 1),
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      },
      {
        timestamp: subDays(now, 2),
        amount_entered: 200,
        unit_entered: "ml",
        amount_ml: 200,
      },
      {
        timestamp: subDays(now, 3),
        amount_entered: 300,
        unit_entered: "ml",
        amount_ml: 300,
      },
    ];

    await db.sessions.bulkAdd(sessions);

    const { result } = renderHook(() => useChartData("1W"));

    await waitFor(() => {
      expect(result.current.movingAvg.length).toBeGreaterThan(0);
      expect(result.current.movingAvg[0]).toHaveProperty("date");
      expect(result.current.movingAvg[0]).toHaveProperty("avg");
    });
  });

  it("should update when sessions are added", async () => {
    const { result, rerender } = renderHook(() => useChartData("1W"));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(0);
    });

    const now = new Date();
    await db.sessions.add({
      timestamp: now,
      amount_entered: 100,
      unit_entered: "ml",
      amount_ml: 100,
    });

    rerender();

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
    });
  });

  it("should handle sessions with different units", async () => {
    const now = new Date();
    const sessions = [
      {
        timestamp: subDays(now, 1),
        amount_entered: 5,
        unit_entered: "oz",
        amount_ml: 147.87, // 5 oz to ml
      },
      {
        timestamp: subDays(now, 1),
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      },
    ];

    await db.sessions.bulkAdd(sessions);

    const { result } = renderHook(() => useChartData("1W"));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.dailyTotals[0]?.total_ml).toBeCloseTo(248, 0);
    });
  });

  it("should handle boundary dates correctly", async () => {
    const now = new Date();
    const exactlySevenDaysAgo = subDays(now, 7);

    const sessions = [
      {
        timestamp: exactlySevenDaysAgo,
        amount_entered: 100,
        unit_entered: "ml",
        amount_ml: 100,
      },
      {
        timestamp: subDays(now, 8),
        amount_entered: 150,
        unit_entered: "ml",
        amount_ml: 150,
      },
    ];

    await db.sessions.bulkAdd(sessions);

    const { result } = renderHook(() => useChartData("1W"));

    await waitFor(() => {
      // Should include session from exactly 7 days ago
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].amount_ml).toBe(100);
    });
  });

  it("should memoize results correctly", async () => {
    const now = new Date();
    await db.sessions.add({
      timestamp: now,
      amount_entered: 100,
      unit_entered: "ml",
      amount_ml: 100,
    });

    const { result, rerender } = renderHook(() => useChartData("1W"));

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
    });

    const firstResult = result.current;
    rerender();

    // Same reference if data hasn't changed
    expect(result.current).toBe(firstResult);
  });
});
