import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { processMultiplePhotos } from "@/lib/photo-processor";
import { extractFromImage } from "@/lib/api";
import { findDuplicates } from "@/lib/dedupe";
import { toMl } from "@/lib/units";
import { db } from "@/db";
import type { VisionEntry } from "@/types/upload";
import PhotoUploader from "@/components/photos/PhotoUploader";
import ReviewTable from "@/components/photos/ReviewTable";
import EmptyState from "@/components/ui/EmptyState";
import {
  ArrowLeft,
  Camera,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";

type Step = "upload" | "processing" | "review" | "done";

interface ReviewRow {
  entry: VisionEntry;
  accepted: boolean;
  hasDuplicate: boolean;
  photoIndex: number;
}

export default function PhotoImportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [reviewRows, setReviewRows] = useState<ReviewRow[]>([]);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setFiles((prev) => [...prev, ...selectedFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const startProcessing = useCallback(async () => {
    if (files.length === 0) return;

    setStep("processing");
    setProcessingTotal(files.length);
    setProcessingIndex(0);
    setError(null);

    try {
      // Process photos (compress, get base64)
      const processed = await processMultiplePhotos(files, (index) => {
        setProcessingIndex(index + 1);
      });
      // Extract data from each photo via AI
      const allRows: ReviewRow[] = [];

      for (let i = 0; i < processed.length; i++) {
        setProcessingIndex(i + 1);
        try {
          const result = await extractFromImage(
            processed[i].base64,
            processed[i].mimeType,
            {
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              preferred_unit: "ml",
            },
          );

          for (const entry of result.entries) {
            const timestamp = new Date(entry.timestamp_local);
            const amountMl = toMl(
              entry.amount,
              entry.unit === "fl_oz" ? "oz" : (entry.unit as "ml" | "oz"),
            );
            const dupes = await findDuplicates({
              timestamp,
              amount_ml: amountMl,
            });

            allRows.push({
              entry,
              accepted: dupes.length === 0,
              hasDuplicate: dupes.length > 0,
              photoIndex: i,
            });
          }
        } catch {
          allRows.push({
            entry: {
              timestamp_local: new Date().toISOString(),
              amount: 0,
              unit: "ml",
              confidence: 0,
              assumptions: ["Failed to extract data from this image"],
            },
            accepted: false,
            hasDuplicate: false,
            photoIndex: i,
          });
        }
      }

      setReviewRows(allRows);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setStep("upload");
    }
  }, [files]);

  const updateEntry = useCallback((index: number, updated: VisionEntry) => {
    setReviewRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, entry: updated } : row)),
    );
  }, []);

  const confirmImport = useCallback(async () => {
    const accepted = reviewRows.filter((r) => r.accepted && r.entry.amount > 0);
    const now = new Date();

    const sessions = accepted.map((row) => ({
      timestamp: new Date(row.entry.timestamp_local),
      amount_ml: toMl(
        row.entry.amount,
        row.entry.unit === "fl_oz" ? "oz" : (row.entry.unit as "ml" | "oz"),
      ),
      amount_entered: row.entry.amount,
      unit_entered: (row.entry.unit === "fl_oz" ? "oz" : row.entry.unit) as
        | "ml"
        | "oz",
      notes: row.entry.notes || undefined,
      source: "ai_vision" as const,
      confidence: row.entry.confidence,
      created_at: now,
      updated_at: now,
    }));

    await db.sessions.bulkAdd(sessions);
    setImportedCount(sessions.length);
    setStep("done");
  }, [reviewRows]);

  const duplicateCount = reviewRows.filter((r) => r.hasDuplicate).length;

  return (
    <div className="animate-page-enter mx-auto max-w-lg px-4 pt-6 pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-plum/60 shadow-sm transition-all hover:bg-plum/5 hover:text-plum active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-[Nunito] text-2xl font-bold text-plum">
          Import from Photos
        </h1>
      </div>

      {/* Upload Step */}
      {step === "upload" && (
        <div className="space-y-4">
          <PhotoUploader onFilesSelected={handleFilesSelected} />

          {files.length > 0 && (
            <>
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-3 rounded-xl border border-plum/10 bg-white p-2"
                  >
                    <div className="h-12 w-12 rounded-lg bg-cream-dark flex items-center justify-center">
                      <Camera className="h-5 w-5 text-plum/40" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-plum">
                        {file.name}
                      </p>
                      <p className="text-xs text-plum/40">
                        {(file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="shrink-0 rounded-lg p-1 text-plum/30 hover:bg-red-50 hover:text-red-500"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={startProcessing}
                className="w-full rounded-xl bg-rose-primary px-6 py-3 font-[Nunito] font-bold text-white shadow-md transition-transform active:scale-[0.98]"
              >
                Process {files.length} {files.length === 1 ? "Photo" : "Photos"}
              </button>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-alert">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {files.length === 0 && (
            <EmptyState
              icon={<Camera className="h-12 w-12 text-plum-light" />}
              title="Upload pump screen photos"
              description="Take photos of your pump display and we'll extract the session data automatically."
            />
          )}
        </div>
      )}

      {/* Processing Step */}
      {step === "processing" && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-rose-primary/20 animate-ping" />
            <Loader2 className="relative h-12 w-12 animate-spin text-rose-primary" />
          </div>
          <p className="mt-6 font-[Nunito] text-lg font-semibold text-plum">
            Processing photos...
          </p>
          <p className="mt-1 text-sm text-plum-light/70">
            {processingIndex} of {processingTotal} complete
          </p>
          <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-plum/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${processingTotal > 0 ? (processingIndex / processingTotal) * 100 : 0}%`,
                background: "linear-gradient(90deg, #e8a0bf 0%, #c77da3 100%)",
              }}
            />
          </div>
        </div>
      )}

      {/* Review Step */}
      {step === "review" && (
        <div className="space-y-4">
          {duplicateCount > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-sm text-amber-800">
                <strong>{duplicateCount}</strong> possible{" "}
                {duplicateCount === 1 ? "duplicate" : "duplicates"} detected.
                These have been unchecked by default.
              </p>
            </div>
          )}

          <ReviewTable
            entries={reviewRows.map((r) => r.entry)}
            onAccept={(i, entry) => {
              setReviewRows((prev) =>
                prev.map((row, idx) =>
                  idx === i ? { ...row, accepted: true, entry } : row,
                ),
              );
            }}
            onReject={(i) => {
              setReviewRows((prev) =>
                prev.map((row, idx) =>
                  idx === i ? { ...row, accepted: false } : row,
                ),
              );
            }}
            onChange={(i, entry) => updateEntry(i, entry)}
          />

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("upload");
                setFiles([]);
                setReviewRows([]);
              }}
              className="flex-1 rounded-xl border-2 border-plum-light px-4 py-3 font-[Nunito] font-bold text-plum transition-colors hover:bg-cream-dark"
            >
              Cancel
            </button>
            <button
              onClick={confirmImport}
              disabled={reviewRows.filter((r) => r.accepted).length === 0}
              className="flex-1 rounded-xl bg-rose-primary px-4 py-3 font-[Nunito] font-bold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              Import {reviewRows.filter((r) => r.accepted).length} Entries
            </button>
          </div>
        </div>
      )}

      {/* Done Step */}
      {step === "done" && (
        <div className="animate-page-enter flex flex-col items-center justify-center py-16">
          <div className="rounded-2xl bg-sage/15 p-4">
            <CheckCircle2 className="h-12 w-12 text-sage" />
          </div>
          <p className="mt-5 font-[Nunito] text-xl font-bold text-plum">
            Import Complete
          </p>
          <p className="mt-1 text-sm text-plum-light/70">
            {importedCount} {importedCount === 1 ? "session" : "sessions"} added
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                setStep("upload");
                setFiles([]);
                setReviewRows([]);
                setImportedCount(0);
              }}
              className="rounded-xl border-2 border-plum/15 px-6 py-3 font-[Nunito] font-bold text-plum transition-all hover:bg-plum/5 active:scale-[0.98]"
            >
              Import More
            </button>
            <button
              onClick={() => navigate("/history")}
              className="rounded-xl bg-rose-primary px-6 py-3 font-[Nunito] font-bold text-white shadow-md transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #e8a0bf 0%, #c77da3 100%)",
              }}
            >
              View History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
