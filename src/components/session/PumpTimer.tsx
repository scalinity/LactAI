import { useState, useEffect } from "react";
import { useTimerStore } from "@/stores/useTimerStore";
import { useSessionFormStore } from "@/stores/useSessionFormStore";
import { useTranslation } from "@/i18n";
import { Play, Square } from "lucide-react";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PumpTimer() {
  const { t } = useTranslation();
  const { isRunning, startedAt, start, stop } = useTimerStore();
  const setField = useSessionFormStore((s) => s.setField);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startedAt) {
      setElapsed(0);
      return;
    }

    setElapsed(Date.now() - startedAt);
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startedAt]);

  const handleToggle = () => {
    if (isRunning) {
      const minutes = stop();
      setField("durationMin", String(Math.max(1, minutes)));
    } else {
      start();
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-plum">{t("timer.title")}</p>
      <div className="flex items-center gap-3 rounded-xl bg-cream border border-plum/10 px-3 py-2.5">
        <button
          type="button"
          onClick={handleToggle}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
            isRunning
              ? "bg-plum/10 text-plum hover:bg-plum/20"
              : "bg-rose-primary text-white hover:bg-rose-dark"
          }`}
        >
          {isRunning ? (
            <Square className="h-4 w-4" fill="currentColor" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
          )}
        </button>
        <div className="flex-1">
          {isRunning ? (
            <p className="font-[Nunito] text-2xl font-bold tabular-nums text-plum">
              {formatElapsed(elapsed)}
            </p>
          ) : (
            <p className="text-sm text-plum/50">{t("timer.tapToStart")}</p>
          )}
        </div>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-rose-primary">
            <span className="h-2 w-2 rounded-full bg-rose-primary animate-pulse" />
            {t("timer.recording")}
          </span>
        )}
      </div>
    </div>
  );
}
