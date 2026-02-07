import { useRef } from "react";
import { useExport } from "@/hooks/useExport";
import { useImport } from "@/hooks/useImport";
import Button from "@/components/ui/Button";
import { Download, Upload, FileSpreadsheet } from "lucide-react";

export default function ExportImportBar() {
  const { exportCSV, exportJSON } = useExport();
  const {
    importFromFile,
    importFromCSV,
    importFromXLSX,
    importing,
    result,
    error,
  } = useImport();
  const fileRef = useRef<HTMLInputElement>(null);
  const csvRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => fileRef.current?.click();
  const handleCSVImportClick = () => csvRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importFromFile(file);
      e.target.value = "";
    }
  };

  const handleCSVChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.name.endsWith(".xlsx")) {
      await importFromXLSX(file);
    } else {
      await importFromCSV(file);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
        <Button variant="secondary" size="sm" onClick={exportJSON}>
          <Download className="h-3.5 w-3.5" />
          Export JSON
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleImportClick}
          loading={importing}
        >
          <Upload className="h-3.5 w-3.5" />
          Import Backup
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCSVImportClick}
          loading={importing}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Import CSV/XLSX
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={csvRef}
          type="file"
          accept=".csv,.xlsx"
          onChange={handleCSVChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-xs text-red-600">Import failed: {error}</p>}
      {result && !error && (
        <p className="text-xs text-plum/60">
          {result.feedCount != null || result.pumpCount != null ? (
            <>
              Imported {result.feedCount ?? 0} feedings and{" "}
              {result.pumpCount ?? 0} pump sessions
              {result.skipped > 0 && <>, skipped {result.skipped}</>}.
            </>
          ) : (
            <>
              Imported {result.imported} sessions, skipped {result.skipped}.
            </>
          )}
        </p>
      )}
    </div>
  );
}
