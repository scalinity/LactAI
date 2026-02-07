import type { ComposeOption } from "echarts/core";
import type {
  ScatterSeriesOption,
  BarSeriesOption,
  LineSeriesOption,
} from "echarts/charts";
import type {
  TooltipComponentOption,
  LegendComponentOption,
  DataZoomComponentOption,
  GridComponentOption,
  MarkLineComponentOption,
  MarkPointComponentOption,
  MarkAreaComponentOption,
  ToolboxComponentOption,
  BrushComponentOption,
  GraphicComponentOption,
} from "echarts/components";
import type { Session } from "@/types/session";
import type { DailyTotal, MovingAveragePoint } from "./aggregation";
import type { Unit } from "@/types/common";
import { mlToOz } from "./units";
import { escapeHtml } from "./sanitize";

/* ── Chart Theme Palette ─────────────────────────────── */

export interface ChartPalette {
  rose: string;
  roseDark: string;
  roseLight: string;
  sage: string;
  sageDark: string;
  text: string;
  textLight: string;
  surface: string;
  // Computed UI colors
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  tooltipMuted: string;
  axisLine: string;
  axisLabel: string;
  splitLine: string;
  pointerBg: string;
  tagBg: string;
  toolboxIcon: string;
}

export function getChartPalette(): ChartPalette {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  const isDark = document.documentElement.classList.contains("dark");

  const rose = v("--color-rose-primary") || "#e8a0bf";
  const roseDark = v("--color-rose-dark") || "#c77da3";
  const roseLight = v("--color-rose-light") || "#f2c6de";
  const sage = v("--color-sage") || "#a8c5a0";
  const sageDark = v("--color-sage-dark") || "#8baf82";
  const text = v("--color-plum") || "#3d2c3e";
  const textLight = v("--color-plum-light") || "#6b5a6d";
  const surface = v("--color-surface") || "#ffffff";

  return {
    rose,
    roseDark,
    roseLight,
    sage,
    sageDark,
    text,
    textLight,
    surface,
    tooltipBg: isDark ? "rgba(42,32,48,0.97)" : "rgba(255,255,255,0.97)",
    tooltipBorder: isDark ? "rgba(200,125,163,0.2)" : "#f0e0ea",
    tooltipText: text,
    tooltipMuted: textLight,
    axisLine: isDark ? "rgba(232,220,233,0.15)" : "#e8d8e0",
    axisLabel: textLight,
    splitLine: isDark ? "rgba(232,220,233,0.08)" : "#f4ecf0",
    pointerBg: isDark ? "rgba(42,32,48,0.9)" : "#f5eef2",
    tagBg: isDark ? "rgba(200,125,163,0.15)" : "rgba(200,125,163,0.08)",
    toolboxIcon: isDark ? "rgba(232,220,233,0.4)" : "#c0a0b0",
  };
}

type EChartsOption = ComposeOption<
  | ScatterSeriesOption
  | BarSeriesOption
  | LineSeriesOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | GridComponentOption
  | MarkLineComponentOption
  | MarkPointComponentOption
  | MarkAreaComponentOption
  | ToolboxComponentOption
  | BrushComponentOption
  | GraphicComponentOption
>;

/* ── Helpers ─────────────────────────────────────────── */

/** Map duration (0-60 min) to symbol size (6-20px) */
function durationToSize(durationMin?: number): number {
  if (!durationMin || durationMin <= 0) return 8;
  return Math.min(20, Math.max(6, 6 + (durationMin / 60) * 14));
}

/** Map hour-of-day to opacity (dim at night, bright during day) */
function hourToOpacity(hour: number): number {
  if (hour >= 6 && hour <= 18)
    return 0.85 + (1 - Math.abs(hour - 12) / 12) * 0.15;
  return 0.4 + ((hour < 6 ? hour : 24 - hour) / 12) * 0.2;
}

/** Stack-safe min/max for arrays of any size */
function safeMin(arr: number[]): number {
  return arr.reduce((a, b) => Math.min(a, b), Infinity);
}
function safeMax(arr: number[]): number {
  return arr.reduce((a, b) => Math.max(a, b), -Infinity);
}

