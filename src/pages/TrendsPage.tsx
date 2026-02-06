import React, { useState, useEffect } from "react";
import type { RangePreset } from "@/types/common";
import { useChartData } from "@/hooks/useChartData";
import { useAppStore } from "@/stores/useAppStore";
import RangeSelector from "@/components/charts/RangeSelector";
import TrendsContainer from "@/components/charts/TrendsContainer";
import TrendSummaryCard from "@/components/ai-cards/TrendSummaryCard";
import PatternFinderCard from "@/components/ai-cards/PatternFinderCard";
import EmptyState from "@/components/ui/EmptyState";
import { TrendingUp } from "lucide-react";
import { UnitToggle } from "@/components/ui/UnitToggle";

export default function TrendsPage() {
  const [rangePreset, setRangePreset] = useState<RangePreset>("1M");
  const { preferredUnit, setPreferredUnit } = useAppStore();
  const { sessions, dailyTotals, movingAvg } = useChartData(rangePreset);

  const hasData = sessions.length > 0;

  return (
    <div className="animate-page-enter mx-auto max-w-lg px-4 pt-6 pb-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-[Nunito] text-2xl font-bold text-plum">Trends</h1>
        {/* Unit toggle */}
        <UnitToggle
          isMetric={preferredUnit === "ml"}
          onChange={(isMetric) => setPreferredUnit(isMetric ? "ml" : "oz")}
        />
      </div>

      {/* Range Selector */}
      <RangeSelector value={rangePreset} onChange={setRangePreset} />

      {/* Charts or Empty State */}
      {!hasData ? (
        <div className="mt-8">
          <EmptyState
            icon={<TrendingUp className="h-12 w-12 text-plum-light" />}
            title="No data yet"
            description="Start logging sessions to see your trends."
          />
        </div>
      ) : (
        <>
          <div className="mt-4">
            <TrendsContainer
              sessions={sessions}
              dailyTotals={dailyTotals}
              movingAvg={movingAvg}
              unit={preferredUnit}
            />
          </div>

          {/* AI Insights */}
          <div className="mt-8 space-y-4">
            <h2 className="font-[Nunito] text-lg font-bold text-plum">
              AI Insights
            </h2>
            <TrendSummaryCard />
            <PatternFinderCard />
          </div>
        </>
      )}
    </div>
  );
}
