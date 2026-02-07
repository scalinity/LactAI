import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { startOfDay, format } from "date-fns";
import type { Session } from "@/types/session";
import DayGroup from "./DayGroup";
import SessionCard from "@/components/session/SessionCard";
import EmptyState from "@/components/ui/EmptyState";
import { List } from "lucide-react";

interface DayBucket {
  key: string;
  date: Date;
  totalMl: number;
  feedTotalMl: number;
  pumpTotalMl: number;
  sessions: Session[];
}

interface HistoryListProps {
  sessions: Session[] | undefined;
  onDelete?: (id: number) => void;
}

function groupByDay(sessions: Session[]): DayBucket[] {
  const map = new Map<string, DayBucket>();

  for (const s of sessions) {
    const dayStart = startOfDay(s.timestamp);
    const key = format(dayStart, "yyyy-MM-dd");
    const bucket = map.get(key);
    if (bucket) {
      bucket.sessions.push(s);
      bucket.totalMl += s.amount_ml;
      if (s.session_type === "pumping") {
        bucket.pumpTotalMl += s.amount_ml;
      } else {
        bucket.feedTotalMl += s.amount_ml;
      }
    } else {
      map.set(key, {
        key,
        date: dayStart,
        totalMl: s.amount_ml,
        feedTotalMl: s.session_type === "pumping" ? 0 : s.amount_ml,
        pumpTotalMl: s.session_type === "pumping" ? s.amount_ml : 0,
        sessions: [s],
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );
}

export default function HistoryList({ sessions, onDelete }: HistoryListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const days = useMemo(() => groupByDay(sessions || []), [sessions]);

  const totalRows = days.reduce((acc, d) => acc + 1 + d.sessions.length, 0);

  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        icon={List}
        title="No sessions yet"
        description="Start logging your sessions to see them here."
      />
    );
  }

  const flatItems: Array<
    { type: "header"; day: DayBucket } | { type: "session"; session: Session }
  > = [];
  for (const day of days) {
    flatItems.push({ type: "header", day });
    for (const s of day.sessions) {
      flatItems.push({ type: "session", session: s });
    }
  }

  return (
    <div ref={parentRef} className="h-[calc(100vh-280px)] overflow-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {virtualizer.getVirtualItems().map((vItem) => {
          const item = flatItems[vItem.index];
          if (!item) return null;

          if (item.type === "header") {
            return (
              <div
                key={`header-${item.day.key}`}
                style={{
                  position: "absolute",
                  top: vItem.start,
                  width: "100%",
                  minHeight: vItem.size,
                }}
                ref={virtualizer.measureElement}
                data-index={vItem.index}
                className="pt-4 pb-1"
              >
                <DayGroup
                  date={item.day.date}
                  totalMl={item.day.totalMl}
                  feedTotalMl={item.day.feedTotalMl}
                  pumpTotalMl={item.day.pumpTotalMl}
                >
                  <span />
                </DayGroup>
              </div>
            );
          }

          return (
            <div
              key={`session-${item.session.id}`}
              style={{
                position: "absolute",
                top: vItem.start,
                width: "100%",
                minHeight: vItem.size,
              }}
              ref={virtualizer.measureElement}
              data-index={vItem.index}
              className="py-0.5"
            >
              <SessionCard session={item.session} onDelete={onDelete} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
