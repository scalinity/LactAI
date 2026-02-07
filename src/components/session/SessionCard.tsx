import { memo } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@/types/session";
import { formatAmount, convertAmount } from "@/lib/units";
import { formatRelativeTime } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useTranslation } from "@/i18n";
import Badge from "@/components/ui/Badge";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_STYLES = {
  feeding: {
    gradient:
      "linear-gradient(180deg, var(--color-rose-primary) 0%, var(--color-rose-light) 100%)",
  },
  pumping: {
    gradient:
      "linear-gradient(180deg, var(--color-sage) 0%, var(--color-sage-dark) 100%)",
  },
} as const;

interface SessionCardProps {
  session: Session;
  onDelete?: (id: number) => void;
  className?: string;
}

export default memo(function SessionCard({
  session,
  onDelete,
  className,
}: SessionCardProps) {
  const navigate = useNavigate();
  const preferredUnit = useAppStore((s) => s.preferredUnit);
  const { t } = useTranslation();
  const style = session.session_type
    ? TYPE_STYLES[session.session_type]
    : TYPE_STYLES.feeding;
  const hasLRBreakdown =
    session.session_type === "pumping" &&
    session.amount_left_ml != null &&
    session.amount_right_ml != null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => session.id && navigate(`/log/${session.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          session.id && navigate(`/log/${session.id}`);
        }
      }}
      className={cn(
        "group relative flex items-center justify-between overflow-hidden rounded-2xl bg-surface border border-plum/[0.04] px-4 py-3 shadow-sm transition-all hover:shadow-md hover:border-plum/[0.08] active:scale-[0.99] cursor-pointer",
        className,
      )}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: style.gradient }}
      />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-plum font-[Nunito]">
            {formatAmount(session.amount_entered, session.unit_entered)}
          </span>
          <div className="flex items-center gap-1.5">
            {session.session_type && (
              <Badge
                variant={
                  session.session_type === "pumping" ? "success" : "rose"
                }
              >
                {session.session_type === "pumping"
                  ? t("session.pump")
                  : t("session.feed")}
              </Badge>
            )}
            {session.side &&
              session.side !== "unknown" &&
              !(session.side === "both" && hasLRBreakdown) && (
                <Badge>{session.side}</Badge>
              )}
            {session.source !== "manual" && session.source !== "imported" && (
              <Badge variant="warning">{session.source}</Badge>
            )}
          </div>
        </div>
        {hasLRBreakdown && (
          <div className="flex items-center gap-2 pl-0.5 mt-0.5">
            <span className="inline-flex items-center gap-1 text-xs text-sage-dark font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-dark/60" />
              L{" "}
              {formatAmount(
                convertAmount(session.amount_left_ml!, "ml", preferredUnit),
                preferredUnit,
              )}
            </span>
            <span className="text-plum/20">|</span>
            <span className="inline-flex items-center gap-1 text-xs text-sage-dark font-medium">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-dark/60" />
              R{" "}
              {formatAmount(
                convertAmount(session.amount_right_ml!, "ml", preferredUnit),
                preferredUnit,
              )}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-plum/35 font-medium">
          {formatRelativeTime(session.timestamp)}
        </span>
        {onDelete && session.id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.id!);
            }}
            className="rounded-lg p-1.5 text-plum/20 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});
