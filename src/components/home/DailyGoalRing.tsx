import { useState } from "react";
import { Settings } from "lucide-react";
import { useAppStore, type GoalType } from "@/stores/useAppStore";
import { convertAmount, formatAmount } from "@/lib/units";
import { useTranslation } from "@/i18n";

interface DailyGoalRingProps {
  sessionCount: number;
  totalMl: number;
  isLoading: boolean;
}

export default function DailyGoalRing({
  sessionCount,
  totalMl,
  isLoading,
}: DailyGoalRingProps) {
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useTranslation();
  const preferredUnit = useAppStore((s) => s.preferredUnit);
  const goalType = useAppStore((s) => s.dailyGoalType);
  const goalTarget = useAppStore((s) => s.dailyGoalTarget);
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);

  const current =
    goalType === "sessions"
      ? sessionCount
      : convertAmount(totalMl, "ml", preferredUnit);

  const percent = goalTarget > 0 ? Math.min(current / goalTarget, 1) : 0;
  const reached = percent >= 1;

  // SVG ring geometry
  const size = 96;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - percent);

  const displayCurrent =
    goalType === "sessions"
      ? sessionCount.toString()
      : formatAmount(
          convertAmount(totalMl, "ml", preferredUnit),
          preferredUnit,
        );

  const displayTarget =
    goalType === "sessions"
      ? `${goalTarget} ${t("home.sessions")}`
      : formatAmount(goalTarget, preferredUnit);

  return (
    <div className="mb-6 overflow-hidden rounded-2xl bg-surface shadow-sm">
      <div
        className="h-1 w-full"
        style={{
          background: reached
            ? "linear-gradient(90deg, var(--color-sage) 0%, var(--color-sage-dark) 100%)"
            : "linear-gradient(90deg, var(--color-rose-primary) 0%, var(--color-rose-dark) 100%)",
        }}
      />
      <div className="flex items-center gap-5 p-4">
        {/* Progress Ring */}
        <div className="relative shrink-0">
          <svg
            width={size}
            height={size}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--color-plum)"
              strokeWidth={stroke}
              opacity={0.08}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={
                reached ? "var(--color-sage)" : "var(--color-rose-primary)"
              }
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={isLoading ? circumference : dashOffset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-[Nunito] text-lg font-extrabold leading-none text-plum">
              {isLoading ? "--" : Math.round(percent * 100)}
              <span className="text-xs font-bold">%</span>
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-plum-light/60">
            {t("home.dailyGoal")}
          </p>
          <p className="mt-1 font-[Nunito] text-xl font-extrabold text-plum leading-tight">
            {isLoading ? (
              <span className="inline-block h-6 w-20 animate-pulse rounded-lg bg-plum/5" />
            ) : reached ? (
              t("home.goalReached")
            ) : (
              displayCurrent
            )}
          </p>
          <p className="text-xs text-plum-light/60 mt-0.5">
            {t("home.ofTarget", { target: displayTarget })}
          </p>
        </div>

        {/* Settings button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-plum-light/40 transition-colors hover:bg-plum/5 hover:text-plum-light/70"
          aria-label={t("home.goalSettings")}
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Inline settings panel */}
      {showSettings && (
        <GoalSettings
          goalType={goalType}
          goalTarget={goalTarget}
          preferredUnit={preferredUnit}
          onSave={(type, target) => {
            setDailyGoal(type, target);
            setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function GoalSettings({
  goalType,
  goalTarget,
  preferredUnit,
  onSave,
  onCancel,
}: {
  goalType: GoalType;
  goalTarget: number;
  preferredUnit: "ml" | "oz";
  onSave: (type: GoalType, target: number) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState(goalType);
  const [target, setTarget] = useState(goalTarget.toString());
  const { t } = useTranslation();

  const handleSave = () => {
    const num = parseFloat(target);
    if (!isNaN(num) && num > 0) {
      onSave(type, num);
    }
  };

  return (
    <div className="border-t border-plum/5 px-4 pb-4 pt-3">
      <div className="flex items-center gap-3">
        {/* Goal type toggle */}
        <div className="flex-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-plum-light/60 block mb-1.5">
            {t("home.goalType")}
          </label>
          <div className="flex rounded-lg bg-plum/5 p-0.5">
            <button
              onClick={() => {
                setType("sessions");
                setTarget("8");
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === "sessions"
                  ? "bg-white text-plum shadow-sm dark:bg-plum dark:text-white"
                  : "text-plum-light/60"
              }`}
            >
              {t("home.sessions")}
            </button>
            <button
              onClick={() => {
                setType("volume");
                setTarget(preferredUnit === "oz" ? "25" : "750");
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === "volume"
                  ? "bg-white text-plum shadow-sm dark:bg-plum dark:text-white"
                  : "text-plum-light/60"
              }`}
            >
              {t("home.volume")}
            </button>
          </div>
        </div>

        {/* Target input */}
        <div className="w-24">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-plum-light/60 block mb-1.5">
            {t("home.goalTarget")}
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-lg border border-plum/10 bg-white px-3 py-1.5 text-sm font-semibold text-plum outline-none focus:border-rose-primary/40 dark:bg-plum/10 dark:border-plum/20"
            />
            {type === "volume" && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-plum-light/50">
                {preferredUnit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-plum-light/60 transition-colors hover:bg-plum/5"
        >
          {t("common.cancel")}
        </button>
        <button
          onClick={handleSave}
          className="rounded-lg bg-rose-primary px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-dark active:scale-95"
        >
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
