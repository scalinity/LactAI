import Input from "@/components/ui/Input";
import { useTranslation } from "@/i18n";

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
  const { t } = useTranslation();

  return (
    <div className={className}>
      <Input
        label={t("session.durationMin")}
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("session.optional")}
      />
    </div>
  );
}
