import { Link } from "react-router-dom";
import { useMemo, useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { useTodaySessions } from "@/db/hooks";
import { useAppStore } from "@/stores/useAppStore";
import { formatAmount, convertAmount } from "@/lib/units";
import TrendSummaryCard from "@/components/ai-cards/TrendSummaryCard";
import PatternFinderCard from "@/components/ai-cards/PatternFinderCard";
import WeeklySummaryCard from "@/components/ai-cards/WeeklySummaryCard";
import { useSessions } from "@/db/hooks";
import { subDays } from "date-fns";
import {
  Plus,
  Camera,
  TrendingUp,
  TrendingDown,
  Minus,
  MessageCircle,
  List,
  Clock,
  Activity,
} from "lucide-react";
import { useBackupReminder } from "@/hooks/useBackupReminder";
import { useTranslation } from "@/i18n";
import DailyGoalRing from "@/components/home/DailyGoalRing";

function formatTimeSince(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function TimeSinceLastPump() {
  const { t } = useTranslation();
  const lastPump = useLiveQuery(() =>
    db.sessions
      .where("session_type")
      .equals("pumping")
      .reverse()
      .sortBy("timestamp")
      .then((sessions) => (sessions.length > 0 ? sessions[0] : null)),
  );

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!lastPump) return null;

  const elapsed = now - lastPump.timestamp.getTime();
  if (elapsed < 0) return null;

  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl bg-sage/10 px-3 py-2">
      <Clock className="h-4 w-4 text-sage-dark shrink-0" />
      <p className="text-sm text-plum">
        <span className="font-medium text-plum/70">
          {t("timer.sinceLastPump")}
        </span>{" "}
        <span className="font-bold">{formatTimeSince(elapsed)}</span>
      </p>
    </div>
  );
}

function SupplyTrend() {
  const { t } = useTranslation();
  const { preferredUnit } = useAppStore();

  const [twoWeeksAgo, weekAgo] = useMemo(
    () => [subDays(new Date(), 14), subDays(new Date(), 7)],
    [],
  );
  const pumpSessions = useSessions({
    startDate: twoWeeksAgo,
    session_type: "pumping",
  });

  if (!pumpSessions || pumpSessions.length < 3) return null;

  const thisWeek = pumpSessions.filter((s) => s.timestamp >= weekAgo);
  const lastWeek = pumpSessions.filter(
    (s) => s.timestamp < weekAgo && s.timestamp >= twoWeeksAgo,
  );

  const thisWeekMl = thisWeek.reduce((sum, s) => sum + s.amount_ml, 0);
  const lastWeekMl = lastWeek.reduce((sum, s) => sum + s.amount_ml, 0);

  // Count unique days with data
  const thisWeekDays = new Set(thisWeek.map((s) => s.timestamp.toDateString()))
    .size;
  const lastWeekDays = new Set(lastWeek.map((s) => s.timestamp.toDateString()))
    .size;

  if (thisWeekDays === 0) return null;

  const dailyAvgMl = thisWeekMl / thisWeekDays;
  const lastDailyAvgMl = lastWeekDays > 0 ? lastWeekMl / lastWeekDays : 0;

  const diff =
    lastDailyAvgMl > 0
      ? ((dailyAvgMl - lastDailyAvgMl) / lastDailyAvgMl) * 100
      : 0;

  const TrendIcon = diff > 3 ? TrendingUp : diff < -3 ? TrendingDown : Minus;
  const trendColor =
    diff > 3 ? "text-sage-dark" : diff < -3 ? "text-amber-500" : "text-plum/40";
  const dailyAvgDisplay = convertAmount(dailyAvgMl, "ml", preferredUnit);

  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Activity className={`h-4 w-4 ${trendColor} shrink-0`} />
        <div>
          <p className="text-xs font-medium text-plum/60">
            {t("home.pumpSupply")}
          </p>
          <p className="text-sm font-bold text-plum">
            {formatAmount(dailyAvgDisplay, preferredUnit)}
            <span className="font-medium text-plum/50">{t("home.perDay")}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <TrendIcon className={`h-4 w-4 ${trendColor}`} />
        <span className={`text-xs font-semibold ${trendColor}`}>
          {lastDailyAvgMl === 0
            ? "--"
            : Math.abs(diff) < 3
              ? t("home.noChange")
              : `${diff > 0 ? "+" : ""}${diff.toFixed(0)}%`}
        </span>
      </div>
    </div>
  );
}

