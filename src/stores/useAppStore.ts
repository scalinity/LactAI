import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Unit } from "@/types/common";

interface AppState {
  hasCompletedOnboarding: boolean;
  preferredUnit: Unit;
  lastBackupPrompt: number | null;
  setHasCompletedOnboarding: (value: boolean) => void;
  setPreferredUnit: (unit: Unit) => void;
  setLastBackupPrompt: (timestamp: number) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      preferredUnit: "ml",
      lastBackupPrompt: null,
      setHasCompletedOnboarding: (value) =>
        set({ hasCompletedOnboarding: value }),
      setPreferredUnit: (unit) => set({ preferredUnit: unit }),
      setLastBackupPrompt: (timestamp) => set({ lastBackupPrompt: timestamp }),
      reset: () =>
        set({
          hasCompletedOnboarding: false,
          preferredUnit: "ml",
          lastBackupPrompt: null,
        }),
    }),
    {
      name: "app-storage",
    },
  ),
);