/** Simple linear regression → [slope, intercept] */
function linearRegression(points: [number, number][]): [number, number] {
  const n = points.length;
  if (n < 2) return [0, points[0]?.[1] ?? 0];
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return [0, sumY / n];
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return [slope, intercept];
}

function convertVal(ml: number, unit: Unit): number {
  return unit === "ml" ? ml : mlToOz(ml);
}

function fmtAmt(val: number, unit: Unit): string {
  return unit === "oz" ? `${val.toFixed(1)} oz` : `${Math.round(val)} ml`;
}

/** Shared toolbox config */
function toolbox(p: ChartPalette): ToolboxComponentOption {
  return {
    show: true,
    right: 4,
    top: 0,
    itemSize: 14,
    itemGap: 8,
    iconStyle: {
      borderColor: p.toolboxIcon,
      borderWidth: 1.2,
    },
    emphasis: {
      iconStyle: { borderColor: p.roseDark },
    },
    feature: {
      dataZoom: {
        yAxisIndex: "none",
        title: { zoom: "Zoom", back: "Reset" },
        icon: {
          zoom: "path://M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z M12 10h-2v2H9v-2H7V9h2V7h1z",
          back: "path://M12.5 8c-2.65 0-5.05.98-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z",
        },
      },
      saveAsImage: {
        title: "Save",
        icon: "path://M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v9.67z",
        pixelRatio: 2,
      },
    },
  };
}

/* ── Scatter Chart ──────────────────────────────────── */

