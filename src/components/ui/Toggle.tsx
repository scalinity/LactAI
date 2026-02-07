import { cn } from "@/lib/utils";

interface ToggleOption<T extends string> {
  label: string;
  value: T;
}

interface ToggleProps<T extends string> {
  options: ToggleOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export default function Toggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: ToggleProps<T>) {
  return (
    <div className={cn("inline-flex rounded-xl bg-plum/[0.04] p-1", className)} role="group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={opt.value === value}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-semibold transition-all",
            opt.value === value
              ? "bg-rose-primary text-white shadow-sm"
              : "text-plum/50 hover:text-plum/70",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
