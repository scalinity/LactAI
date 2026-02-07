import { useCallback, useState } from "react";
import { importData } from "@/lib/json-export";
import { parseFeedingPumpingCSV, importCSVSessions } from "@/lib/csv-import";

const MAX_CSV_SIZE_MB = 10;
const MAX_CSV_SIZE_BYTES = MAX_CSV_SIZE_MB * 1024 * 1024;

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
    // Validate file size before processing
    if (file.size > MAX_CSV_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File too large (${sizeMB}MB). Maximum size is ${MAX_CSV_SIZE_MB}MB. Please split into smaller files.`);
      return null;
    }

    setImporting(true);
    setError(null);
    try {
      // Read file with UTF-8 encoding validation
      const text = await file.text();
      // Remove BOM if present (UTF-8 BOM: EF BB BF)
      const cleanText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
      const { sessions, feedCount, pumpCount, errors } =
        parseFeedingPumpingCSV(cleanText);

      if (sessions.length === 0 && errors.length > 0) {
        setError(errors[0]);
        return null;
      }

      if (errors.length > 0) {
        console.warn(`CSV import: ${errors.length} validation errors`);
      }

      const { imported, skipped, skippedItems } = await importCSVSessions(sessions);
      
      if (skippedItems.length > 0) {
        console.info(`Skipped ${skipped} duplicate entries:`, skippedItems.slice(0, 5));
        if (skippedItems.length > 5) {
          console.info(`... and ${skippedItems.length - 5} more`);
        }
      }
      
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