export function buildScatterOption(
  sessions: Session[],
  unit: Unit,
  p: ChartPalette,
): EChartsOption {
  const feedSessions = sessions.filter((s) => s.session_type !== "pumping");
  const pumpSessions = sessions.filter((s) => s.session_type === "pumping");

  const mapSession = (s: Session) => {
    const amount = convertVal(s.amount_ml, unit);
    const hour = s.timestamp.getHours();
    return {
      value: [s.timestamp.getTime(), amount] as [number, number],
      sessionId: s.id,
      symbolSize: durationToSize(s.duration_min),
      itemStyle: { opacity: hourToOpacity(hour) },
      _duration: s.duration_min,
      _side: s.side,
      _hour: hour,
      _notes: s.notes,
    };
  };

  const feedData = feedSessions.map(mapSession);
  const pumpData = pumpSessions.map(mapSession);

  const allAmounts = sessions.map((s) => convertVal(s.amount_ml, unit));
  const minVal = allAmounts.length ? safeMin(allAmounts) : 0;
  const maxVal = allAmounts.length ? safeMax(allAmounts) : 100;

  const buildTrendLine = (data: typeof feedData): [number, number][] => {
    if (data.length < 3) return [];
    const pts = data.map((d) => d.value);
    const [slope, intercept] = linearRegression(pts);
    const first = pts[0][0];
    const last = pts[pts.length - 1][0];
    return [
      [first, slope * first + intercept],
      [last, slope * last + intercept],
    ];
  };

  const feedTrend = buildTrendLine(feedData);
  const pumpTrend = buildTrendLine(pumpData);

  const series: (ScatterSeriesOption | LineSeriesOption)[] = [];
  const hasMultipleTypes = feedData.length > 0 && pumpData.length > 0;

  const feedAvg = feedData.length
    ? feedData.reduce((sum, d) => sum + d.value[1], 0) / feedData.length
    : 0;
  const pumpAvg = pumpData.length
    ? pumpData.reduce((sum, d) => sum + d.value[1], 0) / pumpData.length
    : 0;

  if (feedData.length > 0) {
    series.push({
      name: "Feeding",
      type: "scatter",
      data: feedData,
      symbolSize: (data: unknown) =>
        (data as { symbolSize: number }).symbolSize ?? 8,
      itemStyle: { color: p.rose },
      emphasis: {
        itemStyle: {
          borderColor: p.roseDark,
          borderWidth: 2,
          shadowBlur: 12,
          shadowColor: "rgba(200, 125, 163, 0.5)",
        },
        scale: 1.8,
      },
      markLine: {
        silent: true,
        symbol: "none",
        lineStyle: { type: "dashed", width: 1 },
        data: [
          {
            yAxis: feedAvg,
            label: {
              formatter: `avg ${fmtAmt(feedAvg, unit)}`,
              position: "insideEndTop",
              fontSize: 10,
              color: p.roseDark,
            },
            lineStyle: { color: p.rose + "88" },
          },
        ],
      },
    } as ScatterSeriesOption);

    if (feedTrend.length === 2) {
      series.push({
        name: "Feeding Trend",
        type: "line",
        data: feedTrend,
        symbol: "none",
        lineStyle: { color: p.rose + "88", width: 1.5, type: "dotted" },
        itemStyle: { color: p.rose },
        silent: true,
        tooltip: { show: false },
      } as LineSeriesOption);
    }

    if (hasMultipleTypes && feedData.length >= 3) {
      series.push({
        name: "Feeding Avg",
        type: "line",
        data: [],
        lineStyle: { color: p.rose, width: 1.5, type: "dotted" },
        itemStyle: { color: p.rose },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: p.rose + "44" },
          label: {
            formatter: () => `Feed avg: ${fmtAmt(feedAvg, unit)}`,
            color: p.axisLabel,
          },
        },
      });
    }
  }

  if (pumpData.length > 0) {
    series.push({
      name: "Pumping",
      type: "scatter",
      data: pumpData,
      symbolSize: (data: unknown) =>
        (data as { symbolSize: number }).symbolSize ?? 8,
      itemStyle: { color: p.sage },
      emphasis: {
        itemStyle: {
          borderColor: p.sageDark,
          borderWidth: 2,
          shadowBlur: 12,
          shadowColor: "rgba(123, 168, 118, 0.5)",
        },
        scale: 1.8,
      },
      markLine: {
        silent: true,
        symbol: "none",
        lineStyle: { type: "dashed", width: 1 },
        data: [
          {
            yAxis: pumpAvg,
            label: {
              formatter: `avg ${fmtAmt(pumpAvg, unit)}`,
              position: "insideEndTop",
              fontSize: 10,
              color: p.sageDark,
            },
            lineStyle: { color: p.sage + "88" },
          },
        ],
      },
    } as ScatterSeriesOption);

    if (pumpTrend.length === 2) {
      series.push({
        name: "Pumping Trend",
        type: "line",
        data: pumpTrend,
        symbol: "none",
        lineStyle: { color: p.sage + "88", width: 1.5, type: "dotted" },
        itemStyle: { color: p.sage },
        silent: true,
        tooltip: { show: false },
      } as LineSeriesOption);
    }

    if (hasMultipleTypes && pumpData.length >= 3) {
      series.push({
        name: "Pumping Avg",
        type: "line",
        data: [],
        lineStyle: { color: p.sage, width: 1.5, type: "dotted" },
        itemStyle: { color: p.sage },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: p.sage + "44" },
          label: {
            formatter: () => `Pump avg: ${fmtAmt(pumpAvg, unit)}`,
            color: p.axisLabel,
          },
        },
      });
    }
  }

  const yPadding = (maxVal - minVal) * 0.15 || 20;
  const yMin = Math.max(0, Math.floor((minVal - yPadding) / 10) * 10);
  const yMax = Math.ceil((maxVal + yPadding) / 10) * 10;

  const legendData = hasMultipleTypes ? ["Feeding", "Pumping"] : [];

  return {
    toolbox: toolbox(p),
    brush: {
      toolbox: ["rect", "clear"],
      xAxisIndex: 0,
      brushStyle: {
        borderWidth: 1,
        color: "rgba(232, 160, 191, 0.1)",
        borderColor: p.rose,
      },
      outOfBrush: { colorAlpha: 0.15 },
      throttleType: "debounce",
      throttleDelay: 200,
    },
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: p.tooltipBg,
      borderColor: p.tooltipBorder,
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: p.tooltipText, fontSize: 13 },
      extraCssText:
        "border-radius:10px;box-shadow:0 4px 20px rgba(90,50,70,0.12);",
      formatter: (params: unknown) => {
        const tp = params as {
          value: [number, number];
          seriesName: string;
          data: {
            _duration?: number;
            _side?: string;
            _hour?: number;
            _notes?: string;
            symbolSize?: number;
          };
        };
        if (!tp.value || tp.seriesName?.includes("Trend")) return "";
        const date = new Date(tp.value[0]);
        const timeStr = date.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        const amount = tp.value[1];
        const d = tp.data;
        const typeColor = tp.seriesName === "Pumping" ? p.sage : p.rose;
        const typeBg =
          tp.seriesName === "Pumping" ? p.sage + "26" : p.rose + "26";

        let html = `<div style="font-size:11px;color:${p.tooltipMuted};margin-bottom:6px">${timeStr}</div>`;
        html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:6px 10px;border-radius:8px;background:${typeBg}">`;
        html += `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${typeColor}"></span>`;
        html += `<span style="font-size:18px;font-weight:700;color:${p.tooltipText}">${fmtAmt(amount, unit)}</span>`;
        html += `<span style="font-size:11px;color:${p.tooltipMuted};margin-left:2px">${tp.seriesName}</span>`;
        html += `</div>`;

        const details: string[] = [];
        if (d._duration && d._duration > 0)
          details.push(
            `<span style="font-weight:600">${d._duration}</span> min`,
          );
        if (d._side)
          details.push(
            d._side === "left"
              ? "Left side"
              : d._side === "right"
                ? "Right side"
                : "Both sides",
          );
        const tod =
          d._hour !== undefined
            ? d._hour < 6
              ? "Night"
              : d._hour < 12
                ? "Morning"
                : d._hour < 18
                  ? "Afternoon"
                  : "Evening"
            : null;
        if (tod) details.push(tod);

        if (details.length > 0) {
          html += `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px">`;
          for (const detail of details) {
            html += `<span style="font-size:10px;color:${p.tooltipMuted};background:${p.tagBg};padding:2px 7px;border-radius:10px">${detail}</span>`;
          }
          html += `</div>`;
        }
        if (d._notes) {
          html += `<div style="font-size:11px;color:${p.tooltipMuted};margin-top:4px;font-style:italic;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-left:2px solid ${typeColor};padding-left:6px">${escapeHtml(d._notes)}</div>`;
        }
        html += `<div style="font-size:10px;color:${p.tooltipMuted};margin-top:8px;text-align:center">Tap to view details &rarr;</div>`;

        return html;
      },
    },
    legend: hasMultipleTypes
      ? {
          data: legendData,
          bottom: 0,
          textStyle: { color: p.tooltipMuted, fontSize: 12 },
          itemWidth: 10,
          itemHeight: 10,
          icon: "circle",
          selectedMode: true,
        }
      : undefined,
    xAxis: {
      type: "time",
      axisLine: { lineStyle: { color: p.axisLine } },
      axisTick: { lineStyle: { color: p.axisLine } },
      axisLabel: { color: p.axisLabel, fontSize: 11 },
      splitLine: { show: false },
      axisPointer: {
        show: true,
        snap: true,
        lineStyle: { color: p.rose + "44", width: 1, type: "dashed" },
        label: {
          show: true,
          formatter: ((params: { value: number }) => {
            const d = new Date(params.value);
            return d.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
          }) as unknown as string,
          backgroundColor: p.pointerBg,
          color: p.tooltipMuted,
          borderColor: p.axisLine,
          padding: [4, 8],
        },
      },
    },
    yAxis: {
      type: "value",
      name: unit,
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: { color: p.axisLabel, fontSize: 12 },
      min: yMin,
      max: yMax,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.axisLabel, fontSize: 11 },
      splitLine: { lineStyle: { color: p.splitLine, type: "dashed" } },
      axisPointer: {
        show: true,
        lineStyle: { color: p.rose + "33", width: 1, type: "dashed" },
        label: {
          show: true,
          formatter: ((params: { value: number }) =>
            fmtAmt(params.value, unit)) as unknown as string,
          backgroundColor: p.pointerBg,
          color: p.tooltipMuted,
          padding: [4, 8],
        },
      },
    },
    dataZoom: [
      {
        type: "inside",
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: "slider",
        start: 0,
        end: 100,
        height: 24,
        bottom: hasMultipleTypes ? 30 : 10,
        borderColor: p.axisLine,
        fillerColor: "rgba(200,125,163,0.15)",
        handleStyle: {
          color: p.rose,
          borderColor: p.roseDark,
          shadowBlur: 4,
          shadowColor: "rgba(200,125,163,0.3)",
        },
        handleSize: "110%",
        textStyle: { color: p.axisLabel, fontSize: 10 },
        dataBackground: {
          lineStyle: { color: p.rose + "66" },
          areaStyle: { color: p.rose + "22" },
        },
        selectedDataBackground: {
          lineStyle: { color: p.roseDark },
          areaStyle: { color: p.rose + "44" },
        },
        brushSelect: false,
      },
    ],
    series,
    grid: { left: 55, right: 20, top: 32, bottom: hasMultipleTypes ? 80 : 60 },
    animation: true,
    animationDuration: 600,
    animationEasing: "cubicOut",
  };
}

