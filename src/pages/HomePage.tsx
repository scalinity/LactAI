import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useTodaySessions } from "@/db/hooks";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useAppStore } from "@/stores/useAppStore";
import { formatAmount, convertAmount } from "@/lib/units";
import TrendSummaryCard from "@/components/ai-cards/TrendSummaryCard";
import PatternFinderCard from "@/components/ai-cards/PatternFinderCard";
import DataCleanupCard from "@/components/ai-cards/DataCleanupCard";
import {
  Plus,
  Camera,
  TrendingUp,
  MessageCircle,
  List,
  Download,
} from "lucide-react";
import { useBackupReminder } from "@/hooks/useBackupReminder";
import { useTranslation } from "@/i18n";

export default function HomePage() {
  const todaySessions = useTodaySessions();
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
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
        <DataCleanupCard />
      </div>

      {/* Install Banner */}
      {!isInstalled && canInstall && (
        <div className="animate-card-enter overflow-hidden rounded-2xl bg-surface shadow-sm">
          <div
            className="h-1 w-full"
            style={{
              background:
                "linear-gradient(90deg, var(--color-rose-primary) 0%, var(--color-sage) 50%, var(--color-rose-primary) 100%)",
            }}
          />
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-primary/10">
              <Download className="h-5 w-5 text-rose-primary" />
            </div>
            <div className="flex-1">
              <p className="font-[Nunito] font-bold text-plum">
                {t("home.installClaudiaFlow")}
              </p>
              <p className="mt-0.5 text-xs text-plum-light/70">
                {t("home.installDescription")}
              </p>
            </div>
            <button
              onClick={promptInstall}
              className="rounded-xl bg-rose-primary px-4 py-2 text-sm font-bold text-white transition-all hover:bg-rose-dark active:scale-95"
            >
              {t("common.install")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
