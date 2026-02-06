import Input from "@/components/ui/Input";

interface DurationInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function DurationInput({
  value,
  onChange,
  className,
}: DurationInputProps) {
  return (
    <div className={className}>
      <Input
        label="Duration (min)"
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional"
      />
    </div>
  );
}