/* ── Daily Totals Bar Chart ─────────────────────────── */

export function buildDailyTotalsOption(
  dailyTotals: DailyTotal[],
  movingAvg: MovingAveragePoint[],
  unit: Unit,
  p: ChartPalette,
): EChartsOption {
  const hasPumpData = dailyTotals.some((d) => d.pump_ml > 0);
  const hasFeedData = dailyTotals.some((d) => d.feed_ml > 0);
  const useStacked = hasPumpData && hasFeedData;

  const feedBarData = dailyTotals.map((d) => [
    d.date,
    convertVal(d.feed_ml, unit),
  ]);

  const pumpBarData = dailyTotals.map((d) => [
    d.date,
    convertVal(d.pump_ml, unit),
  ]);

  const totalBarData = dailyTotals.map((d) => [
    d.date,
    convertVal(d.total_ml, unit),
  ]);

  const lineData = movingAvg.map((d) => [d.date, convertVal(d.avg, unit)]);

  // When both pump and feed exist, use pump totals for avg/goal to avoid
  // double-counting milk that is pumped then bottle-fed.
  const statsVals = useStacked
    ? dailyTotals.map((d) => convertVal(d.pump_ml, unit))
    : dailyTotals.map((d) => convertVal(d.total_ml, unit));
  const totalVals = dailyTotals.map((d) => convertVal(d.total_ml, unit));
  const dailyAvg = statsVals.length
    ? statsVals.reduce((a, b) => a + b, 0) / statsVals.length
    : 0;
  const dailyMax = statsVals.length ? safeMax(statsVals) : 0;

  const sorted = [...statsVals].sort((a, b) => a - b);
  const p75 =
    sorted.length > 3 ? sorted[Math.floor(sorted.length * 0.75)] : dailyMax;
  const goalStep = unit === "ml" ? 100 : 5;
  const goalVal = Math.ceil(p75 / goalStep) * goalStep;

  const legendData = useStacked
    ? ["Feeding", "Pumping", "7-Day Avg"]
    : ["Daily Total", "7-Day Avg"];

  const barSeries: BarSeriesOption[] = (
    useStacked
      ? [
          {
            name: "Feeding",
            type: "bar",
            stack: "total",
            data: feedBarData,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: p.rose },
                  { offset: 1, color: p.roseLight },
                ],
              } as unknown as string,
              borderRadius: [0, 0, 0, 0],
            },
            emphasis: {
              focus: "series",
              itemStyle: {
                shadowBlur: 10,
                shadowColor: "rgba(200,125,163,0.4)",
              },
            },
          },
          {
            name: "Pumping",
            type: "bar",
            stack: "total",
            data: pumpBarData,
            itemStyle: {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: p.sage },
                  { offset: 1, color: p.sageDark },
                ],
              } as unknown as string,
              borderRadius: [4, 4, 0, 0],
            },
            emphasis: {
              focus: "series",
              itemStyle: {
                shadowBlur: 10,
                shadowColor: "rgba(123,168,118,0.4)",
              },
            },
          },
        ]
      : [
          {
            name: "Daily Total",
            type: "bar",
            data: totalBarData,
            itemStyle: {
              color: (params: { dataIndex: number }) => {
                const val = totalVals[params.dataIndex] ?? 0;
                if (val >= goalVal) return p.roseDark;
                if (val >= dailyAvg) return p.rose;
                return p.roseLight;
              },
              borderRadius: [4, 4, 0, 0],
            },
            emphasis: {
              focus: "series",
              itemStyle: {
                shadowBlur: 10,
                shadowColor: "rgba(200,125,163,0.4)",
              },
            },
            markPoint: {
              symbol: "pin",
              symbolSize: 36,
              animation: true,
              data: [
                {
                  type: "max",
                  name: "Best",
                  label: {
                    formatter: (mp: { value: number }) =>
                      fmtAmt(mp.value, unit),
                    fontSize: 9,
                    color: "#fff",
                  },
                  itemStyle: { color: p.roseDark },
                },
                {
                  type: "min",
                  name: "Lowest",
                  label: {
                    formatter: (mp: { value: number }) =>
                      fmtAmt(mp.value, unit),
                    fontSize: 9,
                    color: "#fff",
                  },
                  itemStyle: { color: p.roseLight },
                  symbolOffset: [0, 4],
                },
              ],
            },
          },
        ]
  ) as BarSeriesOption[];

  if (barSeries.length > 0) {
    const targetBar = barSeries[useStacked ? 1 : 0];
    if (!targetBar.markLine) {
      targetBar.markLine = {
        silent: true,
        symbol: "none",
        lineStyle: { type: "dashed", width: 1.5 },
        data: [],
      };
    }
    (targetBar.markLine!.data as unknown[]).push(
      {
        yAxis: goalVal,
        label: {
          formatter: `Goal: ${fmtAmt(goalVal, unit)}`,
          position: "insideEndTop",
          fontSize: 10,
          fontWeight: "bold",
          color: p.roseDark,
          backgroundColor: p.surface + "d9",
          padding: [2, 6],
          borderRadius: 3,
        },
        lineStyle: { color: p.roseDark + "88", type: "dashed", width: 1.5 },
      },
      {
        yAxis: dailyAvg,
        label: {
          formatter: `Avg: ${fmtAmt(dailyAvg, unit)}`,
          position: "insideEndBottom",
          fontSize: 10,
          color: p.axisLabel,
        },
        lineStyle: { color: p.axisLabel + "66", type: "dotted", width: 1 },
      },
    );
  }

  const series: EChartsOption["series"] = [
    ...barSeries,
    {
      name: "7-Day Avg",
      type: "line",
      data: lineData,
      smooth: 0.3,
      lineStyle: { color: p.roseDark, width: 2.5 },
      itemStyle: { color: p.roseDark },
      symbol: "none",
      emphasis: {
        lineStyle: { width: 3.5 },
      },
      areaStyle: {
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: "rgba(200,125,163,0.12)" },
            { offset: 1, color: "rgba(200,125,163,0.01)" },
          ],
        } as unknown as string,
      },
    } as LineSeriesOption,
  ];

  const allVals = [...totalVals, ...lineData.map((d) => d[1] as number)];
  const chartMax = allVals.length ? safeMax(allVals) : 100;
  const yPad = chartMax * 0.15 || 20;

  return {
    toolbox: toolbox(p),
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: p.tooltipBg,
      borderColor: p.tooltipBorder,
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: p.tooltipText, fontSize: 13 },
      extraCssText:
        "border-radius:10px;box-shadow:0 4px 20px rgba(90,50,70,0.12);",
      axisPointer: {
        type: "shadow",
        shadowStyle: { color: "rgba(200,125,163,0.06)" },
      },
      formatter: (params: unknown) => {
        const items = params as Array<{
          seriesName: string;
          value: [string, number];
          color: string;
          seriesType: string;
        }>;
        if (!items.length) return "";

        const dateStr = items[0].value[0];
        const dt = new Date(dateStr);
        const dateLabel = dt.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        let html = `<div style="font-size:11px;color:${p.tooltipMuted};margin-bottom:6px">${dateLabel}</div>`;

        let dayTotal = 0;
        for (const item of items) {
          if (item.seriesType === "bar") {
            dayTotal += item.value[1];
          }
        }

        if (useStacked && dayTotal > 0) {
          html += `<div style="font-size:17px;font-weight:700;color:${p.tooltipText};margin-bottom:6px">${fmtAmt(dayTotal, unit)} <span style="font-size:11px;font-weight:400;color:${p.tooltipMuted}">total</span></div>`;
        }

        for (const item of items) {
          const val = item.value[1];
          if (val === 0 && item.seriesType === "bar") continue;
          const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color};margin-right:6px"></span>`;
          html += `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:12px;line-height:2">`;
          html += `<span>${dot}${item.seriesName}</span>`;
          html += `<span style="font-weight:600;font-variant-numeric:tabular-nums">${fmtAmt(val, unit)}</span></div>`;
        }

        if (goalVal > 0 && dayTotal > 0) {
          const pct = Math.round((dayTotal / goalVal) * 100);
          const color = pct >= 100 ? p.sage : pct >= 75 ? p.roseDark : p.rose;
          const barWidth = Math.min(100, pct);
          html += `<div style="margin-top:8px">`;
          html += `<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px"><span style="color:${p.tooltipMuted}">Daily goal</span><span style="color:${color};font-weight:600">${pct}%</span></div>`;
          html += `<div style="height:4px;border-radius:2px;background:${p.splitLine};overflow:hidden">`;
          html += `<div style="height:100%;width:${barWidth}%;border-radius:2px;background:${color};transition:width 0.3s"></div>`;
          html += `</div></div>`;
        }

        const dayData = dailyTotals.find((dtt) => dtt.date === dateStr);
        if (dayData) {
          html += `<div style="font-size:10px;color:${p.tooltipMuted};margin-top:6px">${dayData.count} session${dayData.count !== 1 ? "s" : ""} logged</div>`;
        }

        return html;
      },
    },
    legend: {
      data: legendData,
      bottom: 0,
      textStyle: { color: p.tooltipMuted, fontSize: 12 },
      itemWidth: 14,
      itemHeight: 10,
      selectedMode: true,
    },
    xAxis: {
      type: "category",
      data: dailyTotals.map((d) => d.date),
      axisLabel: {
        formatter: (val: string) => {
          const d = new Date(val);
          return `${d.getMonth() + 1}/${d.getDate()}`;
        },
        color: p.axisLabel,
        fontSize: 11,
      },
      axisLine: { lineStyle: { color: p.axisLine } },
      axisTick: { lineStyle: { color: p.axisLine } },
      axisPointer: {
        type: "shadow",
      },
    },
    yAxis: {
      type: "value",
      name: unit,
      nameLocation: "middle",
      nameGap: 40,
      nameTextStyle: { color: p.axisLabel, fontSize: 12 },
      max:
        Math.ceil((chartMax + yPad) / (unit === "ml" ? 50 : 5)) *
        (unit === "ml" ? 50 : 5),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: p.axisLabel, fontSize: 11 },
      splitLine: { lineStyle: { color: p.splitLine, type: "dashed" } },
    },
    dataZoom: [
      {
        type: "inside",
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
      },
      {
        type: "slider",
        start: 0,
        end: 100,
        height: 24,
        bottom: 30,
        borderColor: p.axisLine,
        fillerColor: "rgba(200,125,163,0.15)",
        handleStyle: {
          color: p.rose,
          borderColor: p.roseDark,
          shadowBlur: 4,
          shadowColor: "rgba(200,125,163,0.3)",
        },
        handleSize: "110%",
        textStyle: { color: p.axisLabel, fontSize: 10 },
        dataBackground: {
          lineStyle: { color: p.rose + "66" },
          areaStyle: { color: p.rose + "22" },
        },
        selectedDataBackground: {
          lineStyle: { color: p.roseDark },
          areaStyle: { color: p.rose + "44" },
        },
        brushSelect: true,
      },
    ],
    series,
    grid: { left: 55, right: 20, top: 32, bottom: 80 },
    animation: true,
    animationDuration: 600,
    animationEasing: "cubicOut",
  };
}

