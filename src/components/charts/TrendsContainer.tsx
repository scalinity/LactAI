import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/session";
import type { DailyTotal, MovingAveragePoint } from "@/lib/aggregation";
import type { Unit } from "@/types/common";
import SessionScatter from "./SessionScatter";
import DailyTotalsBar from "./DailyTotalsBar";

interface TrendsContainerProps {
  sessions: Session[];
  dailyTotals: DailyTotal[];
  movingAvg: MovingAveragePoint[];
  unit: Unit;
}

type Tab = "sessions" | "daily";

export default function TrendsContainer({
  sessions,
  dailyTotals,
  movingAvg,
  unit,
}: TrendsContainerProps) {
  const [tab, setTab] = useState<Tab>("sessions");

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-xl bg-plum/5 p-1">
        {(
          [
            { key: "sessions", label: "Sessions" },
            { key: "daily", label: "Daily Totals" },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
              tab === key
                ? "bg-white text-plum shadow-sm"
                : "text-plum/50 hover:text-plum",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sessions" ? (
        <SessionScatter sessions={sessions} unit={unit} />
      ) : (
        <DailyTotalsBar
          dailyTotals={dailyTotals}
          movingAvg={movingAvg}
          unit={unit}
        />
      )}
    </div>
  );
}
