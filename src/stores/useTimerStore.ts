import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimerState {
  isRunning: boolean;
  startedAt: number | null;
  start: () => void;
  stop: () => number;
  reset: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      startedAt: null,
      start: () => set({ isRunning: true, startedAt: Date.now() }),
      stop: () => {
        const { startedAt } = get();
        const elapsed = startedAt
          ? Math.round((Date.now() - startedAt) / 60000)
          : 0;
        set({ isRunning: false, startedAt: null });
        return elapsed;
      },
      reset: () => set({ isRunning: false, startedAt: null }),
    }),
    {
      name: "timer-storage",
    },
  ),
);
