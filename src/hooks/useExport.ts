import { useCallback } from "react";
import { db } from "@/db";
import { sessionsToCSV } from "@/lib/csv";
import { exportAllData } from "@/lib/json-export";

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExport() {
  const exportCSV = useCallback(async () => {
    const sessions = await db.sessions.orderBy("timestamp").toArray();
    const csv = sessionsToCSV(sessions);
    downloadFile(csv, `claudiaflow-export-${Date.now()}.csv`, "text/csv");
  }, []);

  const exportJSON = useCallback(async () => {
    const json = await exportAllData();
    downloadFile(
      json,
      `claudiaflow-backup-${Date.now()}.json`,
      "application/json",
    );
  }, []);

  return { exportCSV, exportJSON };
}
