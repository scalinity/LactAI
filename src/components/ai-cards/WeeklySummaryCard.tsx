import { useMemo } from "react";
import { useSessions } from "@/db/hooks";
import { useAppStore } from "@/stores/useAppStore";
import { convertAmount, formatAmount } from "@/lib/units";
import { computeDailyTotals } from "@/lib/aggregation";
import { subDays, format } from "date-fns";
import { CalendarDays } from "lucide-react";
import Card from "@/components/ui/Card";
import { useTranslation } from "@/i18n";

export default function WeeklySummaryCard() {
  const { t } = useTranslation();
  const { preferredUnit } = useAppStore();

  const weekAgo = useMemo(() => subDays(new Date(), 7), []);
  const sessions = useSessions({ startDate: weekAgo });

  if (!sessions || sessions.length < 3) return null;

  const dailyTotals = computeDailyTotals(sessions);

  // Daily average
  const totalMl = dailyTotals.reduce((sum, d) => sum + d.total_ml, 0);
  const dailyAvgMl = totalMl / dailyTotals.length;

  // Best day
  const bestDay = dailyTotals.reduce((best, d) =>
    d.total_ml > best.total_ml ? d : best,
  );

  // Avg sessions per day
  const totalSessions = dailyTotals.reduce((sum, d) => sum + d.count, 0);
  const avgSessionsPerDay = (totalSessions / dailyTotals.length).toFixed(1);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-rose-primary" />
        <h3 className="font-[Nunito] text-sm font-bold text-plum">
          {t("charts.weeklyBreakdown")}
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-plum/40">
            {t("charts.dailyAvg")}
          </p>
          <p className="font-[Nunito] text-lg font-bold text-plum">
            {formatAmount(
              convertAmount(dailyAvgMl, "ml", preferredUnit),
              preferredUnit,
            )}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-plum/40">
            {t("charts.bestDay")}
          </p>
          <p className="font-[Nunito] text-lg font-bold text-plum">
            {format(bestDay.dateObj, "EEE")}
          </p>
          <p className="text-[10px] text-plum/40">
            {formatAmount(
              convertAmount(bestDay.total_ml, "ml", preferredUnit),
              preferredUnit,
            )}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-plum/40">
            {t("charts.sessionsPerDay")}
          </p>
          <p className="font-[Nunito] text-lg font-bold text-plum">
            {avgSessionsPerDay}
          </p>
        </div>
      </div>
    </Card>
  );
}