/* ── Visible-range stats helper ─────────────────────── */

export interface ZoomStats {
  count: number;
  total: number;
  avg: number;
  min: number;
  max: number;
  feedCount: number;
  pumpCount: number;
}

export function computeVisibleStats(
  sessions: Session[],
  startPct: number,
  endPct: number,
  unit: Unit,
): ZoomStats {
  if (sessions.length === 0) {
    return {
      count: 0,
      total: 0,
      avg: 0,
      min: 0,
      max: 0,
      feedCount: 0,
      pumpCount: 0,
    };
  }

  const timestamps = sessions.map((s) => s.timestamp.getTime());
  const tMin = safeMin(timestamps);
  const tMax = safeMax(timestamps);
  const range = tMax - tMin || 1;

  const visStart = tMin + (startPct / 100) * range;
  const visEnd = tMin + (endPct / 100) * range;

  const visible = sessions.filter((s) => {
    const t = s.timestamp.getTime();
    return t >= visStart && t <= visEnd;
  });

  if (visible.length === 0) {
    return {
      count: 0,
      total: 0,
      avg: 0,
      min: 0,
      max: 0,
      feedCount: 0,
      pumpCount: 0,
    };
  }

  const amounts = visible.map((s) => convertVal(s.amount_ml, unit));
  const total = amounts.reduce((a, b) => a + b, 0);

  return {
    count: visible.length,
    total: Math.round(total),
    avg: Math.round(total / visible.length),
    min: Math.round(safeMin(amounts)),
    max: Math.round(safeMax(amounts)),
    feedCount: visible.filter((s) => s.session_type !== "pumping").length,
    pumpCount: visible.filter((s) => s.session_type === "pumping").length,
  };
}

