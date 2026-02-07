import { useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactEChartsCore from "echarts-for-react/lib/core";
import echarts from "@/lib/echarts";
import type { Session } from "@/types/session";
import type { Unit } from "@/types/common";
import { buildScatterOption, getChartPalette } from "@/lib/chart-helpers";
import { useThemeStore } from "@/stores/useThemeStore";

interface SessionScatterProps {
  sessions: Session[];
  unit: Unit;
  onZoomChange?: (start: number, end: number) => void;
}

export default function SessionScatter({
  sessions,
  unit,
  onZoomChange,
}: SessionScatterProps) {
  const navigate = useNavigate();
  const chartRef = useRef<ReactEChartsCore>(null);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  const option = useMemo(
    () => buildScatterOption(sessions, unit, getChartPalette()),
    [sessions, unit, resolvedTheme],
  );

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
      click: (params: { data?: { sessionId?: number } }) => {
        const id = params.data?.sessionId;
        if (id) navigate(`/log/${id}`);
      },
      datazoom: handleDataZoom,
      restore: () => onZoomChange?.(0, 100),
    }),
    [navigate, handleDataZoom, onZoomChange],
  );

  if (sessions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-plum/40">
        No session data to display
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
      showLoading={false}
      loadingOption={{
        text: "",
        spinnerRadius: 12,
        color: "var(--color-rose-primary)",
      }}
      notMerge
      lazyUpdate
      opts={{ renderer: "canvas", devicePixelRatio: 2 }}
    />
  );
}
