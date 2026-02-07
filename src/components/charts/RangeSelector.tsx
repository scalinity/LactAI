import { cn } from "@/lib/utils";
import { RANGE_PRESETS } from "@/lib/constants";
import type { RangePreset } from "@/types/common";
import { useTranslation } from "@/i18n";

interface RangeSelectorProps {
  value: RangePreset;
  onChange: (value: RangePreset) => void;
  className?: string;
}

export default function RangeSelector({
  value,
  onChange,
  className,
}: RangeSelectorProps) {
  const { t } = useTranslation();
  return (
    <div
      className={cn("inline-flex gap-1 rounded-xl bg-plum/5 p-1", className)}
    >
      {RANGE_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onChange(preset.value)}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
            preset.value === value
              ? "bg-rose-primary text-white shadow-sm"
              : "text-plum/60 hover:text-plum",
          )}
        >
          {preset.label === "All" ? t("trends.allRange") : preset.label}
        </button>
      ))}
    </div>
  );
}
