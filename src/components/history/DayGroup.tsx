import { memo, type ReactNode } from "react";
import { formatAmount } from "@/lib/units";
import { formatDayHeader } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useTranslation } from "@/i18n";
import { mlToOz } from "@/lib/units";

interface DayGroupProps {
  date: Date;
  totalMl: number;
  feedTotalMl?: number;
  pumpTotalMl?: number;
  children: ReactNode;
}

export default memo(function DayGroup({
  date,
  totalMl,
  feedTotalMl,
  pumpTotalMl,
  children,
}: DayGroupProps) {
  const { preferredUnit } = useAppStore();
  const { t } = useTranslation();
  const displayTotal =
    preferredUnit === "oz" ? mlToOz(totalMl) : Math.round(totalMl);
  const hasTypedData =
    feedTotalMl != null &&
    pumpTotalMl != null &&
    (feedTotalMl > 0 || pumpTotalMl > 0);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-0.5 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-plum/70">
            {formatDayHeader(date)}
          </h3>
          {hasTypedData && (
            <>
              <span className="h-1 w-1 rounded-full bg-plum/20" />
              {feedTotalMl! > 0 && (
                <span className="text-xs font-semibold text-rose-dark/70">
                  {t("history.feedLabel")}{" "}
                  {formatAmount(
                    preferredUnit === "oz"
                      ? mlToOz(feedTotalMl!)
                      : Math.round(feedTotalMl!),
                    preferredUnit,
                  )}
                </span>
              )}
              {feedTotalMl! > 0 && pumpTotalMl! > 0 && (
                <span className="text-xs text-plum/20">|</span>
              )}
              {pumpTotalMl! > 0 && (
                <span className="text-xs font-semibold text-sage-dark/70">
                  {t("history.pumpLabel")}{" "}
                  {formatAmount(
                    preferredUnit === "oz"
                      ? mlToOz(pumpTotalMl!)
                      : Math.round(pumpTotalMl!),
                    preferredUnit,
                  )}
                </span>
              )}
            </>
          )}
          {!hasTypedData && (
            <>
              <span className="h-1 w-1 rounded-full bg-plum/20" />
              <span className="text-xs font-semibold text-rose-primary">
                {formatAmount(displayTotal, preferredUnit)}
              </span>
            </>
          )}
          <div className="flex-1 border-b border-plum/[0.06]" />
        </div>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
});
