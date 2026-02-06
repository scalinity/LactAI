import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { subDays } from "date-fns";
import type { RangePreset } from "@/types/common";
import { RANGE_PRESETS } from "@/lib/constants";
import { computeDailyTotals, computeMovingAverage } from "@/lib/aggregation";

export function useChartData(preset: RangePreset) {
  const rangeDef = RANGE_PRESETS.find((r) => r.value === preset);
  const startDate = rangeDef?.days ? subDays(new Date(), rangeDef.days) : null;

  const sessions = useLiveQuery(async () => {
    if (startDate) {
      return db.sessions.where("timestamp").aboveOrEqual(startDate).toArray();
    }
    return db.sessions.toArray();
  }, [startDate?.getTime()]);

  return useMemo(() => {
    if (!sessions) return { sessions: [], dailyTotals: [], movingAvg: [] };

    const sorted = [...sessions].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
    const dailyTotals = computeDailyTotals(sorted);
    const movingAvg = computeMovingAverage(dailyTotals);

    return { sessions: sorted, dailyTotals, movingAvg };
  }, [sessions]);
}
