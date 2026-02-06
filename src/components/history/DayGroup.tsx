import type { ReactNode } from "react";
import { format } from "date-fns";
import { formatAmount } from "@/lib/units";
import { useAppStore } from "@/stores/useAppStore";
import { mlToOz } from "@/lib/units";

interface DayGroupProps {
  date: Date;
  totalMl: number;
  feedTotalMl?: number;
  pumpTotalMl?: number;
  children: ReactNode;
}

export default function DayGroup({
  date,
  totalMl,
  feedTotalMl,
  pumpTotalMl,
  children,
}: DayGroupProps) {
  const { preferredUnit } = useAppStore();
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
            {format(date, "EEE, MMM d")}
          </h3>
          <span className="h-1 w-1 rounded-full bg-plum/20" />
          <span className="text-sm font-semibold text-rose-primary">
            {formatAmount(displayTotal, preferredUnit)}
          </span>
          <div className="flex-1 border-b border-plum/[0.06]" />
        </div>
        {hasTypedData && (
          <div className="flex items-center gap-2 pl-0.5">
            {feedTotalMl! > 0 && (
              <span className="text-[10px] font-semibold text-rose-dark/70">
                Feed:{" "}
                {formatAmount(
                  preferredUnit === "oz"
                    ? mlToOz(feedTotalMl!)
                    : Math.round(feedTotalMl!),
                  preferredUnit,
                )}
              </span>
            )}
            {feedTotalMl! > 0 && pumpTotalMl! > 0 && (
              <span className="text-[10px] text-plum/20">|</span>
            )}
            {pumpTotalMl! > 0 && (
              <span className="text-[10px] font-semibold text-sage-dark/70">
                Pump:{" "}
                {formatAmount(
                  preferredUnit === "oz"
                    ? mlToOz(pumpTotalMl!)
                    : Math.round(pumpTotalMl!),
                  preferredUnit,
                )}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
