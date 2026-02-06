import type { Session } from "@/types/session";
import { formatAmount } from "@/lib/units";
import { formatDateTime } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { AlertTriangle } from "lucide-react";

interface DedupeWarningProps {
  matchingSession: Session;
  onSkip: () => void;
  onKeepBoth: () => void;
}

export default function DedupeWarning({
  matchingSession,
  onSkip,
  onKeepBoth,
}: DedupeWarningProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
      <div className="flex-1 space-y-2">
        <p className="text-sm font-medium text-amber-800">
          Possible duplicate detected
        </p>
        <p className="text-xs text-amber-700">
          Existing session:{" "}
          <strong>
            {formatAmount(
              matchingSession.amount_entered,
              matchingSession.unit_entered,
            )}
          </strong>{" "}
          at {formatDateTime(matchingSession.timestamp)}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
          <Button variant="secondary" size="sm" onClick={onKeepBoth}>
            Keep Both
          </Button>
        </div>
      </div>
    </div>
  );
}
