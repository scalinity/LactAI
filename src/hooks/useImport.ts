import { useCallback, useState } from "react";
import { importData } from "@/lib/json-export";
import { parseFeedingPumpingCSV, importCSVSessions } from "@/lib/csv-import";

export function useImport() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    feedCount?: number;
    pumpCount?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importFromFile = useCallback(async (file: File) => {
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const res = await importData(text);
      setResult(res);
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to import backup";
      setError(msg);
      return null;
    } finally {
      setImporting(false);
    }
  }, []);

  const importFromCSV = useCallback(async (file: File) => {
    setImporting(true);
    setError(null);
    try {
      const text = await file.text();
      const { sessions, feedCount, pumpCount, errors } =
        parseFeedingPumpingCSV(text);

      if (sessions.length === 0 && errors.length > 0) {
        setError(errors[0]);
        return null;
      }

      if (errors.length > 0) {
        console.warn("CSV parse warnings:", errors);
      }

      const { imported, skipped } = await importCSVSessions(sessions);
      const res = { imported, skipped, feedCount, pumpCount };
      setResult(res);
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to import CSV";
      setError(msg);
      return null;
    } finally {
      setImporting(false);
    }
  }, []);

  return { importFromFile, importFromCSV, importing, result, error };
}
