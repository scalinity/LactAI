import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Unit } from "@/types/common";
import type { Locale } from "@/i18n";

interface AppState {
  hasCompletedOnboarding: boolean;
  preferredUnit: Unit;
  lastBackupPrompt: number | null;
  locale: Locale;
  setHasCompletedOnboarding: (value: boolean) => void;
  setPreferredUnit: (unit: Unit) => void;
  setLastBackupPrompt: (timestamp: number) => void;
  setLocale: (locale: Locale) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      preferredUnit: "ml",
      lastBackupPrompt: Date.now(),
      locale: "en",
      setHasCompletedOnboarding: (value) =>
        set({ hasCompletedOnboarding: value }),
      setPreferredUnit: (unit) => set({ preferredUnit: unit }),
      setLastBackupPrompt: (timestamp) => set({ lastBackupPrompt: timestamp }),
      setLocale: (locale) => set({ locale }),
      reset: () =>
        set({
          hasCompletedOnboarding: false,
          preferredUnit: "ml",
          lastBackupPrompt: null,
          locale: "en",
        }),
    }),
    {
      name: "app-storage",
    },
  ),
);
