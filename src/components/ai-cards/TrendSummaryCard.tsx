import { useTodaySessions, useSessions } from "@/db/hooks";
import { useAppStore } from "@/stores/useAppStore";
import { convertAmount, formatAmount } from "@/lib/units";
import { subDays } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Card from "@/components/ui/Card";

export default function TrendSummaryCard() {
  const { preferredUnit } = useAppStore();
  const todaySessions = useTodaySessions();

  const weekAgo = subDays(new Date(), 7);
  const twoWeeksAgo = subDays(new Date(), 14);

  const allRecent = useSessions({ startDate: twoWeeksAgo });

  if (!allRecent || !todaySessions) return null;

  const thisWeek = allRecent.filter((s) => s.timestamp >= weekAgo);
  const lastWeek = allRecent.filter(
    (s) => s.timestamp < weekAgo && s.timestamp >= twoWeeksAgo,
  );

  const thisWeekTotal = thisWeek.reduce((sum, s) => sum + s.amount_ml, 0);
  const lastWeekTotal = lastWeek.reduce((sum, s) => sum + s.amount_ml, 0);
  const avgPerSession =
    thisWeek.length > 0 ? thisWeekTotal / thisWeek.length : 0;

  const diff =
    lastWeekTotal > 0
      ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100
      : 0;

  const TrendIcon =
    diff > 5 ? TrendingUp : diff < -5 ? TrendingDown : Minus;
  const trendColor =
    diff > 5 ? "text-sage" : diff < -5 ? "text-amber-500" : "text-plum/40";

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-sage" />
        <h3 className="font-[Nunito] text-sm font-bold text-plum">
          7-Day Summary
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-plum/40">
            Total
          </p>
          <p className="font-[Nunito] text-lg font-bold text-plum">
            {formatAmount(
              convertAmount(thisWeekTotal, "ml", preferredUnit),
              preferredUnit,
            )}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-plum/40">
            Avg/Session
          </p>
          <p className="font-[Nunito] text-lg font-bold text-plum">
            {formatAmount(
              convertAmount(avgPerSession, "ml", preferredUnit),
              preferredUnit,
            )}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-plum/40">
            vs Last Week
          </p>
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <p className={`font-[Nunito] text-lg font-bold ${trendColor}`}>
              {lastWeekTotal === 0 ? "--" : `${diff > 0 ? "+" : ""}${diff.toFixed(0)}%`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
