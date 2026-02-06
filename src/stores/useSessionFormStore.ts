import { create } from "zustand";
import type { Unit, Side } from "@/types/common";

interface SessionFormState {
  amount: string;
  unit: Unit;
  timestamp: Date;
  side: Side | null;
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
  durationMin: "",
  notes: "",
};

export const useSessionFormStore = create<SessionFormState>((set) => ({
  ...initialState,
  setField: (key, value) => set({ [key]: value }),
  reset: () => set({ ...initialState, timestamp: new Date() }),
}));
