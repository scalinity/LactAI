import { db } from "@/db";
import {
  computeDailyTotals,
  computeSessionStats,
  computeMonthlyTotals,
  computeDurationStats,
  computeSideVolumes,
  computeSessionRegularity,
  computeWeeklyTotals,
} from "./aggregation";
import { convertAmount, formatAmount } from "./units";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import type { Unit } from "@/types/common";
import type { Session } from "@/types/session";

export interface ChatDataContext {
  data_summary: string;
  session_count: number;
  thread_summaries?: string;
}

const MAX_SUMMARY_CHARS = 8000;
const MAX_THREAD_SUMMARIES_CHARS = 1000;

export async function buildChatContext(
  preferredUnit: Unit,
): Promise<ChatDataContext> {
  try {
    return await buildChatContextInner(preferredUnit);
  } catch (e) {
    console.error("Failed to build chat context from session data:", e);
    try {
      const count = await db.sessions.count();
      return { data_summary: "", session_count: count };
    } catch {
      return { data_summary: "", session_count: 0 };
    }
  }
}

/**
 * Normalize a session timestamp to a reliable Date object.
 * Handles cases where IndexedDB may have stored timestamps as
 * strings, numbers, or Date objects.
 */
function toSafeDate(value: unknown): Date {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  const d = new Date(value as string | number);
  if (isNaN(d.getTime())) throw new Error("Invalid timestamp");
  return d;
}

/**
 * Normalize all session timestamps in-place so downstream functions
 * (computeDailyTotals, computeSessionStats, format()) receive real
 * Date objects. Returns only sessions with valid timestamps.
 */
function normalizeSessions(sessions: Session[]): Session[] {
  const result: Session[] = [];
  for (const s of sessions) {
    try {
      result.push({ ...s, timestamp: toSafeDate(s.timestamp) });
    } catch {
      // Drop sessions with unparseable timestamps
    }
  }
  return result;
}

