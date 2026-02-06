import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useChatActions } from "./useChatMessages";
import { db } from "@/db";
import { useChatStore } from "@/stores/useChatStore";
import * as api from "@/lib/api";
import toast from "react-hot-toast";

vi.mock("@/lib/api");
vi.mock("react-hot-toast");

describe("useChatActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      activeThreadId: null,
      isStreaming: false,
      streamingContent: "",
    });
  });

  describe("createThread", () => {
    it("should create a new thread with default title", async () => {
      const { result } = renderHook(() => useChatActions());

      let threadId: number;
      await act(async () => {
        threadId = await result.current.createThread();
      });

      const thread = await db.chat_threads.get(threadId!);
      expect(thread).toBeDefined();
      expect(thread?.title).toBe("New conversation");
      expect(useChatStore.getState().activeThreadId).toBe(threadId);
    });

    it("should create a new thread with custom title", async () => {
      const { result } = renderHook(() => useChatActions());

      let threadId: number;
      await act(async () => {
        threadId = await result.current.createThread("Custom Title");
      });

      const thread = await db.chat_threads.get(threadId!);
      expect(thread?.title).toBe("Custom Title");
    });

    it("should set the new thread as active", async () => {
      const { result } = renderHook(() => useChatActions());

      await act(async () => {
        await result.current.createThread();
      });

      expect(useChatStore.getState().activeThreadId).toBeGreaterThan(0);
    });
  });

  describe("sendMessage", () => {
    it("should not send message if no active thread", async () => {
      const { result } = renderHook(() => useChatActions());

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const messages = await db.chat_messages.toArray();
      expect(messages).toHaveLength(0);
    });

    it("should save user message to database", async () => {
      const { result } = renderHook(() => useChatActions());

      let threadId: number;
      await act(async () => {
        threadId = await result.current.createThread();
      });

      vi.mocked(api.streamChatMessage).mockImplementation(
        async (_, callbacks) => {
          callbacks.onDone("Assistant response");
        },
      );

      await act(async () => {
        await result.current.sendMessage("Hello");
      });

      const messages = await db.chat_messages
        .where("thread_id")
        .equals(threadId!)
        .toArray();

      const userMsg = messages.find((m) => m.role === "user");
      expect(userMsg).toBeDefined();
      expect(userMsg?.content).toBe("Hello");
    });

    it("should handle streaming with onChunk callback", async () => {
      const { result } = renderHook(() => useChatActions());

      await act(async () => {
        await result.current.createThread();
      });

      vi.mocked(api.streamChatMessage).mockImplementation(
        async (_, callbacks) => {
          callbacks.onChunk("Partial ");
          callbacks.onChunk("Partial response");
          callbacks.onDone("Partial response");
        },
      );

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      await waitFor(() => {
        expect(useChatStore.getState().isStreaming).toBe(false);
      });
    });

    it("should strip think tags from streaming content", async () => {
      const { result } = renderHook(() => useChatActions());

      let threadId: number;
      await act(async () => {
        threadId = await result.current.createThread();
      });

      vi.mocked(api.streamChatMessage).mockImplementation(
        async (_, callbacks) => {
          callbacks.onChunk("<think>reasoning</think>Answer");
          callbacks.onDone("<think>reasoning</think>Answer");
        },
      );

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      await waitFor(async () => {
        const messages = await db.chat_messages
          .where("thread_id")
          .equals(threadId!)
          .toArray();
        const assistantMsg = messages.find((m) => m.role === "assistant");
        expect(assistantMsg?.content).toBe("Answer");
      });
    });

    it("should set streaming state during message send", async () => {
      const { result } = renderHook(() => useChatActions());

      await act(async () => {
        await result.current.createThread();
      });

      vi.mocked(api.streamChatMessage).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined);
            }, 100);
          }),
      );

      await act(async () => {
        const sendPromise = result.current.sendMessage("Test");
        // Check streaming state while promise is pending
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(useChatStore.getState().isStreaming).toBe(true);
        await sendPromise;
      });

      // Should not be streaming after completion
      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it("should handle message with image data", async () => {
      const { result } = renderHook(() => useChatActions());

      let threadId: number;
      await act(async () => {
        threadId = await result.current.createThread();
      });

      const imageData = {
        base64: "base64data",
        mime_type: "image/png",
      };

      vi.mocked(api.streamChatMessage).mockImplementation(
        async (_, callbacks) => {
          callbacks.onDone("Response");
        },
      );

      await act(async () => {
        await result.current.sendMessage("Test", imageData);
      });

      const messages = await db.chat_messages
        .where("thread_id")
        .equals(threadId!)
        .toArray();

      const userMsg = messages.find((m) => m.role === "user");
      expect(userMsg?.image).toEqual(imageData);
    });

    it("should flag medical caution in response", async () => {
      const { result } = renderHook(() => useChatActions());

      let threadId: number;
      await act(async () => {
        threadId = await result.current.createThread();
      });

      vi.mocked(api.streamChatMessage).mockImplementation(
        async (_, callbacks) => {
          callbacks.onDone(
            "This is serious. Please contact your healthcare provider immediately.",
          );
        },
      );

      await act(async () => {
        await result.current.sendMessage("Help");
      });

      const messages = await db.chat_messages
        .where("thread_id")
        .equals(threadId!)
        .toArray();

      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.flags).toContain("medical_caution");
    });

    it("should flag emergency services in response", async () => {
      const { result } = renderHook(() => useChatActions());

      await act(async () => {
        await result.current.createThread();
      });

      vi.mocked(api.streamChatMessage).mockImplementation(
        async (_, callbacks) => {
          callbacks.onDone("Call emergency services now!");
        },
      );

      await act(async () => {
        await result.current.sendMessage("Help");
      });

      const messages = await db.chat_messages.toArray();
      const assistantMsg = messages.find((m) => m.role === "assistant");
      expect(assistantMsg?.flags).toContain("medical_caution");
    });

    it("should show error toast on API failure", async () => {
      const { result } = renderHook(() => useChatActions());

      await act(async () => {
        await result.current.createThread();
      });

      vi.mocked(api.streamChatMessage).mockRejectedValue(
        new Error("Network error"),
      );

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(toast.error).toHaveBeenCalledWith("Network error");
      expect(useChatStore.getState().isStreaming).toBe(false);
    });

    it("should clear streaming state on error", async () => {
      const { result } = renderHook(() => useChatActions());

      await act(async () => {
        await result.current.createThread();
      });

      vi.mocked(api.streamChatMessage).mockRejectedValue(new Error("Error"));

      await act(async () => {
        await result.current.sendMessage("Test");
      });

      expect(useChatStore.getState().isStreaming).toBe(false);
      expect(useChatStore.getState().streamingContent).toBe("");
    });
  });

  describe("deleteThread", () => {
    it("should delete thread and associated messages", async () => {
      const { result } = renderHook(() => useChatActions());

      let threadId: number;
      await act(async () => {
        threadId = await result.current.createThread();
      });

      await db.chat_messages.add({
        thread_id: threadId!,
        role: "user",
        content: "Test message",
        created_at: new Date(),
      });

      await act(async () => {
        await result.current.deleteThread(threadId!);
      });

      const thread = await db.chat_threads.get(threadId!);
      const messages = await db.chat_messages
        .where("thread_id")
        .equals(threadId!)
        .toArray();

      expect(thread).toBeUndefined();
      expect(messages).toHaveLength(0);
    });

    it("should clear active thread if deleting active thread", async () => {
      const { result } = renderHook(() => useChatActions());

      let threadId: number;
      await act(async () => {
        threadId = await result.current.createThread();
      });

      expect(useChatStore.getState().activeThreadId).toBe(threadId!);

      await act(async () => {
        await result.current.deleteThread(threadId!);
      });

      expect(useChatStore.getState().activeThreadId).toBeNull();
    });

    it("should not clear active thread if deleting different thread", async () => {
      const { result } = renderHook(() => useChatActions());

      let threadId1: number;
      let threadId2: number;

      await act(async () => {
        threadId1 = await result.current.createThread();
        threadId2 = await result.current.createThread();
      });

      expect(useChatStore.getState().activeThreadId).toBe(threadId2!);

      await act(async () => {
        await result.current.deleteThread(threadId1!);
      });

      expect(useChatStore.getState().activeThreadId).toBe(threadId2!);
    });
  });

  describe("deleteAllHistory", () => {
    it("should clear all threads and messages", async () => {
      const { result } = renderHook(() => useChatActions());

      await act(async () => {
        await result.current.createThread("Thread 1");
        await result.current.createThread("Thread 2");
      });

      await act(async () => {
        await result.current.deleteAllHistory();
      });

      const threads = await db.chat_threads.toArray();
      const messages = await db.chat_messages.toArray();

      expect(threads).toHaveLength(0);
      expect(messages).toHaveLength(0);
      expect(useChatStore.getState().activeThreadId).toBeNull();
    });
  });
});
