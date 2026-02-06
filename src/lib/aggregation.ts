import type { Session } from "@/types/session";
import { format, startOfDay, eachDayOfInterval } from "date-fns";

export interface DailyTotal {
  date: string;
  dateObj: Date;
  total_ml: number;
  feed_ml: number;
  pump_ml: number;
  count: number;
}

export interface MovingAveragePoint {
  date: string;
  dateObj: Date;
  avg: number;
}

export function computeDailyTotals(sessions: Session[]): DailyTotal[] {
  const grouped = new Map<
    string,
    { total: number; feed: number; pump: number; count: number; date: Date }
  >();

  for (const s of sessions) {
    const key = format(startOfDay(s.timestamp), "yyyy-MM-dd");
    const existing = grouped.get(key);
    const isPump = s.session_type === "pumping";
    if (existing) {
      existing.total += s.amount_ml;
      existing.count += 1;
      if (isPump) {
        existing.pump += s.amount_ml;
      } else {
        existing.feed += s.amount_ml;
      }
    } else {
      grouped.set(key, {
        total: s.amount_ml,
        feed: isPump ? 0 : s.amount_ml,
        pump: isPump ? s.amount_ml : 0,
        count: 1,
        date: startOfDay(s.timestamp),
      });
    }
  }

  return Array.from(grouped.entries())
    .map(([date, { total, feed, pump, count, date: dateObj }]) => ({
      date,
      dateObj,
      total_ml: Math.round(total),
      feed_ml: Math.round(feed),
      pump_ml: Math.round(pump),
      count,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function computeMovingAverage(
  dailyTotals: DailyTotal[],
  windowDays = 7,
): MovingAveragePoint[] {
  if (dailyTotals.length === 0) return [];

  const startDate = dailyTotals[0].dateObj;
  const endDate = dailyTotals[dailyTotals.length - 1].dateObj;
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const totalsByDate = new Map(dailyTotals.map((d) => [d.date, d.total_ml]));

  return allDays.map((day, i) => {
    const windowStart = Math.max(0, i - windowDays + 1);
    const windowSlice = allDays.slice(windowStart, i + 1);
    const sum = windowSlice.reduce((acc, d) => {
      const key = format(d, "yyyy-MM-dd");
      return acc + (totalsByDate.get(key) || 0);
    }, 0);
    const avg = sum / windowSlice.length;

    return {
      date: format(day, "yyyy-MM-dd"),
      dateObj: day,
      avg: Math.round(avg),
    };
  });
}

export function computeSessionStats(sessions: Session[]) {
  if (sessions.length === 0) {
    return { total: 0, avg: 0, count: 0, min: 0, max: 0 };
  }
  const amounts = sessions.map((s) => s.amount_ml);
  const total = amounts.reduce((a, b) => a + b, 0);
  return {
    total: Math.round(total),
    avg: Math.round(total / sessions.length),
    count: sessions.length,
    min: Math.min(...amounts),
    max: Math.max(...amounts),
  };
}
