import { useSessions } from "@/db/hooks";
import { useAppStore } from "@/stores/useAppStore";
import { convertAmount, formatAmount } from "@/lib/units";
import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";
import Card from "@/components/ui/Card";

export default function DataCleanupCard() {
  const { preferredUnit } = useAppStore();
  const sessions = useSessions();

  if (!sessions || sessions.length < 10) return null;

  // Detect outliers (>2 std dev from mean)
  const amounts = sessions.map((s) => s.amount_ml);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance =
    amounts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const outliers = sessions.filter(
    (s) => Math.abs(s.amount_ml - mean) > 2 * stdDev,
  );

  // Detect missing sides
  const noSide = sessions.filter((s) => !s.side);

  // Detect potential typos (zero or very tiny amounts)
  const suspicious = sessions.filter(
    (s) => s.amount_ml <= 0 || s.amount_ml < 5,
  );

  const issues = outliers.length + suspicious.length;

  if (issues === 0 && noSide.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="h-5 w-5 text-plum/50" />
        <h3 className="font-[Nunito] text-sm font-bold text-plum">
          Data Cleanup
        </h3>
      </div>
      <div className="space-y-2 text-sm text-plum/70">
        {outliers.length > 0 && (
          <p>
            <strong className="text-amber-600">{outliers.length}</strong> unusual
            amounts detected (avg is{" "}
            {formatAmount(
              convertAmount(mean, "ml", preferredUnit),
              preferredUnit,
            )}
            )
          </p>
        )}
        {suspicious.length > 0 && (
          <p>
            <strong className="text-amber-600">{suspicious.length}</strong>{" "}
            sessions with very small or zero amounts
          </p>
        )}
        {noSide.length > 0 && (
          <p>
            <strong className="text-plum/50">{noSide.length}</strong> sessions
            without a side specified
          </p>
        )}
      </div>
      {issues > 0 && (
        <Link
          to="/history"
          className="mt-3 inline-block text-sm font-medium text-rose-primary hover:underline"
        >
          Review in History
        </Link>
      )}
    </Card>
  );
}
