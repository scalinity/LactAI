import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Unit } from "@/types/common";

interface AppState {
  hasCompletedOnboarding: boolean;
  preferredUnit: "mL" | "oz";
  lastBackupPrompt: number | null;
  setHasCompletedOnboarding: (value: boolean) => void;
  setPreferredUnit: (unit: "mL" | "oz") => void;
  setLastBackupPrompt: (timestamp: number) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      preferredUnit: "mL",
      lastBackupPrompt: null,
      setHasCompletedOnboarding: (value) =>
        set({ hasCompletedOnboarding: value }),
      setPreferredUnit: (unit) => set({ preferredUnit: unit }),
      setLastBackupPrompt: (timestamp) => set({ lastBackupPrompt: timestamp }),
      reset: () =>
        set({
          hasCompletedOnboarding: false,
          preferredUnit: "mL",
          lastBackupPrompt: null,
        }),
    }),
    {
      name: "app-storage",
    },
  ),
);
