import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactECharts from "echarts-for-react";
import type { Session } from "@/types/session";
import type { Unit } from "@/types/common";
import { buildScatterOption } from "@/lib/chart-helpers";

interface SessionScatterProps {
  sessions: Session[];
  unit: Unit;
}

export default function SessionScatter({
  sessions,
  unit,
}: SessionScatterProps) {
  const navigate = useNavigate();

  const option = buildScatterOption(sessions, unit);

  const onEvents = useCallback(
    () => ({
      click: (params: { data?: { sessionId?: number } }) => {
        const id = params.data?.sessionId;
        if (id) navigate(`/log/${id}`);
      },
    }),
    [navigate],
  );

  if (sessions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-plum/40">
        No session data to display
      </div>
    );
  }

  return (
    <ReactECharts
      option={option}
      style={{ height: 300, width: "100%" }}
      onEvents={onEvents()}
      showLoading={false}
      loadingOption={{ text: "", spinnerRadius: 12, color: "#E8A0BF" }}
      notMerge
    />
  );
}
