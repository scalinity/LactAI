import type { EChartsOption } from "echarts";
import type { Session } from "@/types/session";
import type { DailyTotal, MovingAveragePoint } from "./aggregation";
import type { Unit } from "@/types/common";
import { mlToOz } from "./units";

export function buildScatterOption(
  sessions: Session[],
  unit: Unit,
): EChartsOption {
  const feedData = sessions
    .filter((s) => s.session_type !== "pumping")
    .map((s) => ({
      value: [
        s.timestamp.getTime(),
        unit === "ml" ? s.amount_ml : mlToOz(s.amount_ml),
      ],
      sessionId: s.id,
    }));

  const pumpData = sessions
    .filter((s) => s.session_type === "pumping")
    .map((s) => ({
      value: [
        s.timestamp.getTime(),
        unit === "ml" ? s.amount_ml : mlToOz(s.amount_ml),
      ],
      sessionId: s.id,
    }));

  const series: EChartsOption["series"] = [];
  if (feedData.length > 0) {
    series.push({
      name: "Feeding",
      type: "scatter",
      data: feedData,
      large: true,
      largeThreshold: 2000,
      symbolSize: 8,
      itemStyle: { color: "#E8A0BF" },
    });
  }
  if (pumpData.length > 0) {
    series.push({
      name: "Pumping",
      type: "scatter",
      data: pumpData,
      large: true,
      largeThreshold: 2000,
      symbolSize: 8,
      itemStyle: { color: "#A8C5A0" },
    });
  }

  const hasMultipleTypes = feedData.length > 0 && pumpData.length > 0;

  return {
    tooltip: {
      trigger: "item",
      formatter: (params: unknown) => {
        const p = params as { value: [number, number]; seriesName: string };
        const date = new Date(p.value[0]);
        const timeStr = date.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        const amount = p.value[1];
        const typeLabel = hasMultipleTypes ? `${p.seriesName}<br/>` : "";
        return `${typeLabel}${timeStr}<br/><strong>${unit === "oz" ? amount.toFixed(1) : Math.round(amount)} ${unit}</strong>`;
      },
    },
    legend: hasMultipleTypes
      ? { data: ["Feeding", "Pumping"], bottom: 0 }
      : undefined,
    xAxis: {
      type: "time",
    },
    yAxis: {
      type: "value",
      name: unit,
      nameLocation: "middle",
      nameGap: 40,
    },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100, height: 20, bottom: hasMultipleTypes ? 30 : 10 },
    ],
    series,
    grid: { left: 60, right: 20, top: 20, bottom: hasMultipleTypes ? 80 : 60 },
  };
}

export function buildDailyTotalsOption(
  dailyTotals: DailyTotal[],
  movingAvg: MovingAveragePoint[],
  unit: Unit,
): EChartsOption {
  const hasPumpData = dailyTotals.some((d) => d.pump_ml > 0);
  const hasFeedData = dailyTotals.some((d) => d.feed_ml > 0);
  const useStacked = hasPumpData && hasFeedData;

  const feedBarData = dailyTotals.map((d) => [
    d.date,
    unit === "ml" ? d.feed_ml : mlToOz(d.feed_ml),
  ]);

  const pumpBarData = dailyTotals.map((d) => [
    d.date,
    unit === "ml" ? d.pump_ml : mlToOz(d.pump_ml),
  ]);

  const totalBarData = dailyTotals.map((d) => [
    d.date,
    unit === "ml" ? d.total_ml : mlToOz(d.total_ml),
  ]);

  const lineData = movingAvg.map((d) => [
    d.date,
    unit === "ml" ? d.avg : mlToOz(d.avg),
  ]);

  const legendData = useStacked
    ? ["Feeding", "Pumping", "7-Day Average"]
    : ["Daily Total", "7-Day Average"];

  const series: EChartsOption["series"] = useStacked
    ? [
        {
          name: "Feeding",
          type: "bar",
          stack: "total",
          data: feedBarData,
          itemStyle: { color: "#E8A0BF", borderRadius: [0, 0, 0, 0] },
        },
        {
          name: "Pumping",
          type: "bar",
          stack: "total",
          data: pumpBarData,
          itemStyle: { color: "#A8C5A0", borderRadius: [4, 4, 0, 0] },
        },
      ]
    : [
        {
          name: "Daily Total",
          type: "bar",
          data: totalBarData,
          itemStyle: { color: "#E8A0BF", borderRadius: [4, 4, 0, 0] },
        },
      ];

  series.push({
    name: "7-Day Average",
    type: "line",
    data: lineData,
    smooth: true,
    lineStyle: { color: "#C77DA3", width: 2 },
    itemStyle: { color: "#C77DA3" },
    symbol: "none",
  });

  return {
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: legendData,
      bottom: 0,
    },
    xAxis: {
      type: "category",
      data: dailyTotals.map((d) => d.date),
      axisLabel: {
        formatter: (val: string) => {
          const d = new Date(val);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        },
      },
    },
    yAxis: {
      type: "value",
      name: unit,
      nameLocation: "middle",
      nameGap: 40,
    },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100, height: 20, bottom: 30 },
    ],
    series,
    grid: { left: 60, right: 20, top: 20, bottom: 80 },
  };
}
