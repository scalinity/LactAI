import { db } from "@/db";
import { useChatStore } from "@/stores/useChatStore";
import { streamChatMessage } from "@/lib/api";
import type { ChatMessage, ChatImageData } from "@/types/chat";
import toast from "react-hot-toast";
import { useEffect, useRef } from "react";

function stripThinkTags(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export function useChatActions() {
  const { activeThreadId, setActiveThread, setStreaming, setStreamingContent } =
    useChatStore();

  const createThread = async (initialMessage?: string): Promise<number> => {
    const title = initialMessage
      ? initialMessage.slice(0, 50) + (initialMessage.length > 50 ? "..." : "")
      : "New conversation";
    const id = await db.chat_threads.add({
      created_at: new Date(),
      title,
    });
    setActiveThread(id as number);
    return id as number;
  };

  const sendMessage = async (content: string, image?: ChatImageData): Promise<void> => {
    if (!activeThreadId) return;

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    await db.chat_messages.add({
      thread_id: activeThreadId,
      role: "user",
      content,
      created_at: new Date(),
      image,
    });

    setStreaming(true);
    setStreamingContent("");
    try {
      const history = await db.chat_messages
        .where("thread_id")
        .equals(activeThreadId)
        .sortBy("created_at");

      // Only include image on the last user message to avoid bloating payload
      const lastImageIdx = history.findLastIndex((m) => m.image);

      const messages = history.map((m: ChatMessage, idx: number) => {
        if (m.image && idx === lastImageIdx) {
          const parts: Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          > = [];
          if (m.content) {
            parts.push({ type: "text", text: m.content });
          }
          parts.push({
            type: "image_url",
            image_url: {
              url: `data:${m.image.mime_type};base64,${m.image.base64}`,
            },
          });
          return {
            role: m.role as "user" | "assistant",
            content: parts,
          };
        }
        return {
          role: m.role as "user" | "assistant",
          content: m.content,
        };
      });

      for await (const chunk of streamChatMessage(messages, {
        signal: abortControllerRef.current.signal,
      })) {
        setStreamingContent(stripThinkTags(chunk));
      }
    } catch (err) {
      if (err instanceof Error && (err as any).name === "AbortError") {
        // Request was aborted, ignore
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to send message";
      toast.error(message);
    } finally {
      abortControllerRef.current = null;
      setStreaming(false);
      setStreamingContent("");
    }
  };

  const deleteThread = async (threadId: number): Promise<void> => {
    await db.chat_messages.where("thread_id").equals(threadId).delete();
    await db.chat_threads.delete(threadId);
    if (activeThreadId === threadId) setActiveThread(null);
  };

  const deleteAllHistory = async (): Promise<void> => {
    await db.chat_messages.clear();
    await db.chat_threads.clear();
    setActiveThread(null);
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { createThread, sendMessage, deleteThread, deleteAllHistory };
}
