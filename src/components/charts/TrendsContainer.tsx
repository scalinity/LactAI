import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/session";
import type { DailyTotal, MovingAveragePoint } from "@/lib/aggregation";
import type { Unit } from "@/types/common";
import {
  computeVisibleStats,
  computeVisibleDailyStats,
  type ZoomStats,
} from "@/lib/chart-helpers";
import SessionScatter from "./SessionScatter";
import DailyTotalsBar from "./DailyTotalsBar";
import { useTranslation } from "@/i18n";

interface TrendsContainerProps {
  sessions: Session[];
  dailyTotals: DailyTotal[];
  movingAvg: MovingAveragePoint[];
  unit: Unit;
}

type Tab = "sessions" | "daily";

const emptyStats: ZoomStats = {
  count: 0,
  total: 0,
  avg: 0,
  min: 0,
  max: 0,
  feedCount: 0,
  pumpCount: 0,
};

function fmtUnit(val: number, unit: Unit): string {
  return unit === "oz" ? `${val.toFixed(1)}` : `${Math.round(val)}`;
}

function StatsStrip({
  stats,
  unit,
  tab,
  isZoomed,
}: {
  stats: ZoomStats;
  unit: Unit;
  tab: Tab;
  isZoomed: boolean;
}) {
  const { t } = useTranslation();
  if (stats.count === 0) return null;

  const items =
    tab === "sessions"
      ? [
          { label: t("trends.sessions"), value: `${stats.count}` },
          {
            label: t("trends.avg"),
            value: `${fmtUnit(stats.avg, unit)} ${unit}`,
          },
          {
            label: t("trends.min"),
            value: `${fmtUnit(stats.min, unit)} ${unit}`,
          },
          {
            label: t("trends.max"),
            value: `${fmtUnit(stats.max, unit)} ${unit}`,
          },
        ]
      : [
          { label: t("trends.days"), value: `${stats.count}` },
          {
            label: t("trends.dailyAvg"),
            value: `${fmtUnit(stats.avg, unit)} ${unit}`,
          },
          {
            label: t("trends.best"),
            value: `${fmtUnit(stats.max, unit)} ${unit}`,
          },
          {
            label: t("trends.total"),
            value: `${fmtUnit(stats.total, unit)} ${unit}`,
          },
        ];

  return (
    <div
      className={cn(
        "mt-2 overflow-hidden rounded-xl transition-all duration-300",
        isZoomed
          ? "bg-gradient-to-r from-plum/8 to-plum/4 ring-1 ring-plum/10"
          : "bg-plum/3",
      )}
    >
      {isZoomed && (
        <div className="px-3 pt-2 text-[10px] font-medium tracking-wider text-plum/40 uppercase">
          {t("trends.visibleRange")}
        </div>
      )}
      <div className="grid grid-cols-4 gap-1 px-3 py-2">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-[10px] font-medium text-plum/40 uppercase tracking-wide">
              {item.label}
            </div>
            <div
              className={cn(
                "font-[Nunito] text-sm font-bold tabular-nums transition-colors duration-200",
                isZoomed ? "text-plum" : "text-plum/70",
              )}
            >
              {item.value}
            </div>
          </div>
        ))}
      </div>
      {tab === "sessions" && (stats.feedCount > 0 || stats.pumpCount > 0) && (
        <div className="flex items-center justify-center gap-4 border-t border-plum/5 px-3 py-1.5">
          {stats.feedCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-plum/50">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-primary" />
              {stats.feedCount} {t("trends.feeding")}
            </div>
          )}
          {stats.pumpCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-plum/50">
              <span className="inline-block h-2 w-2 rounded-full bg-sage" />
              {stats.pumpCount} {t("trends.pumping")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TrendsContainer({
  sessions,
  dailyTotals,
  movingAvg,
  unit,
}: TrendsContainerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("sessions");
  const [zoomRange, setZoomRange] = useState<[number, number]>([0, 100]);

  const handleZoomChange = useCallback((start: number, end: number) => {
    setZoomRange([start, end]);
  }, []);

  const isZoomed = zoomRange[0] > 0.5 || zoomRange[1] < 99.5;

  const stats = useMemo(() => {
    if (tab === "sessions") {
      if (sessions.length === 0) return emptyStats;
      return computeVisibleStats(sessions, zoomRange[0], zoomRange[1], unit);
    }
    if (dailyTotals.length === 0) return emptyStats;
    return computeVisibleDailyStats(
      dailyTotals,
      zoomRange[0],
      zoomRange[1],
      unit,
    );
  }, [tab, sessions, dailyTotals, zoomRange, unit]);

  const handleTabChange = useCallback((newTab: Tab) => {
    setTab(newTab);
    setZoomRange([0, 100]);
  }, []);

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl bg-plum/5 p-1">
        {(
          [
            { key: "sessions", label: t("trends.sessions") },
            { key: "daily", label: t("trends.dailyTotals") },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => handleTabChange(key)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
              tab === key
                ? "bg-surface text-plum shadow-sm"
                : "text-plum/50 hover:text-plum",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sessions" ? (
        <SessionScatter
          sessions={sessions}
          unit={unit}
          onZoomChange={handleZoomChange}
        />
      ) : (
        <DailyTotalsBar
          dailyTotals={dailyTotals}
          movingAvg={movingAvg}
          unit={unit}
          onZoomChange={handleZoomChange}
        />
      )}

      <StatsStrip stats={stats} unit={unit} tab={tab} isZoomed={isZoomed} />
    </div>
  );
}