export default function HomePage() {
  const todaySessions = useTodaySessions();
  const preferredUnit = useAppStore((s) => s.preferredUnit);
  const { t } = useTranslation();

  const isLoading = todaySessions === undefined;

  const {
    totalMl,
    sessionCount,
    feedSessions,
    pumpSessions,
    hasTypedData,
    feedTotalMl,
    pumpTotalMl,
  } = useMemo(() => {
    const all = todaySessions ?? [];
    const feed = all.filter((s) => s.session_type === "feeding");
    const pump = all.filter((s) => s.session_type === "pumping");
    return {
      totalMl: all.reduce((sum, s) => sum + s.amount_ml, 0),
      sessionCount: all.length,
      feedSessions: feed,
      pumpSessions: pump,
      hasTypedData: feed.length > 0 || pump.length > 0,
      feedTotalMl: feed.reduce((sum, s) => sum + s.amount_ml, 0),
      pumpTotalMl: pump.reduce((sum, s) => sum + s.amount_ml, 0),
    };
  }, [todaySessions]);

  const feedDisplay = convertAmount(feedTotalMl, "ml", preferredUnit);
  const pumpDisplay = convertAmount(pumpTotalMl, "ml", preferredUnit);
  const displayAmount = convertAmount(totalMl, "ml", preferredUnit);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("home.greetingMorning");
    if (hour < 17) return t("home.greetingAfternoon");
    return t("home.greetingEvening");
  })();

  useBackupReminder();

  return (
    <div className="animate-page-enter mx-auto max-w-lg px-4 pt-6 pb-8">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="font-[Nunito] text-2xl font-bold text-plum">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-plum-light/80">
          {t("home.welcomeBack")}
        </p>
      </div>

      {/* Time since last pump */}
      <TimeSinceLastPump />

      {/* Pump supply trend */}
      <SupplyTrend />

      {/* Daily Goal Progress */}
      <DailyGoalRing
        sessionCount={sessionCount}
        totalMl={totalMl}
        isLoading={isLoading}
      />

      {/* Quick Stats */}
      {hasTypedData ? (
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-surface p-4 shadow-sm">
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-rose-primary) 0%, var(--color-rose-dark) 100%)",
              }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-plum-light/60">
              {t("home.feedings")}
            </p>
            <p className="mt-1.5 font-[Nunito] text-2xl font-extrabold text-plum">
              {isLoading ? (
                <span className="inline-block h-7 w-16 animate-pulse rounded-lg bg-plum/5" />
              ) : (
                formatAmount(feedDisplay, preferredUnit)
              )}
            </p>
            <p className="text-[10px] text-plum-light/50 mt-0.5">
              {t("common.session", { count: feedSessions.length })}
            </p>
          </div>
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-surface p-4 shadow-sm">
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-sage) 0%, var(--color-sage-dark) 100%)",
              }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-plum-light/60">
              {t("home.pumping")}
            </p>
            <p className="mt-1.5 font-[Nunito] text-2xl font-extrabold text-plum">
              {isLoading ? (
                <span className="inline-block h-7 w-16 animate-pulse rounded-lg bg-plum/5" />
              ) : (
                formatAmount(pumpDisplay, preferredUnit)
              )}
            </p>
            <p className="text-[10px] text-plum-light/50 mt-0.5">
              {t("common.session", { count: pumpSessions.length })}
            </p>
          </div>
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-surface p-4 shadow-sm">
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-plum-light) 0%, var(--color-plum) 100%)",
              }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-plum-light/60">
              {t("home.total")}
            </p>
            <p className="mt-1.5 font-[Nunito] text-2xl font-extrabold text-plum">
              {isLoading ? (
                <span className="inline-block h-7 w-16 animate-pulse rounded-lg bg-plum/5" />
              ) : (
                formatAmount(displayAmount, preferredUnit)
              )}
            </p>
            <p className="text-[10px] text-plum-light/50 mt-0.5">
              {t("common.session", { count: sessionCount })}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-surface p-4 shadow-sm">
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-rose-primary) 0%, var(--color-rose-dark) 100%)",
              }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-plum-light/60">
              {t("home.todaysTotal")}
            </p>
            <p className="mt-1.5 font-[Nunito] text-3xl font-extrabold text-plum">
              {isLoading ? (
                <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-plum/5" />
              ) : (
                formatAmount(displayAmount, preferredUnit)
              )}
            </p>
          </div>
          <div className="relative flex-1 overflow-hidden rounded-2xl bg-surface p-4 shadow-sm">
            <div
              className="absolute inset-x-0 top-0 h-1"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-sage) 0%, var(--color-sage-dark) 100%)",
              }}
            />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-plum-light/60">
              {t("home.sessionsToday")}
            </p>
            <p className="mt-1.5 font-[Nunito] text-3xl font-extrabold text-plum">
              {isLoading ? (
                <span className="inline-block h-8 w-10 animate-pulse rounded-lg bg-plum/5" />
              ) : (
                sessionCount
              )}
            </p>
          </div>
        </div>
      )}

      {/* Primary CTA */}
      <Link
        to="/log"
        className="animate-gentle-pulse mb-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-rose-primary px-6 py-4 font-[Nunito] text-lg font-bold text-white shadow-lg transition-all active:scale-[0.97]"
        style={{
          background:
            "linear-gradient(135deg, var(--color-rose-primary) 0%, var(--color-rose-dark) 100%)",
        }}
      >
        <Plus className="h-6 w-6" strokeWidth={2.5} />
        {t("home.logSession")}
      </Link>

      {/* Secondary CTAs 2x2 Grid */}
      <div className="stagger-children mb-8 grid grid-cols-2 gap-3">
        <Link
          to="/photos"
          className="hover-lift flex flex-col items-center gap-2.5 rounded-2xl bg-surface p-5 shadow-sm transition-colors"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-primary/10">
            <Camera className="h-5 w-5 text-rose-primary" />
          </div>
          <span className="text-sm font-semibold text-plum">
            {t("home.importPhotos")}
          </span>
        </Link>
        <Link
          to="/trends"
          className="hover-lift flex flex-col items-center gap-2.5 rounded-2xl bg-surface p-5 shadow-sm transition-colors"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sage/15">
            <TrendingUp className="h-5 w-5 text-sage-dark" />
          </div>
          <span className="text-sm font-semibold text-plum">
            {t("home.viewTrends")}
          </span>
        </Link>
        <Link
          to="/chat"
          className="hover-lift flex flex-col items-center gap-2.5 rounded-2xl bg-surface p-5 shadow-sm transition-colors"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-dark/10">
            <MessageCircle className="h-5 w-5 text-rose-dark" />
          </div>
          <span className="text-sm font-semibold text-plum">
            {t("home.askClaudiaFlow")}
          </span>
        </Link>
        <Link
          to="/history"
          className="hover-lift flex flex-col items-center gap-2.5 rounded-2xl bg-surface p-5 shadow-sm transition-colors"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-plum/[0.06]">
            <List className="h-5 w-5 text-plum-light" />
          </div>
          <span className="text-sm font-semibold text-plum">
            {t("home.history")}
          </span>
        </Link>
      </div>

      {/* AI Assist Cards */}
      <div className="stagger-children mb-8 space-y-4">
        <h2 className="font-[Nunito] text-lg font-bold text-plum">
          {t("home.aiInsights")}
        </h2>
        <TrendSummaryCard />
        <PatternFinderCard />
        <WeeklySummaryCard />
      </div>
    </div>
  );
}
