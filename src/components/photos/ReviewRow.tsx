import { useState } from "react";
import type { VisionEntry } from "@/types/upload";
import ConfidenceBadge from "./ConfidenceBadge";
import Button from "@/components/ui/Button";
import { Check, X } from "lucide-react";

interface ReviewRowProps {
  entry: VisionEntry;
  thumbnailUrl?: string;
  onAccept: (entry: VisionEntry) => void;
  onReject: () => void;
  onChange: (entry: VisionEntry) => void;
}

export default function ReviewRow({
  entry,
  thumbnailUrl,
  onAccept,
  onReject,
  onChange,
}: ReviewRowProps) {
  const [editing, setEditing] = useState<string | null>(null);

  const handleFieldClick = (field: string) => setEditing(field);

  const handleFieldBlur = () => setEditing(null);

  return (
    <tr className="border-b border-plum/5 last:border-0">
      <td className="py-2 pr-2">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-10 w-10 rounded-lg object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-plum/5" />
        )}
      </td>
      <td className="py-2 px-2">
        {editing === "amount" ? (
          <input
            type="number"
            value={entry.amount}
            onChange={(e) =>
              onChange({ ...entry, amount: parseFloat(e.target.value) || 0 })
            }
            onBlur={handleFieldBlur}
            autoFocus
            className="w-16 rounded bg-cream px-1 py-0.5 text-sm text-plum outline-none ring-1 ring-rose-primary/50"
          />
        ) : (
          <span
            onClick={() => handleFieldClick("amount")}
            className="cursor-pointer text-sm text-plum hover:underline"
          >
            {entry.amount}
          </span>
        )}
      </td>
      <td className="py-2 px-2 text-sm text-plum/70">{entry.unit}</td>
      <td className="py-2 px-2">
        {editing === "timestamp" ? (
          <input
            type="datetime-local"
            value={entry.timestamp_local.slice(0, 16)}
            onChange={(e) =>
              onChange({ ...entry, timestamp_local: e.target.value })
            }
            onBlur={handleFieldBlur}
            autoFocus
            className="rounded bg-cream px-1 py-0.5 text-xs text-plum outline-none ring-1 ring-rose-primary/50"
          />
        ) : (
          <span
            onClick={() => handleFieldClick("timestamp")}
            className="cursor-pointer text-xs text-plum/60 hover:underline"
          >
            {new Date(entry.timestamp_local).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        )}
      </td>
      <td className="py-2 px-2 text-xs text-plum/50 max-w-[80px] truncate">
        {entry.notes || "-"}
      </td>
      <td className="py-2 px-2">
        <ConfidenceBadge confidence={entry.confidence} />
      </td>
      <td className="py-2 pl-2">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAccept(entry)}
            className="!p-1"
          >
            <Check className="h-4 w-4 text-sage" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onReject} className="!p-1">
            <X className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
