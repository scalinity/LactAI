import { cn } from "@/lib/utils";
import type { Side } from "@/types/common";

interface SideSelectorProps {
  value: Side | null;
  onChange: (value: Side | null) => void;
  className?: string;
}

const sides: { label: string; value: Side }[] = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
  { label: "Both", value: "both" },
];

export default function SideSelector({
  value,
  onChange,
  className,
}: SideSelectorProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {sides.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onChange(value === s.value ? null : s.value)}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border",
            value === s.value
              ? "border-rose-primary bg-rose-primary/10 text-rose-primary shadow-sm"
              : "border-plum/[0.06] bg-white text-plum/50 hover:border-plum/10 hover:text-plum/70 active:scale-[0.98]",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
