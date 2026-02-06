import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Unit } from "@/types/common";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  unit: Unit;
  className?: string;
}

export default function AmountInput({
  value,
  onChange,
  unit,
  className,
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="flex items-baseline gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent text-center text-5xl font-extrabold text-plum outline-none placeholder:text-plum/15 font-[Nunito]"
        />
        <span className="text-lg font-semibold text-plum/40">{unit}</span>
      </div>
      <div
        className="mt-1 h-[2px] w-24 rounded-full"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #e8a0bf 50%, transparent 100%)",
        }}
      />
    </div>
  );
}
