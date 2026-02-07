import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { SessionType } from "@/types/common";

interface TypeToggleProps {
  value: SessionType;
  onChange: (value: SessionType) => void;
  className?: string;
}

export default function TypeToggle({
  value,
  onChange,
  className,
}: TypeToggleProps) {
  const { t } = useTranslation();

  const types: { label: string; value: SessionType }[] = [
    { label: t("session.feeding"), value: "feeding" },
    { label: t("session.pumping"), value: "pumping" },
  ];

  return (
    <div className={cn("flex gap-2", className)}>
      {types.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={cn(
            "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border",
            value === type.value
              ? "border-rose-primary bg-rose-primary/10 text-rose-primary shadow-sm"
              : "border-plum/[0.06] bg-surface text-plum/50 hover:border-plum/10 hover:text-plum/70 active:scale-[0.98]",
          )}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
