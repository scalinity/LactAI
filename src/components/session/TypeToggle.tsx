import { cn } from "@/lib/utils";
import type { SessionType } from "@/types/common";

interface TypeToggleProps {
  value: SessionType;
  onChange: (value: SessionType) => void;
  className?: string;
}

const types: { label: string; value: SessionType }[] = [
  { label: "Feeding", value: "feeding" },
  { label: "Pumping", value: "pumping" },
];

export default function TypeToggle({
  value,
  onChange,
  className,
}: TypeToggleProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      {types.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border",
            value === t.value
              ? "border-rose-primary bg-rose-primary/10 text-rose-primary shadow-sm"
              : "border-plum/[0.06] bg-white text-plum/50 hover:border-plum/10 hover:text-plum/70 active:scale-[0.98]",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
