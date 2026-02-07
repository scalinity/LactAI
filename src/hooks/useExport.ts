import { useCallback } from "react";
import { db } from "@/db";
import { sessionsToCSV } from "@/lib/csv";
import { exportAllData } from "@/lib/json-export";
import toast from "react-hot-toast";

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
    try {
      const sessions = await db.sessions.orderBy("timestamp").toArray();
      const csv = sessionsToCSV(sessions);
      downloadFile(csv, `claudiaflow-export-${Date.now()}.csv`, "text/csv");
    } catch {
      toast.error("Failed to export CSV. Please try again.");
    }
  }, []);

  const exportJSON = useCallback(async () => {
    try {
      const json = await exportAllData();
      downloadFile(
        json,
        `claudiaflow-backup-${Date.now()}.json`,
        "application/json",
      );
    } catch {
      toast.error("Failed to export backup. Please try again.");
    }
  }, []);

  return { exportCSV, exportJSON };
}
