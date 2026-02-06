import { useState, useRef } from "react";
import { formatRelativeTime, formatDateTime } from "@/lib/utils";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimestampPickerProps {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

function toLocalDateTimeString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TimestampPicker({
  value,
  onChange,
  className,
}: TimestampPickerProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = () => {
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.showPicker?.());
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock className="h-4 w-4 text-plum/40" />
      {editing ? (
        <input
          ref={inputRef}
          type="datetime-local"
          value={toLocalDateTimeString(value)}
          onChange={(e) => {
            if (e.target.value) {
              onChange(new Date(e.target.value));
            }
          }}
          onBlur={() => setEditing(false)}
          className="rounded-lg bg-cream px-2 py-1 text-sm text-plum outline-none focus:ring-2 focus:ring-rose-primary/50"
        />
      ) : (
        <button
          type="button"
          onClick={handleToggle}
          className="text-sm text-plum/60 hover:text-plum transition-colors"
        >
          <span className="font-medium">{formatDateTime(value)}</span>
          <span className="ml-1 text-plum/40">
            ({formatRelativeTime(value)})
          </span>
        </button>
      )}
    </div>
  );
}
