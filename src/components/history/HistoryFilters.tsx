import type { SessionFilter } from "@/types/session";
import type { Side, SessionType } from "@/types/common";
import { useTranslation } from "@/i18n";
import Button from "@/components/ui/Button";
import { X } from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";

interface HistoryFiltersProps {
  filter: SessionFilter;
  onChange: (filter: SessionFilter) => void;
}

function toDateInputValue(date?: Date): string {
  if (!date) return "";
  // Format as YYYY-MM-DD in local timezone
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateInput(value: string): Date | undefined {
  if (!value) return undefined;
  // Parse YYYY-MM-DD in local timezone (avoid UTC shift)
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function HistoryFilters({
  filter,
  onChange,
}: HistoryFiltersProps) {
  const { t } = useTranslation();
  const hasFilters =
    filter.startDate || filter.endDate || filter.side || filter.session_type;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-plum/50">{t("history.from")}</label>
        <input
          type="date"
          value={toDateInputValue(filter.startDate)}
          onChange={(e) =>
            onChange({
              ...filter,
              startDate: parseDateInput(e.target.value)
                ? startOfDay(parseDateInput(e.target.value)!)
                : undefined,
            })
          }
          className="rounded-lg border border-plum/10 bg-cream px-2 py-1.5 text-xs text-plum outline-none focus:ring-2 focus:ring-rose-primary/50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-plum/50">{t("history.to")}</label>
        <input
          type="date"
          value={toDateInputValue(filter.endDate)}
          onChange={(e) =>
            onChange({
              ...filter,
              endDate: parseDateInput(e.target.value)
                ? endOfDay(parseDateInput(e.target.value)!)
                : undefined,
            })
          }
          className="rounded-lg border border-plum/10 bg-cream px-2 py-1.5 text-xs text-plum outline-none focus:ring-2 focus:ring-rose-primary/50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-plum/50">{t("history.type")}</label>
        <select
          value={filter.session_type || ""}
          onChange={(e) =>
            onChange({
              ...filter,
              session_type: (e.target.value as SessionType) || undefined,
            })
          }
          className="rounded-lg border border-plum/10 bg-cream px-2 py-1.5 text-xs text-plum outline-none focus:ring-2 focus:ring-rose-primary/50"
        >
          <option value="">{t("history.all")}</option>
          <option value="feeding">{t("history.feeding")}</option>
          <option value="pumping">{t("history.pumping")}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-plum/50">{t("history.side")}</label>
        <select
          value={filter.side || ""}
          onChange={(e) =>
            onChange({
              ...filter,
              side: (e.target.value as Side) || undefined,
            })
          }
          className="rounded-lg border border-plum/10 bg-cream px-2 py-1.5 text-xs text-plum outline-none focus:ring-2 focus:ring-rose-primary/50"
        >
          <option value="">{t("history.all")}</option>
          <option value="left">{t("history.left")}</option>
          <option value="right">{t("history.right")}</option>
          <option value="both">{t("history.both")}</option>
        </select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <X className="h-3.5 w-3.5" />
          {t("common.clear")}
        </Button>
      )}
    </div>
  );
}
