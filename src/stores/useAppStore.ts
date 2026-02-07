import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Unit } from "@/types/common";
import type { Locale } from "@/i18n";

export type GoalType = "sessions" | "volume";

interface AppState {
  hasCompletedOnboarding: boolean;
  preferredUnit: Unit;
  lastBackupPrompt: number | null;
  locale: Locale;
  dailyGoalType: GoalType;
  dailyGoalTarget: number;
  setHasCompletedOnboarding: (value: boolean) => void;
  setPreferredUnit: (unit: Unit) => void;
  setLastBackupPrompt: (timestamp: number) => void;
  setLocale: (locale: Locale) => void;
  setDailyGoal: (type: GoalType, target: number) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      preferredUnit: "ml",
      lastBackupPrompt: Date.now(),
      locale: "en",
      dailyGoalType: "sessions" as GoalType,
      dailyGoalTarget: 8,
      setHasCompletedOnboarding: (value) =>
        set({ hasCompletedOnboarding: value }),
      setPreferredUnit: (unit) => set({ preferredUnit: unit }),
      setLastBackupPrompt: (timestamp) => set({ lastBackupPrompt: timestamp }),
      setLocale: (locale) => set({ locale }),
      setDailyGoal: (type, target) =>
        set({ dailyGoalType: type, dailyGoalTarget: target }),
      reset: () =>
        set({
          hasCompletedOnboarding: false,
          preferredUnit: "ml",
          lastBackupPrompt: null,
          locale: "en",
          dailyGoalType: "sessions" as GoalType,
          dailyGoalTarget: 8,
        }),
    }),
    {
      name: "app-storage",
    },
  ),
);
