import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import Card from "@/components/ui/Card";
import { useAIInsights, MIN_SESSIONS } from "@/hooks/useAIInsights";
import { useTranslation, type TranslationKey } from "@/i18n";
import type { RangePreset } from "@/types/common";
import type { Session } from "@/types/session";
import type { InsightTrend } from "@/lib/api";

interface AIInsightsCardProps {
  period: RangePreset;
  sessions: Session[] | undefined;
}

function TrendIcon({ direction }: { direction: InsightTrend["direction"] }) {
  switch (direction) {
    case "increasing":
      return <TrendingUp className="h-4 w-4 text-sage" />;
    case "decreasing":
      return <TrendingDown className="h-4 w-4 text-amber-500" />;
    case "variable":
      return <Activity className="h-4 w-4 text-rose-primary" />;
    default:
      return <Minus className="h-4 w-4 text-plum/40" />;
  }
}

function Skeleton() {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-5 w-5 animate-pulse rounded bg-plum/10" />
        <div className="h-4 w-32 animate-pulse rounded bg-plum/10" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full animate-pulse rounded bg-plum/10" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-plum/10" />
        <div className="mt-4 h-3 w-2/3 animate-pulse rounded bg-plum/10" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-plum/10" />
        <div className="mt-4 h-3 w-1/2 animate-pulse rounded bg-plum/10" />
      </div>
    </Card>
  );
}

export default function AIInsightsCard({
  period,
  sessions,
}: AIInsightsCardProps) {
  const { t } = useTranslation();
  const { insights, loading, error, refetch } = useAIInsights(period, sessions);

  // Not enough data
  if (!sessions || sessions.length < MIN_SESSIONS) {
    return null;
  }

  // Loading (no cached data to show)
  if (loading && !insights) {
    return <Skeleton />;
  }

  // Error (no cached data to show)
  if (error && !insights) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-plum/60">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{t(error as TranslationKey)}</span>
          <button
            onClick={refetch}
            className="ml-auto shrink-0 rounded-lg bg-plum/10 px-3 py-1 text-xs font-medium text-plum transition-colors hover:bg-plum/20"
          >
            {t("insights.retry")}
          </button>
        </div>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-rose-primary" />
        <h3 className="font-[Nunito] text-sm font-bold text-plum">
          {t("insights.title")}
        </h3>
        <button
          onClick={refetch}
          disabled={loading}
          className="ml-auto rounded-full p-1 text-plum/40 transition-colors hover:bg-plum/10 hover:text-plum disabled:opacity-50"
          aria-label={t("insights.refresh")}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Summary */}
      {insights.summary && (
        <p className="mb-4 text-sm leading-relaxed text-plum/80">
          {insights.summary}
        </p>
      )}

      {/* Trends */}
      {insights.trends.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-plum/40">
            {t("insights.trends")}
          </p>
          {insights.trends.map((trend, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0">
                <TrendIcon direction={trend.direction} />
              </span>
              <span className="text-plum/80">{trend.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Patterns */}
      {insights.patterns.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-plum/40">
            {t("insights.patterns")}
          </p>
          {insights.patterns.map((pattern, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0">
                <Activity className="h-4 w-4 text-plum/30" />
              </span>
              <span className="text-plum/80">{pattern.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      {insights.tips.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-plum/40">
            {t("insights.tips")}
          </p>
          {insights.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0">
                <Lightbulb className="h-4 w-4 text-amber-400" />
              </span>
              <div>
                <span className="text-plum/80">{tip.tip}</span>
                {tip.rationale && (
                  <p className="mt-0.5 text-xs text-plum/50">{tip.rationale}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
