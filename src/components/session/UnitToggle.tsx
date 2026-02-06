import Toggle from "@/components/ui/Toggle";
import { useAppStore } from "@/stores/useAppStore";
import { convertAmount } from "@/lib/units";
import type { Unit } from "@/types/common";

interface UnitToggleProps {
  currentAmount?: string;
  className?: string;
}

const unitOptions = [
  { label: "ml", value: "ml" as Unit },
  { label: "oz", value: "oz" as Unit },
];

export default function UnitToggle({
  currentAmount,
  className,
}: UnitToggleProps) {
  const { preferredUnit, setPreferredUnit } = useAppStore();

  const parsed = currentAmount ? parseFloat(currentAmount) : NaN;
  const otherUnit: Unit = preferredUnit === "ml" ? "oz" : "ml";
  const converted = !isNaN(parsed)
    ? convertAmount(parsed, preferredUnit, otherUnit)
    : null;

  return (
    <div className={className}>
      <Toggle
        options={unitOptions}
        value={preferredUnit}
        onChange={setPreferredUnit}
      />
      {converted !== null && (
        <p className="mt-1 text-center text-xs text-plum/40">
          = {otherUnit === "oz" ? converted.toFixed(1) : Math.round(converted)}{" "}
          {otherUnit}
        </p>
      )}
    </div>
  );
}