export function computeVisibleDailyStats(
  dailyTotals: DailyTotal[],
  startPct: number,
  endPct: number,
  unit: Unit,
): ZoomStats {
  if (dailyTotals.length === 0) {
    return {
      count: 0,
      total: 0,
      avg: 0,
      min: 0,
      max: 0,
      feedCount: 0,
      pumpCount: 0,
    };
  }

  const startIdx = Math.floor((startPct / 100) * dailyTotals.length);
  const endIdx = Math.ceil((endPct / 100) * dailyTotals.length);
  const visible = dailyTotals.slice(startIdx, endIdx);

  if (visible.length === 0) {
    return {
      count: 0,
      total: 0,
      avg: 0,
      min: 0,
      max: 0,
      feedCount: 0,
      pumpCount: 0,
    };
  }

  // When both pump and feed data exist, use pump totals to avoid
  // double-counting milk that is pumped then bottle-fed.
  const hasBothTypes =
    visible.some((d) => d.pump_ml > 0) && visible.some((d) => d.feed_ml > 0);
  const vals = hasBothTypes
    ? visible.map((d) => convertVal(d.pump_ml, unit))
    : visible.map((d) => convertVal(d.total_ml, unit));
  const total = vals.reduce((a, b) => a + b, 0);

  return {
    count: visible.length,
    total: Math.round(total),
    avg: Math.round(total / visible.length),
    min: Math.round(safeMin(vals)),
    max: Math.round(safeMax(vals)),
    feedCount: visible.reduce((a, d) => a + d.count, 0),
    pumpCount: 0,
  };
}
