import { create } from "zustand";
import type { Unit, Side, SessionType } from "@/types/common";
import { useAppStore } from "./useAppStore";

interface SessionFormState {
  amount: string;
  unit: Unit;
  timestamp: Date;
  side: Side | null;
  sessionType: SessionType;
  durationMin: string;
  notes: string;
  setField: <K extends keyof Omit<SessionFormState, "setField" | "reset">>(
    key: K,
    value: SessionFormState[K],
  ) => void;
  reset: () => void;
}

const initialState = {
  amount: "",
  unit: "ml" as Unit,
  timestamp: new Date(),
  side: null as Side | null,
  sessionType: "feeding" as SessionType,
  durationMin: "",
  notes: "",
};

export const useSessionFormStore = create<SessionFormState>((set) => ({
  ...initialState,
  setField: (key, value) => set({ [key]: value }),
  reset: () =>
    set({
      ...initialState,
      timestamp: new Date(),
      unit: useAppStore.getState().preferredUnit ?? "ml",
    }),
}));
