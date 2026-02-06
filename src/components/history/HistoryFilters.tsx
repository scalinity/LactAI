import type { SessionFilter } from "@/types/session";
import type { Side, SessionType } from "@/types/common";
import Button from "@/components/ui/Button";
import { X } from "lucide-react";

interface HistoryFiltersProps {
  filter: SessionFilter;
  onChange: (filter: SessionFilter) => void;
}

function toDateInputValue(date?: Date): string {
  if (!date) return "";
  return date.toISOString().split("T")[0];
}

export default function HistoryFilters({
  filter,
  onChange,
}: HistoryFiltersProps) {
  const hasFilters = filter.startDate || filter.endDate || filter.side || filter.session_type;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-plum/50">From</label>
        <input
          type="date"
          value={toDateInputValue(filter.startDate)}
          onChange={(e) =>
            onChange({
              ...filter,
              startDate: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          className="rounded-lg border border-plum/10 bg-cream px-2 py-1.5 text-xs text-plum outline-none focus:ring-2 focus:ring-rose-primary/50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-plum/50">To</label>
        <input
          type="date"
          value={toDateInputValue(filter.endDate)}
          onChange={(e) =>
            onChange({
              ...filter,
              endDate: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          className="rounded-lg border border-plum/10 bg-cream px-2 py-1.5 text-xs text-plum outline-none focus:ring-2 focus:ring-rose-primary/50"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-plum/50">Type</label>
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
          <option value="">All</option>
          <option value="feeding">Feeding</option>
          <option value="pumping">Pumping</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-plum/50">Side</label>
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
          <option value="">All</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="both">Both</option>
        </select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
