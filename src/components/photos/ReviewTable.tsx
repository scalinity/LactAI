import type { VisionEntry } from "@/types/upload";
import ReviewRow from "./ReviewRow";

interface ReviewTableProps {
  entries: VisionEntry[];
  thumbnailUrls?: string[];
  onAccept: (index: number, entry: VisionEntry) => void;
  onReject: (index: number) => void;
  onChange: (index: number, entry: VisionEntry) => void;
}

export default function ReviewTable({
  entries,
  thumbnailUrls,
  onAccept,
  onReject,
  onChange,
}: ReviewTableProps) {
  if (entries.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-plum/10">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-plum/10 bg-plum/[0.02]">
            <th className="py-2 pr-2 pl-3 text-xs font-medium text-plum/50" />
            <th className="py-2 px-2 text-xs font-medium text-plum/50">
              Amount
            </th>
            <th className="py-2 px-2 text-xs font-medium text-plum/50">Unit</th>
            <th className="py-2 px-2 text-xs font-medium text-plum/50">Time</th>
            <th className="py-2 px-2 text-xs font-medium text-plum/50">
              Notes
            </th>
            <th className="py-2 px-2 text-xs font-medium text-plum/50">
              Conf.
            </th>
            <th className="py-2 pl-2 pr-3 text-xs font-medium text-plum/50" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <ReviewRow
              key={`${entry.timestamp_local}-${i}`}
              entry={entry}
              thumbnailUrl={thumbnailUrls?.[i]}
              onAccept={(e) => onAccept(i, e)}
              onReject={() => onReject(i)}
              onChange={(e) => onChange(i, e)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
