import { create } from "zustand";

interface ChatState {
  activeThreadId: number | null;
  ephemeralMode: boolean;
  isStreaming: boolean;
  streamingContent: string;
  setActiveThread: (id: number | null) => void;
  toggleEphemeral: () => void;
  setStreaming: (v: boolean) => void;
  setStreamingContent: (content: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeThreadId: null,
  ephemeralMode: false,
  isStreaming: false,
  streamingContent: "",
  setActiveThread: (activeThreadId) => set({ activeThreadId }),
  toggleEphemeral: () => set((s) => ({ ephemeralMode: !s.ephemeralMode })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
}));
