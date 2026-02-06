import { cn } from "@/lib/utils";
import { RANGE_PRESETS } from "@/lib/constants";
import type { RangePreset } from "@/types/common";

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
  return (
    <div className={cn("flex gap-1 rounded-xl bg-plum/5 p-1", className)}>
      {RANGE_PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          onClick={() => onChange(preset.value)}
          className={cn(
            "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
            preset.value === value
              ? "bg-rose-primary text-white shadow-sm"
              : "text-plum/60 hover:text-plum",
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
