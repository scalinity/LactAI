import { useSessions } from "@/db/hooks";
import { useAppStore } from "@/stores/useAppStore";
import { convertAmount, formatAmount } from "@/lib/units";
import { subDays } from "date-fns";
import { Sparkles, Sun, Moon, Sunrise } from "lucide-react";
import Card from "@/components/ui/Card";

function getTimeOfDay(date: Date): "morning" | "afternoon" | "evening" | "night" {
  const h = date.getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

const TimeIcon = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
  night: Moon,
} as const;

export default function PatternFinderCard() {
  const { preferredUnit } = useAppStore();
  const sessions = useSessions({ startDate: subDays(new Date(), 30) });

  if (!sessions || sessions.length < 5) return null;

  // Find most productive time of day
  const byTime: Record<string, { total: number; count: number }> = {};
  for (const s of sessions) {
    const tod = getTimeOfDay(s.timestamp);
    if (!byTime[tod]) byTime[tod] = { total: 0, count: 0 };
    byTime[tod].total += s.amount_ml;
    byTime[tod].count += 1;
  }

  const bestTime = Object.entries(byTime).sort(
    ([, a], [, b]) => b.total / b.count - a.total / a.count,
  )[0];

  const bestTimeKey = bestTime[0] as keyof typeof TimeIcon;
  const BestIcon = TimeIcon[bestTimeKey];
  const bestAvg = bestTime[1].total / bestTime[1].count;

  // Find most productive side
  const bySide: Record<string, { total: number; count: number }> = {};
  for (const s of sessions) {
    const side = s.side || "unspecified";
    if (!bySide[side]) bySide[side] = { total: 0, count: 0 };
    bySide[side].total += s.amount_ml;
    bySide[side].count += 1;
  }

  const bestSide = Object.entries(bySide)
    .filter(([k]) => k !== "unspecified")
    .sort(([, a], [, b]) => b.total / b.count - a.total / a.count)[0];

  // Average sessions per day
  const daySet = new Set(
    sessions.map((s) => s.timestamp.toISOString().slice(0, 10)),
  );
  const avgSessionsPerDay = (sessions.length / daySet.size).toFixed(1);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-400" />
        <h3 className="font-[Nunito] text-sm font-bold text-plum">
          Patterns (30 days)
        </h3>
      </div>
      <div className="space-y-3 text-sm text-plum/80">
        <div className="flex items-center gap-2">
          <BestIcon className="h-4 w-4 text-rose-primary" />
          <span>
            Best time: <strong className="text-plum capitalize">{bestTimeKey}</strong>{" "}
            (avg{" "}
            {formatAmount(
              convertAmount(bestAvg, "ml", preferredUnit),
              preferredUnit,
            )}
            /session)
          </span>
        </div>
        {bestSide && (
          <div className="flex items-center gap-2">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-primary/20 text-[10px] font-bold text-rose-primary">
              {bestSide[0][0].toUpperCase()}
            </span>
            <span>
              More productive side:{" "}
              <strong className="text-plum capitalize">{bestSide[0]}</strong>
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-plum/40">#</span>
          <span>
            Average <strong className="text-plum">{avgSessionsPerDay}</strong>{" "}
            sessions/day
          </span>
        </div>
      </div>
    </Card>
  );
}
