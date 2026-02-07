import type { Session } from "@/types/session";
import {
  format,
  startOfDay,
  eachDayOfInterval,
  startOfISOWeek,
} from "date-fns";

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
  let total = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const s of sessions) {
    total += s.amount_ml;
    if (s.amount_ml < min) min = s.amount_ml;
    if (s.amount_ml > max) max = s.amount_ml;
  }
  return {
    total: Math.round(total),
    avg: Math.round(total / sessions.length),
    count: sessions.length,
    min,
    max,
  };
}

// --- Monthly totals ---

export interface MonthlyTotal {
  month: string; // "YYYY-MM"
  total_ml: number;
  feed_ml: number;
  pump_ml: number;
  count: number;
  avg_daily_ml: number;
  days_with_data: number;
}

export function computeMonthlyTotals(sessions: Session[]): MonthlyTotal[] {
  const grouped = new Map<
    string,
    {
      total: number;
      feed: number;
      pump: number;
      count: number;
      days: Set<string>;
    }
  >();

  for (const s of sessions) {
    const month = format(s.timestamp, "yyyy-MM");
    const day = format(s.timestamp, "yyyy-MM-dd");
    const isPump = s.session_type === "pumping";
    const existing = grouped.get(month);
    if (existing) {
      existing.total += s.amount_ml;
      existing.count += 1;
      existing.days.add(day);
      if (isPump) existing.pump += s.amount_ml;
      else existing.feed += s.amount_ml;
    } else {
      grouped.set(month, {
        total: s.amount_ml,
        feed: isPump ? 0 : s.amount_ml,
        pump: isPump ? s.amount_ml : 0,
        count: 1,
        days: new Set([day]),
      });
    }
  }

  return Array.from(grouped.entries())
    .map(([month, { total, feed, pump, count, days }]) => ({
      month,
      total_ml: Math.round(total),
      feed_ml: Math.round(feed),
      pump_ml: Math.round(pump),
      count,
      avg_daily_ml: Math.round(total / days.size),
      days_with_data: days.size,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

// --- Duration stats ---

export interface DurationStats {
  avg_min: number;
  min_min: number;
  max_min: number;
  count_with_duration: number;
  total_count: number;
}

export function computeDurationStats(sessions: Session[]): DurationStats {
  const withDuration = sessions.filter(
    (s) => s.duration_min != null && s.duration_min > 0,
  );

  if (withDuration.length === 0) {
    return {
      avg_min: 0,
      min_min: 0,
      max_min: 0,
      count_with_duration: 0,
      total_count: sessions.length,
    };
  }

  let total = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const s of withDuration) {
    const d = s.duration_min!;
    total += d;
    if (d < min) min = d;
    if (d > max) max = d;
  }

  return {
    avg_min: Math.round(total / withDuration.length),
    min_min: min,
    max_min: max,
    count_with_duration: withDuration.length,
    total_count: sessions.length,
  };
}

// --- Side volumes ---

export interface SideVolumes {
  left_total_ml: number;
  right_total_ml: number;
  both_total_ml: number;
  left_count: number;
  right_count: number;
  both_count: number;
  left_avg_ml: number;
  right_avg_ml: number;
}

export function computeSideVolumes(sessions: Session[]): SideVolumes {
  let leftTotal = 0,
    rightTotal = 0,
    bothTotal = 0;
  let leftCount = 0,
    rightCount = 0,
    bothCount = 0;

  for (const s of sessions) {
    if (s.side === "left") {
      leftTotal += s.amount_ml;
      leftCount++;
    } else if (s.side === "right") {
      rightTotal += s.amount_ml;
      rightCount++;
    } else if (s.side === "both") {
      bothTotal += s.amount_ml;
      bothCount++;
    }
  }

  return {
    left_total_ml: Math.round(leftTotal),
    right_total_ml: Math.round(rightTotal),
    both_total_ml: Math.round(bothTotal),
    left_count: leftCount,
    right_count: rightCount,
    both_count: bothCount,
    left_avg_ml: leftCount > 0 ? Math.round(leftTotal / leftCount) : 0,
    right_avg_ml: rightCount > 0 ? Math.round(rightTotal / rightCount) : 0,
  };
}

// --- Session regularity ---

export interface RegularityStats {
  avg_gap_hours: number;
  min_gap_hours: number;
  max_gap_hours: number;
  typical_sessions_per_day: number;
}

export function computeSessionRegularity(sessions: Session[]): RegularityStats {
  if (sessions.length < 2) {
    return {
      avg_gap_hours: 0,
      min_gap_hours: 0,
      max_gap_hours: 0,
      typical_sessions_per_day: 0,
    };
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  let totalGap = 0;
  let minGap = Infinity;
  let maxGap = -Infinity;

  for (let i = 1; i < sorted.length; i++) {
    const gap =
      (new Date(sorted[i].timestamp).getTime() -
        new Date(sorted[i - 1].timestamp).getTime()) /
      (1000 * 60 * 60);
    totalGap += gap;
    if (gap < minGap) minGap = gap;
    if (gap > maxGap) maxGap = gap;
  }

  const avgGap = totalGap / (sorted.length - 1);

  return {
    avg_gap_hours: Math.round(avgGap * 10) / 10,
    min_gap_hours: Math.round(minGap * 10) / 10,
    max_gap_hours: Math.round(maxGap * 10) / 10,
    typical_sessions_per_day:
      avgGap > 0 ? Math.round((24 / avgGap) * 10) / 10 : 0,
  };
}

// --- Weekly totals ---

export interface WeeklyTotal {
  weekStart: string; // "YYYY-MM-DD" (Monday)
  total_ml: number;
  count: number;
  avg_daily_ml: number;
  days_with_data: number;
}

export function computeWeeklyTotals(sessions: Session[]): WeeklyTotal[] {
  const grouped = new Map<
    string,
    { total: number; count: number; days: Set<string> }
  >();

  for (const s of sessions) {
    const weekStart = format(startOfISOWeek(s.timestamp), "yyyy-MM-dd");
    const day = format(s.timestamp, "yyyy-MM-dd");
    const existing = grouped.get(weekStart);
    if (existing) {
      existing.total += s.amount_ml;
      existing.count += 1;
      existing.days.add(day);
    } else {
      grouped.set(weekStart, {
        total: s.amount_ml,
        count: 1,
        days: new Set([day]),
      });
    }
  }

  return Array.from(grouped.entries())
    .map(([weekStart, { total, count, days }]) => ({
      weekStart,
      total_ml: Math.round(total),
      count,
      avg_daily_ml: Math.round(total / days.size),
      days_with_data: days.size,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