async function buildChatContextInner(
  preferredUnit: Unit,
): Promise<ChatDataContext> {
  const totalCount = await db.sessions.count();

  if (totalCount === 0) {
    // Still fetch thread summaries even if no sessions
    const threadSummaries = await buildThreadSummaries();
    return {
      data_summary: "",
      session_count: 0,
      thread_summaries: threadSummaries || undefined,
    };
  }

  const now = new Date();
  const today = startOfDay(now);
  const todayEnd = endOfDay(now);
  const sevenDaysAgo = subDays(today, 7);
  const thirtyDaysAgo = subDays(today, 30);

  // Lazy-loaded full scan cache — used at most once, shared across fallbacks
  let allSessionsCache: Session[] | null = null;
  async function getAllSessions(): Promise<Session[]> {
    if (!allSessionsCache) {
      allSessionsCache = normalizeSessions(await db.sessions.toArray());
    }
    return allSessionsCache;
  }

  // Primary: indexed query for last 30 days
  let last30d: Session[] = normalizeSessions(
    await db.sessions
      .where("timestamp")
      .above(thirtyDaysAgo)
      .sortBy("timestamp"),
  );

  // Fallback: if indexed query returns empty but sessions exist,
  // the index may have type mismatches (e.g., timestamps stored as
  // strings/numbers). Fall back to a full scan with JS filtering.
  if (last30d.length === 0 && totalCount > 0) {
    console.warn(
      "Chat context: indexed timestamp query returned 0 results but",
      totalCount,
      "sessions exist. Falling back to full scan.",
    );
    const all = await getAllSessions();
    const thirtyDaysAgoMs = thirtyDaysAgo.getTime();
    last30d = all
      .filter((s) => s.timestamp.getTime() > thirtyDaysAgoMs)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Fetch older sessions for monthly rollups + first session + threads (parallel)
  const thirtyDaysAgoMs30 = thirtyDaysAgo.getTime();
  const [olderSessions, firstSession, recentThreads] = await Promise.all([
    getAllSessions()
      .then((all) =>
        all.filter((s) => s.timestamp.getTime() <= thirtyDaysAgoMs30),
      )
      .catch(() =>
        db.sessions
          .where("timestamp")
          .belowOrEqual(thirtyDaysAgo)
          .toArray()
          .then((r) => normalizeSessions(r))
          .catch(async () => {
            const all = await getAllSessions();
            return all.filter(
              (s) => s.timestamp.getTime() <= thirtyDaysAgoMs30,
            );
          }),
      ),
    db.sessions.orderBy("timestamp").first(),
    db.chat_threads.orderBy("created_at").reverse().limit(10).toArray(),
  ]);

  const todayStart = today.getTime();
  const todayEndMs = todayEnd.getTime();
  const sevenDaysAgoMs = sevenDaysAgo.getTime();

  const todaySessions = last30d.filter((s) => {
    const t = s.timestamp.getTime();
    return t >= todayStart && t <= todayEndMs;
  });
  const last7d = last30d.filter((s) => s.timestamp.getTime() >= sevenDaysAgoMs);
  const weeks2to4 = last30d.filter((s) => {
    const t = s.timestamp.getTime();
    return t < sevenDaysAgoMs && t >= thirtyDaysAgo.getTime();
  });

  // Split sessions by type to avoid double-counting milk that is
  // pumped then bottle-fed. Pump sessions = supply produced,
  // feed sessions = intake consumed.
  const pumpSessions7d = last7d.filter((s) => s.session_type === "pumping");
  const feedSessions7d = last7d.filter((s) => s.session_type !== "pumping");
  const pumpStats7d = computeSessionStats(pumpSessions7d);
  const feedStats7d = computeSessionStats(feedSessions7d);

  const todayPump = todaySessions.filter((s) => s.session_type === "pumping");
  const todayFeed = todaySessions.filter((s) => s.session_type !== "pumping");
  const todayPumpStats = computeSessionStats(todayPump);
  const todayFeedStats = computeSessionStats(todayFeed);

  const weekDuration = computeDurationStats(last7d);
  const weekSideVols = computeSideVolumes(last7d);
  const weekRegularity = computeSessionRegularity(last7d);
  const dailyTotals7d = computeDailyTotals(last7d);
  const dailyTotals30d = computeDailyTotals(last30d);
  const weeklyTotals2to4 = computeWeeklyTotals(weeks2to4);
  const allTimeSessions = [...olderSessions, ...last30d];
  const allTimePump = allTimeSessions.filter(
    (s) => s.session_type === "pumping",
  );
  const allTimeFeed = allTimeSessions.filter(
    (s) => s.session_type !== "pumping",
  );
  const allTimePumpStats = computeSessionStats(allTimePump);
  const allTimeFeedStats = computeSessionStats(allTimeFeed);
  // Compute monthly totals from ALL sessions so months spanning the
  // 30-day boundary aren't split, and the supply trend includes recent data
  const monthlyTotals = computeMonthlyTotals(allTimeSessions);

  // Time-of-day distribution (last 7 days)
  const timeSlots = { night: 0, morning: 0, afternoon: 0, evening: 0 };
  for (const s of last7d) {
    const h = s.timestamp.getHours();
    if (h < 6) timeSlots.night++;
    else if (h < 12) timeSlots.morning++;
    else if (h < 18) timeSlots.afternoon++;
    else timeSlots.evening++;
  }

  const u = preferredUnit;
  const fmt = (ml: number) => {
    const val = u === "oz" ? convertAmount(ml, "ml", "oz") : ml;
    return formatAmount(val, u);
  };

  // Determine date range (sessions are already normalized)
  const lastInRange = last30d.length > 0 ? last30d[last30d.length - 1] : null;
  const lastSessionTs = lastInRange?.timestamp ?? now;
  let firstSessionTs: Date;
  try {
    firstSessionTs = firstSession?.timestamp
      ? toSafeDate(firstSession.timestamp)
      : now;
  } catch {
    firstSessionTs = now;
  }

  const lines: string[] = [];

  // --- Header ---
  lines.push(`## Data Summary (${format(now, "MMM d, yyyy h:mm a")})`);
  lines.push(
    `Unit: ${u} | Total: ${totalCount} sessions | Range: ${format(firstSessionTs, "MMM d, yyyy")} - ${format(lastSessionTs, "MMM d, yyyy")}`,
  );

  // --- Today (session-level detail) ---
  lines.push("\n### Today");
  if (todaySessions.length === 0) {
    lines.push("No sessions logged today yet.");
  } else {
    const todayDuration = computeDurationStats(todaySessions);
    const todaySideVols = computeSideVolumes(todaySessions);
    if (todayPumpStats.count > 0) {
      lines.push(
        `Pumping: ${todayPumpStats.count} sessions | Total: ${fmt(todayPumpStats.total)} | Avg: ${fmt(todayPumpStats.avg)}`,
      );
    }
    if (todayFeedStats.count > 0) {
      lines.push(
        `Feeding: ${todayFeedStats.count} sessions | Total: ${fmt(todayFeedStats.total)} | Avg: ${fmt(todayFeedStats.avg)}`,
      );
    }
    if (todayDuration.count_with_duration > 0) {
      lines.push(`Duration: avg ${todayDuration.avg_min}min`);
    }
    if (
      todaySideVols.left_count +
        todaySideVols.right_count +
        todaySideVols.both_count >
      0
    ) {
      lines.push(
        `Sides: ${todaySideVols.left_count}L ${todaySideVols.right_count}R ${todaySideVols.both_count}B`,
      );
    }
    // List today's individual sessions (cap at 10 to preserve budget)
    const todaySorted = [...todaySessions].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );
    const todayToShow = todaySorted.slice(0, 10);
    for (const s of todayToShow) {
      const parts = [
        format(s.timestamp, "h:mm a"),
        fmt(s.amount_ml),
        s.session_type ?? "feeding",
      ];
      if (s.side && s.side !== "unknown") parts.push(s.side);
      if (s.duration_min) parts.push(`${s.duration_min}min`);
      if (s.notes) parts.push(`"${s.notes.slice(0, 80)}"`);
      lines.push(`- ${parts.join(" | ")}`);
    }
    if (todaySorted.length > 10) {
      lines.push(`...and ${todaySorted.length - 10} more sessions`);
    }
  }

  // --- Last 7 Days (full stats) ---
  lines.push("\n### Last 7 Days");
  const weekTotalCount = pumpStats7d.count + feedStats7d.count;
  if (weekTotalCount === 0) {
    lines.push("No sessions in the last 7 days.");
  } else {
    if (pumpStats7d.count > 0) {
      lines.push(
        `Pumping: ${pumpStats7d.count} sessions | Total: ${fmt(pumpStats7d.total)} | Daily avg: ${fmt(Math.round(pumpStats7d.total / 7))} | Per-session avg: ${fmt(pumpStats7d.avg)} | Range: ${fmt(pumpStats7d.min)}-${fmt(pumpStats7d.max)}`,
      );
    }
    if (feedStats7d.count > 0) {
      lines.push(
        `Feeding: ${feedStats7d.count} sessions | Total: ${fmt(feedStats7d.total)} | Daily avg: ${fmt(Math.round(feedStats7d.total / 7))} | Per-session avg: ${fmt(feedStats7d.avg)} | Range: ${fmt(feedStats7d.min)}-${fmt(feedStats7d.max)}`,
      );
    }
    if (pumpStats7d.count > 0 && feedStats7d.count > 0) {
      lines.push(
        `Note: Pump and feed totals may overlap when pumped milk is later bottle-fed.`,
      );
    }
    lines.push(
      `Time: ${timeSlots.morning} morn, ${timeSlots.afternoon} aftn, ${timeSlots.evening} eve, ${timeSlots.night} night`,
    );
    if (
      weekSideVols.left_count +
        weekSideVols.right_count +
        weekSideVols.both_count >
      0
    ) {
      lines.push(
        `Sides: ${weekSideVols.left_count}L ${weekSideVols.right_count}R ${weekSideVols.both_count}B`,
      );
    }
    if (weekDuration.count_with_duration > 0) {
      lines.push(
        `Duration: avg ${weekDuration.avg_min}min (range ${weekDuration.min_min}-${weekDuration.max_min}min, ${weekDuration.count_with_duration}/${weekDuration.total_count} recorded)`,
      );
    }
    if (weekRegularity.avg_gap_hours > 0) {
      lines.push(
        `Regularity: avg ${weekRegularity.avg_gap_hours}h between sessions, ~${weekRegularity.typical_sessions_per_day}/day`,
      );
    }
    if (weekSideVols.left_avg_ml > 0 || weekSideVols.right_avg_ml > 0) {
      lines.push(
        `Side volumes: L avg ${fmt(weekSideVols.left_avg_ml)}, R avg ${fmt(weekSideVols.right_avg_ml)}`,
      );
    }
  }

  // --- Daily Totals (7d) ---
  if (dailyTotals7d.length > 0) {
    lines.push("\n### Daily Totals (7d)");
    for (const d of dailyTotals7d) {
      const parts: string[] = [`${d.date}:`];
      if (d.pump_ml > 0) parts.push(`pumped ${fmt(d.pump_ml)}`);
      if (d.feed_ml > 0) parts.push(`fed ${fmt(d.feed_ml)}`);
      parts.push(`(${d.count} sessions)`);
      lines.push(parts.join(" "));
    }
  }

  // --- Weeks 2-4 ---
  if (weeklyTotals2to4.length > 0) {
    lines.push("\n### Weeks 2-4");
    for (const w of weeklyTotals2to4) {
      const parts: string[] = [`W ${w.weekStart}:`];
      if (w.pump_ml > 0) parts.push(`pumped ${fmt(w.pump_ml)}`);
      if (w.feed_ml > 0) parts.push(`fed ${fmt(w.feed_ml)}`);
      parts.push(`${w.count} sessions (${w.days_with_data}d)`);
      lines.push(parts.join(" "));
    }
  }

  // --- 30-Day Trend (pump supply) ---
  // Use pump_ml for supply trend to avoid double-counting with feeds.
  // Divide by ALL days in the range (not just days with pump data) to
  // reflect the true daily rate.
  const totalPump30d = dailyTotals30d.reduce((s, d) => s + d.pump_ml, 0);
  const daysInRange = dailyTotals30d.length;
  if (totalPump30d > 0 && daysInRange > 2) {
    const avg30d = totalPump30d / daysInRange;
    const mid = Math.floor(daysInRange / 2);
    const firstHalf = dailyTotals30d.slice(0, mid);
    const secondHalf = dailyTotals30d.slice(mid);
    const avgFirst =
      firstHalf.reduce((s, d) => s + d.pump_ml, 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((s, d) => s + d.pump_ml, 0) / secondHalf.length;
    const trend =
      avgSecond > avgFirst * 1.05
        ? "increasing"
        : avgSecond < avgFirst * 0.95
          ? "decreasing"
          : "stable";

    // Consistency: coefficient of variation across all days (including zero-pump days)
    const dailyAmounts = dailyTotals30d.map((d) => d.pump_ml);
    const mean = dailyAmounts.reduce((a, b) => a + b, 0) / dailyAmounts.length;
    const variance =
      dailyAmounts.reduce((a, v) => a + (v - mean) ** 2, 0) /
      dailyAmounts.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    const consistency = cv < 0.15 ? "high" : cv < 0.3 ? "moderate" : "variable";

    lines.push("\n### 30-Day Supply Trend (pump sessions only)");
    lines.push(
      `Daily avg pumped: ${fmt(avg30d)} | Trend: ${trend} | Consistency: ${consistency} (CV ${cv.toFixed(2)})`,
    );
  } else if (daysInRange > 2) {
    // Fallback to feed-only data if no pump sessions
    const avg30d =
      dailyTotals30d.reduce((s, d) => s + d.feed_ml, 0) / daysInRange;

    lines.push("\n### 30-Day Feed Trend");
    lines.push(`Daily avg fed: ${fmt(avg30d)}`);
  }

  // --- Monthly History (older data) ---
  if (monthlyTotals.length > 0) {
    lines.push("\n### Monthly History");
    for (const m of monthlyTotals) {
      const parts: string[] = [`${m.month}:`];
      if (m.pump_ml > 0) parts.push(`pumped ${fmt(m.pump_ml)}`);
      if (m.feed_ml > 0) parts.push(`fed ${fmt(m.feed_ml)}`);
      parts.push(`${m.count} sessions (${m.days_with_data}d logged)`);
      lines.push(parts.join(" "));
    }
  }

  // --- All-Time Stats ---
  if (allTimeSessions.length > 0) {
    const totalDaysLogged = monthlyTotals.reduce(
      (sum, m) => sum + m.days_with_data,
      0,
    );
    lines.push("\n### All-Time Stats");
    if (allTimePumpStats.count > 0) {
      lines.push(
        `Total pumped: ${fmt(allTimePumpStats.total)} (${allTimePumpStats.count} sessions)`,
      );
    }
    if (allTimeFeedStats.count > 0) {
      lines.push(
        `Total fed: ${fmt(allTimeFeedStats.total)} (${allTimeFeedStats.count} sessions)`,
      );
    }
    lines.push(`Days logged: ${totalDaysLogged}`);
    if (totalDaysLogged > 1) {
      if (allTimePumpStats.count > 0) {
        lines.push(
          `Daily avg pumped: ${fmt(Math.round(allTimePumpStats.total / totalDaysLogged))}`,
        );
      }
      if (allTimeFeedStats.count > 0) {
        lines.push(
          `Daily avg fed: ${fmt(Math.round(allTimeFeedStats.total / totalDaysLogged))}`,
        );
      }

      // Supply trend: compare first month vs last month (pump only)
      if (monthlyTotals.length >= 2) {
        const firstMonth = monthlyTotals[0];
        const lastMonth = monthlyTotals[monthlyTotals.length - 1];
        if (
          firstMonth.pump_ml > 0 &&
          lastMonth.pump_ml > 0 &&
          firstMonth.days_with_data > 0 &&
          lastMonth.days_with_data > 0
        ) {
          const firstAvgDaily = firstMonth.pump_ml / firstMonth.days_with_data;
          const lastAvgDaily = lastMonth.pump_ml / lastMonth.days_with_data;
          const changePct =
            ((lastAvgDaily - firstAvgDaily) / firstAvgDaily) * 100;
          lines.push(
            `Pump supply trend since start: ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`,
          );
        }
      }
    }
  }

  // --- Build thread summaries ---
  const threadSummaries = buildThreadSummariesFromData(recentThreads);

  return {
    data_summary: lines.join("\n").slice(0, MAX_SUMMARY_CHARS),
    session_count: totalCount,
    thread_summaries: threadSummaries || undefined,
  };
}

// --- Thread summaries ---

async function buildThreadSummaries(): Promise<string | null> {
  try {
    const threads = await db.chat_threads
      .orderBy("created_at")
      .reverse()
      .limit(10)
      .toArray();
    return buildThreadSummariesFromData(threads);
  } catch {
    return null;
  }
}

function buildThreadSummariesFromData(
  threads: Array<{ title: string; created_at: Date }>,
): string | null {
  if (!threads || threads.length === 0) return null;

  // Filter out threads with default/placeholder titles
  const meaningful = threads.filter(
    (t) => t.title && t.title !== "New conversation",
  );

  const lines: string[] = [];
  for (const t of meaningful.slice(0, 5)) {
    try {
      const date = format(toSafeDate(t.created_at), "MMM d");
      lines.push(`- "${t.title}" (${date})`);
    } catch {
      // Skip threads with bad dates
    }
  }

  if (lines.length === 0) return null;
  return lines.join("\n").slice(0, MAX_THREAD_SUMMARIES_CHARS);
}
