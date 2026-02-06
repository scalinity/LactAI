import { useState, useCallback } from "react";
import { UnitToggle } from "../components/ui/UnitToggle";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { useExport } from "@/hooks/useExport";
import { useImport } from "@/hooks/useImport";
import { db } from "@/db";
import {
  Monitor,
  Database,
  Shield,
  Info,
  Download,
  Upload,
  Trash2,
  FileSpreadsheet,
  FileJson,
  RotateCcw,
} from "lucide-react";
import { useThemeStore, type ThemeMode } from "@/stores/useThemeStore";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { preferredUnit, setPreferredUnit, setHasCompletedOnboarding } =
    useAppStore();
  const { exportCSV, exportJSON } = useExport();
  const { importFromFile, importing, result: importResult } = useImport();
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const { mode, setMode } = useThemeStore();

  const handleImport = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await importFromFile(file);
      }
    };
    input.click();
  }, [importFromFile]);

  const handleDeleteAll = useCallback(async () => {
    if (deleteStep < 2) {
      setDeleteStep((s) => s + 1);
      return;
    }
    // Third click: actually delete
    setDeleting(true);
    try {
      await db.sessions.clear();
      await db.uploads.clear();
      await db.chat_messages.clear();
      await db.chat_threads.clear();
      setDeleteStep(0);
    } finally {
      setDeleting(false);
    }
  }, [deleteStep]);

  const deleteLabels = [
    "Delete All Data",
    "Are you sure?",
    "This cannot be undone. Delete everything.",
  ];

  return (
    <div className="animate-page-enter mx-auto max-w-lg px-4 pt-6 pb-8">
      <h1 className="mb-6 font-[Nunito] text-2xl font-bold text-plum">
        Settings
      </h1>

      {/* Theme Section */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-plum/10">
            <Monitor className="h-4 w-4 text-plum" />
          </div>
          <h2 className="font-[Nunito] text-lg font-bold text-plum">Appearance</h2>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-plum">Theme</p>
              <p className="text-sm text-plum-light/70">
                Choose light, dark, or system mode
              </p>
            </div>
            <div className="flex items-center rounded-xl bg-plum/[0.04] p-1">
              <div className="theme-toggle">
                {(['light', 'dark', 'system'] as ThemeMode[]).map((themeMode) => (
                  <button
                    key={themeMode}
                    className={`theme-button ${mode === themeMode ? "active" : ""}`}
                    onClick={() => setMode(themeMode)}
                    aria-pressed={mode === themeMode}
                  >
                    {themeMode.charAt(0).toUpperCase() + themeMode.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Display Section */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-primary/10">
            <Monitor className="h-4 w-4 text-rose-primary" />
          </div>
          <h2 className="font-[Nunito] text-lg font-bold text-plum">Display</h2>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-plum">Unit Preference</p>
              <p className="text-sm text-plum-light/70">
                Choose milliliters or ounces
              </p>
            </div>
            <div className="flex items-center rounded-xl bg-plum/[0.04] p-1">
              <UnitToggle
                isMetric={preferredUnit === "ml"}
                onChange={(isMetric) => setPreferredUnit(isMetric ? "ml" : "oz")}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Data Section */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage/15">
            <Database className="h-4 w-4 text-sage-dark" />
          </div>
          <h2 className="font-[Nunito] text-lg font-bold text-plum">Data</h2>
        </div>
        <div className="stagger-children space-y-2">
          <button
            onClick={exportCSV}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
          >
            <FileSpreadsheet className="h-5 w-5 text-sage" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-plum">Export CSV</p>
              <p className="text-sm text-plum-light/70">
                Download sessions as spreadsheet
              </p>
            </div>
            <Download className="h-4 w-4 text-plum/25" />
          </button>

          <button
            onClick={exportJSON}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
          >
            <FileJson className="h-5 w-5 text-sage" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-plum">Export JSON Backup</p>
              <p className="text-sm text-plum-light/70">Full backup of all data</p>
            </div>
            <Download className="h-4 w-4 text-plum/25" />
          </button>

          <button
            onClick={handleImport}
            disabled={importing}
            className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            <Upload className="h-5 w-5 text-rose-primary" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-plum">
                {importing ? "Importing..." : "Import Backup"}
              </p>
              <p className="text-sm text-plum-light/70">
                Restore from JSON backup file
              </p>
            </div>
          </button>

          {importResult && (
            <div className="rounded-2xl bg-sage/15 p-3 text-sm text-plum">
              Imported {importResult.imported} sessions
              {importResult.skipped > 0 &&
                `, skipped ${importResult.skipped} duplicates`}
            </div>
          )}
        </div>
      </section>

      {/* Privacy Section */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-alert/10">
            <Shield className="h-4 w-4 text-red-alert" />
          </div>
          <h2 className="font-[Nunito] text-lg font-bold text-plum">Privacy</h2>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <button
            onClick={handleDeleteAll}
            onBlur={() => setDeleteStep(0)}
            disabled={deleting}
            className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              deleteStep === 0
                ? "bg-red-50 text-red-alert hover:bg-red-100"
                : deleteStep === 1
                  ? "bg-red-100 text-red-alert"
                  : "bg-red-alert text-white shadow-md"
            } disabled:opacity-50`}
          >
            <div className="flex items-center justify-center gap-2">
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : deleteLabels[deleteStep]}
            </div>
          </button>
        </div>
      </section>

      {/* About Section */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-plum/[0.06]">
            <Info className="h-4 w-4 text-plum-light" />
          </div>
          <h2 className="font-[Nunito] text-lg font-bold text-plum">About</h2>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-plum">Version</p>
              <p className="text-sm text-plum-light/70">0.1.0</p>
            </div>
            <div>
              <p className="font-semibold text-plum">ClaudiaFlow</p>
              <p className="mt-1 text-sm leading-relaxed text-plum-light/70">
                A breast milk expression tracker that helps you log, visualize,
                and understand your pumping patterns with AI-powered insights.
              </p>
            </div>
            <div className="border-t border-plum/[0.06] pt-3">
              <p className="text-xs leading-relaxed text-plum-light/60">
                Your data is stored locally on this device. AI features only
                send data when you explicitly request them.
              </p>
            </div>
            <button
              onClick={() => {
                setHasCompletedOnboarding(false);
                navigate("/");
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-plum/[0.06] p-3 transition-all hover:bg-plum/[0.02] active:scale-[0.99]"
            >
              <RotateCcw className="h-5 w-5 text-rose-primary" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-plum">
                  Replay Tutorial
                </p>
                <p className="text-xs text-plum-light/60">
                  See the welcome guide again
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
