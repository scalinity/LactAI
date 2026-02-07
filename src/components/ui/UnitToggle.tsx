import React from 'react';
import type { Unit } from '@/types/common';

interface UnitToggleProps {
  value: Unit;
  onChange: (unit: Unit) => void;
  className?: string;
}

export const UnitToggle: React.FC<UnitToggleProps> = ({ value, onChange, className = '' }) => {
  return (
    <div className={`flex items-center rounded-xl bg-plum/[0.04] p-1 ${className}`} role="group" aria-label="Unit selection">
      <button
        onClick={() => onChange("ml")}
        aria-pressed={value === "ml"}
        className={`rounded-lg px-3 py-1 text-sm font-semibold transition-all ${
          value === "ml"
            ? "bg-rose-primary text-white shadow-sm"
            : "text-plum/40 hover:text-plum/60"
        }`}
      >
        ml
      </button>
      <button
        onClick={() => onChange("oz")}
        aria-pressed={value === "oz"}
        className={`rounded-lg px-3 py-1 text-sm font-semibold transition-all ${
          value === "oz"
            ? "bg-rose-primary text-white shadow-sm"
            : "text-plum/40 hover:text-plum/60"
        }`}
      >
        oz
      </button>
    </div>
  );
};
