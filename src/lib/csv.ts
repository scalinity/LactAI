import type { Session } from "@/types/session";
import { format } from "date-fns";
import { mlToOz } from "./units";

export function sessionsToCSV(sessions: Session[]): string {
  const headers = [
    "Date",
    "Time",
    "Type",
    "Amount (ml)",
    "Amount (oz)",
    "Side",
    "Left (ml)",
    "Left (oz)",
    "Right (ml)",
    "Right (oz)",
    "Duration (min)",
    "Notes",
    "Source",
  ];
  const rows = sessions.map((s) => [
    format(s.timestamp, "yyyy-MM-dd"),
    format(s.timestamp, "HH:mm"),
    s.session_type || "",
    Math.round(s.amount_ml).toString(),
    mlToOz(s.amount_ml).toFixed(1),
    s.side || "",
    s.amount_left_ml != null ? Math.round(s.amount_left_ml).toString() : "",
    s.amount_left_ml != null ? mlToOz(s.amount_left_ml).toFixed(1) : "",
    s.amount_right_ml != null ? Math.round(s.amount_right_ml).toString() : "",
    s.amount_right_ml != null ? mlToOz(s.amount_right_ml).toFixed(1) : "",
    s.duration_min?.toString() || "",
    (s.notes || "").replace(/"/g, '""'),
    s.source,
  ]);

  const csvRows = [headers, ...rows].map((row) =>
    row.map((cell) => `"${cell}"`).join(","),
  );
  return csvRows.join("\n");
}
