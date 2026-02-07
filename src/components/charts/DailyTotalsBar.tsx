import { useCallback, useMemo, useRef } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import echarts from "@/lib/echarts";
import type { DailyTotal, MovingAveragePoint } from "@/lib/aggregation";
import type { Unit } from "@/types/common";
import { buildDailyTotalsOption, getChartPalette } from "@/lib/chart-helpers";
import { useThemeStore } from "@/stores/useThemeStore";

interface DailyTotalsBarProps {
  dailyTotals: DailyTotal[];
  movingAvg: MovingAveragePoint[];
  unit: Unit;
  onZoomChange?: (start: number, end: number) => void;
}

export default function DailyTotalsBar({
  dailyTotals,
  movingAvg,
  unit,
  onZoomChange,
}: DailyTotalsBarProps) {
  const chartRef = useRef<ReactEChartsCore>(null);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  const handleDataZoom = useCallback(() => {
    if (!chartRef.current || !onZoomChange) return;
    const instance = chartRef.current.getEchartsInstance();
    const opt = instance.getOption() as {
      dataZoom?: Array<{ start?: number; end?: number }>;
    };
    const zoom = opt.dataZoom?.[0];
    if (zoom) {
      onZoomChange(zoom.start ?? 0, zoom.end ?? 100);
    }
  }, [onZoomChange]);

  const onEvents = useMemo(
    () => ({
      datazoom: handleDataZoom,
      restore: () => onZoomChange?.(0, 100),
    }),
    [handleDataZoom, onZoomChange],
  );

  const option = useMemo(
    () =>
      buildDailyTotalsOption(dailyTotals, movingAvg, unit, getChartPalette()),
    [dailyTotals, movingAvg, unit, resolvedTheme],
  );

  if (dailyTotals.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-plum/40">
        No daily data to display
      </div>
    );
  }

  return (
    <ReactEChartsCore
      ref={chartRef}
      echarts={echarts}
      option={option}
      style={{ height: 420, width: "100%" }}
      onEvents={onEvents}
      notMerge
      lazyUpdate
      opts={{ renderer: "canvas", devicePixelRatio: 2 }}
    />
  );
}
