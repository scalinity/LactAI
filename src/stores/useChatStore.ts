import { create } from "zustand";

interface ChatState {
  activeThreadId: number | null;
  ephemeralMode: boolean;
  isStreaming: boolean;
  streamingThreadId: number | null;
  streamingContent: string;
  setActiveThread: (id: number | null) => void;
  toggleEphemeral: () => void;
  setStreaming: (v: boolean, threadId?: number | null) => void;
  setStreamingContent: (content: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeThreadId: null,
  ephemeralMode: false,
  isStreaming: false,
  streamingThreadId: null,
  streamingContent: "",
  setActiveThread: (activeThreadId) => set({ activeThreadId }),
  toggleEphemeral: () => set((s) => ({ ephemeralMode: !s.ephemeralMode })),
  setStreaming: (isStreaming, threadId) =>
    set({
      isStreaming,
      streamingThreadId: isStreaming ? (threadId ?? null) : null,
    }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),
}));
