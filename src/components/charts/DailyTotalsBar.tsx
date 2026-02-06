import ReactECharts from "echarts-for-react";
import type { DailyTotal, MovingAveragePoint } from "@/lib/aggregation";
import type { Unit } from "@/types/common";
import { buildDailyTotalsOption } from "@/lib/chart-helpers";

interface DailyTotalsBarProps {
  dailyTotals: DailyTotal[];
  movingAvg: MovingAveragePoint[];
  unit: Unit;
}

export default function DailyTotalsBar({
  dailyTotals,
  movingAvg,
  unit,
}: DailyTotalsBarProps) {
  if (dailyTotals.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-plum/40">
        No daily data to display
      </div>
    );
  }

  const option = buildDailyTotalsOption(dailyTotals, movingAvg, unit);

  return (
    <ReactECharts
      option={option}
      style={{ height: 300, width: "100%" }}
      notMerge
    />
  );
}
