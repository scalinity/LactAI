import { useState, useCallback, useEffect } from "react";
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
  X,
  Globe,
} from "lucide-react";
import { useThemeStore, type ThemeMode } from "@/stores/useThemeStore";
import {
  deleteImportedSessions,
  countSessionsBySource,
} from "@/lib/session-management";
import { useTranslation } from "@/i18n";

const DELETE_RESULT_DISPLAY_DURATION_MS = 5000;
const IMPORT_COUNT_POLL_INTERVAL_MS = 2000;

export default function SettingsPage() {
  const navigate = useNavigate();
  const { preferredUnit, setPreferredUnit, locale, setLocale } = useAppStore();
  const { exportCSV, exportJSON } = useExport();
  const {
    importFromFile,
    importFromXLSX,
    importing,
    result: importResult,
  } = useImport();
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const { mode, setMode } = useThemeStore();
  const [deleteImportsStep, setDeleteImportsStep] = useState(0);
  const [deletingImports, setDeletingImports] = useState(false);
  const [importCounts, setImportCounts] = useState({
    imported: 0,
    ocr: 0,
    ai_vision: 0,
  });
  const [importCountsLoading, setImportCountsLoading] = useState(true);
  const [deleteImportsResult, setDeleteImportsResult] = useState<{
    deleted: number;
  } | null>(null);
  const [deleteImportsError, setDeleteImportsError] = useState<string | null>(
    null,
  );
  const { t } = useTranslation();

  // Load import counts with polling to prevent stale state
  useEffect(() => {
    const interval = setInterval(
      loadImportCounts,
      IMPORT_COUNT_POLL_INTERVAL_MS,
    );
    loadImportCounts(); // Initial load
    return () => clearInterval(interval);
  }, []);

  const loadImportCounts = async () => {
    try {
      const counts = await countSessionsBySource();
      setImportCounts({
        imported: counts.imported || 0,
        ocr: counts.ocr || 0,
        ai_vision: counts.ai_vision || 0,
      });
    } catch (error) {
      console.error("Failed to load import counts:", error);
    } finally {
      setImportCountsLoading(false);
    }
  };

  const totalImports =
    importCounts.imported + importCounts.ocr + importCounts.ai_vision;

  const handleImport = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.xlsx";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.name.endsWith(".xlsx")) {
        await importFromXLSX(file);
      } else {
        await importFromFile(file);
      }
    };
    input.click();
  }, [importFromFile, importFromXLSX]);

  const handleDeleteImports = useCallback(async () => {
    if (deleteImportsStep < 2) {
      setDeleteImportsStep((s) => s + 1);
      return;
    }
    // Third click: actually delete
    setDeletingImports(true);
    setDeleteImportsError(null);
    try {
      const result = await deleteImportedSessions([
        "imported",
        "ocr",
        "ai_vision",
      ]);
      setDeleteImportsResult(result);
      setDeleteImportsStep(0);
      await loadImportCounts();

      // Clear result after specified duration
      setTimeout(
        () => setDeleteImportsResult(null),
        DELETE_RESULT_DISPLAY_DURATION_MS,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete imports";
      setDeleteImportsError(errorMessage);
      console.error("Delete imports error:", error);
    } finally {
      setDeletingImports(false);
      setDeleteImportsStep(0);
    }
  }, [deleteImportsStep]);

  const deleteImportsLabels = [
    t("settings.deleteImports", { count: totalImports }),
    t("settings.areYouSure"),
    t("settings.deleteImportsConfirm"),
  ];

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
    t("settings.deleteAllData"),
    t("settings.areYouSure"),
    t("settings.deleteAllConfirm"),
  ];

  const themeModeLabels: Record<ThemeMode, string> = {
    light: t("settings.light"),
    dark: t("settings.dark"),
    system: t("settings.system"),
  };

  return (
    <div className="animate-page-enter mx-auto max-w-lg px-4 pt-6 pb-8">
      <h1 className="mb-6 font-[Nunito] text-2xl font-bold text-plum">
        {t("settings.settings")}
      </h1>

      {/* Theme Section */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-plum/10">
            <Monitor className="h-4 w-4 text-plum" />
          </div>
          <h2 className="font-[Nunito] text-lg font-bold text-plum">
            {t("settings.appearance")}
          </h2>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-plum">{t("settings.theme")}</p>
              <p className="text-sm text-plum-light/70">
                {t("settings.themeDesc")}
              </p>
            </div>
            <div className="flex items-center rounded-xl bg-plum/[0.04] p-1">
              <div className="flex items-center">
                {(["light", "dark", "system"] as ThemeMode[]).map(
                  (themeMode) => (
                    <button
                      key={themeMode}
                      className={`rounded-lg px-3 py-1 text-sm font-semibold transition-all ${
                        mode === themeMode
                          ? "bg-rose-primary text-white shadow-sm"
                          : "text-plum/40 hover:text-plum/60"
                      }`}
                      onClick={() => setMode(themeMode)}
                      aria-pressed={mode === themeMode}
                    >
                      {themeModeLabels[themeMode]}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Language Section */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-plum/10">
            <Globe className="h-4 w-4 text-plum" />
          </div>
          <h2 className="font-[Nunito] text-lg font-bold text-plum">
            {t("settings.language")}
          </h2>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-plum">
                {t("settings.language")}
              </p>
              <p className="text-sm text-plum-light/70">
                {t("settings.languageDesc")}
              </p>
            </div>
            <div className="flex items-center rounded-xl bg-plum/[0.04] p-1">
              <div className="flex items-center">
                {(["en", "es"] as const).map((lang) => (
                  <button
                    key={lang}
                    className={`rounded-lg px-3 py-1 text-sm font-semibold transition-all ${
                      locale === lang
                        ? "bg-rose-primary text-white shadow-sm"
                        : "text-plum/40 hover:text-plum/60"
                    }`}
                    onClick={() => setLocale(lang)}
                    aria-pressed={locale === lang}
                  >
                    {/* Native names — not translated so users can always find their language */}
                    {lang === "en" ? "English" : "Español"}
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
          <h2 className="font-[Nunito] text-lg font-bold text-plum">
            {t("settings.display")}
          </h2>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-plum">
                {t("settings.unitPreference")}
              </p>
              <p className="text-sm text-plum-light/70">
                {t("settings.unitDesc")}
              </p>
            </div>
            <div className="flex items-center rounded-xl bg-plum/[0.04] p-1">
              <UnitToggle value={preferredUnit} onChange={setPreferredUnit} />
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
          <h2 className="font-[Nunito] text-lg font-bold text-plum">
            {t("settings.data")}
          </h2>
        </div>
        <div className="stagger-children space-y-2">
          <button
            onClick={exportCSV}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
          >
            <FileSpreadsheet className="h-5 w-5 text-sage" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-plum">
                {t("settings.exportCSV")}
              </p>
              <p className="text-sm text-plum-light/70">
                {t("settings.exportCSVDesc")}
              </p>
            </div>
            <Download className="h-4 w-4 text-plum/25" />
          </button>

          <button
            onClick={exportJSON}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
          >
            <FileJson className="h-5 w-5 text-sage" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-plum">
                {t("settings.exportJSON")}
              </p>
              <p className="text-sm text-plum-light/70">
                {t("settings.exportJSONDesc")}
              </p>
            </div>
            <Download className="h-4 w-4 text-plum/25" />
          </button>

          <button
            onClick={handleImport}
            disabled={importing}
            className="flex w-full items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm transition-all hover:shadow-md active:scale-[0.99] disabled:opacity-50"
          >
            <Upload className="h-5 w-5 text-rose-primary" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-plum">
                {importing ? t("common.importing") : t("settings.importBackup")}
              </p>
              <p className="text-sm text-plum-light/70">
                {t("settings.importBackupDesc")}
              </p>
            </div>
          </button>

          {importResult && (
            <div className="rounded-2xl bg-sage/15 p-3 text-sm text-plum">
              {t("settings.importedSessions", { count: importResult.imported })}
              {importResult.skipped > 0 &&
                `, ${t("settings.skippedDuplicates", { count: importResult.skipped })}`}
            </div>
          )}

          {totalImports > 0 && (
            <button
              onClick={handleDeleteImports}
              onBlur={() => setDeleteImportsStep(0)}
              disabled={deletingImports || importCountsLoading}
              aria-label={`Delete ${totalImports} imported sessions. ${deleteImportsStep < 2 ? `Requires ${3 - deleteImportsStep} more ${deleteImportsStep === 2 ? "click" : "clicks"}.` : "Final confirmation - this action cannot be undone."}`}
              className={`flex w-full items-center gap-3 rounded-2xl p-4 shadow-sm transition-all ${
                deleteImportsStep === 0
                  ? "bg-surface hover:shadow-md active:scale-[0.99]"
                  : deleteImportsStep === 1
                    ? "bg-orange-50"
                    : "bg-orange-100 shadow-md"
              } disabled:opacity-50`}
            >
              <X className="h-5 w-5 text-orange-600" />
              <div className="flex-1 text-left">
                <p
                  className={`font-semibold ${deleteImportsStep > 0 ? "text-orange-700" : "text-plum"}`}
                >
                  {deletingImports
                    ? t("common.deleting")
                    : importCountsLoading
                      ? t("common.loading")
                      : deleteImportsLabels[deleteImportsStep]}
                </p>
                <p className="text-sm text-plum-light/70">
                  {t("settings.deleteImportsDesc")}
                </p>
              </div>
            </button>
          )}

          {deleteImportsError && (
            <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">
              {deleteImportsError}
            </div>
          )}

          {deleteImportsResult && (
            <div className="rounded-2xl bg-orange-50 p-3 text-sm text-orange-700">
              {t("settings.deletedImports", {
                count: deleteImportsResult.deleted,
              })}
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
          <h2 className="font-[Nunito] text-lg font-bold text-plum">
            {t("settings.privacy")}
          </h2>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
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
              {deleting ? t("common.deleting") : deleteLabels[deleteStep]}
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
          <h2 className="font-[Nunito] text-lg font-bold text-plum">
            {t("settings.about")}
          </h2>
        </div>
        <div className="rounded-2xl bg-surface p-4 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-plum">{t("settings.version")}</p>
              <p className="text-sm text-plum-light/70">0.1.0</p>
            </div>
            <div>
              <p className="font-semibold text-plum">ClaudiaFlow</p>
              <p className="mt-1 text-sm leading-relaxed text-plum-light/70">
                {t("settings.claudiaFlowDesc")}
              </p>
            </div>
            <div className="border-t border-plum/[0.06] pt-3">
              <p className="text-xs leading-relaxed text-plum-light/60">
                {t("settings.dataStoredLocally")}
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("claudiaflow-tutorial-seen");
                navigate("/");
                window.location.reload();
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-plum/[0.06] p-3 transition-all hover:bg-plum/[0.02] active:scale-[0.99]"
            >
              <RotateCcw className="h-5 w-5 text-rose-primary" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-plum">
                  {t("settings.replayTutorial")}
                </p>
                <p className="text-xs text-plum-light/60">
                  {t("settings.replayTutorialDesc")}
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
