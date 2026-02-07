import { db } from "@/db";
import { useChatStore } from "@/stores/useChatStore";
import { useAppStore } from "@/stores/useAppStore";
import { streamChatMessage, generateChatTitle, generateImage } from "@/lib/api";
import { buildChatContext } from "@/lib/build-chat-context";
import type { ChatMessage, ChatImageData } from "@/types/chat";
import toast from "react-hot-toast";
import { useEffect, useRef } from "react";

function stripThinkTags(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

const IMAGE_GEN_PATTERNS = [
  /\b(create|make|generate|draw|design)\b.*\b(infographic|visual|image|picture|graphic|chart|poster|card)\b/i,
  /\b(infographic|visual summary|visual recap|visual breakdown)\b/i,
  /\b(visuali[sz]e)\b/i,
];

function isImageGenerationRequest(content: string): boolean {
  return IMAGE_GEN_PATTERNS.some((pattern) => pattern.test(content));
}

export function truncateTitle(text: string): string {
  return text.slice(0, 50) + (text.length > 50 ? "..." : "");
}

export function useChatActions() {
  const { activeThreadId, setActiveThread, setStreaming, setStreamingContent } =
    useChatStore();

  // Declare ref at the top before first use
  const abortControllerRef = useRef<AbortController | null>(null);

  const createThread = async (initialMessage?: string): Promise<number> => {
    const title = initialMessage
      ? truncateTitle(initialMessage)
      : "New conversation";
    const id = await db.chat_threads.add({
      created_at: new Date(),
      title,
    });
    setActiveThread(id as number);
    return id as number;
  };

  const sendMessage = async (
    content: string,
    image?: ChatImageData,
    threadId?: number,
  ): Promise<void> => {
    const resolvedThreadId = threadId ?? activeThreadId;
    if (!resolvedThreadId) return;

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    await db.chat_messages.add({
      thread_id: resolvedThreadId,
      role: "user",
      content,
      created_at: new Date(),
      image,
    });

    setStreaming(true);
    setStreamingContent("");
    try {
      // Read preferred unit from store. If persist middleware hasn't
      // rehydrated yet, fall back to localStorage as source of truth.
      let preferredUnit = useAppStore.getState().preferredUnit;
      if (!useAppStore.persist.hasHydrated()) {
        try {
          const raw = localStorage.getItem("app-storage");
          if (raw) {
            const stored = JSON.parse(raw)?.state?.preferredUnit;
            if (stored === "ml" || stored === "oz") {
              preferredUnit = stored;
            }
          }
        } catch {
          // Ignore parse errors, use store value
        }
      }

      const chatContext = await buildChatContext(preferredUnit);

      // --- Image generation branch ---
      // Skip when user attached a reference image — our API is text-to-image only
      let imageGenHandled = false;
      if (isImageGenerationRequest(content) && !image) {
        try {
          setStreamingContent("Creating your visual...");

          const result = await generateImage(
            content,
            {
              data_summary: chatContext.data_summary,
              preferred_unit: preferredUnit,
            },
            abortControllerRef.current.signal,
          );

          const validMimeTypes = new Set([
            "image/jpeg",
            "image/png",
            "image/webp",
          ]);
          const responseText = "Here's your visual:";
          await db.chat_messages.add({
            thread_id: resolvedThreadId,
            role: "assistant",
            content: responseText,
            created_at: new Date(),
            image: {
              base64: result.image_base64,
              mime_type: validMimeTypes.has(result.mime_type)
                ? (result.mime_type as ChatImageData["mime_type"])
                : "image/png",
            },
          });

          // Generate title
          const thread = await db.chat_threads.get(resolvedThreadId);
          const fallbackTitle = truncateTitle(content);
          if (
            thread &&
            (thread.title === "New conversation" ||
              thread.title === fallbackTitle)
          ) {
            generateChatTitle(content, responseText)
              .then((title) =>
                db.chat_threads.update(resolvedThreadId, { title }),
              )
              .catch((err) => {
                console.warn("Title generation failed:", err);
              });
          }

          setStreamingContent("");
          imageGenHandled = true;
        } catch (imgErr) {
          // Rethrow aborts so the outer catch handles them
          if (imgErr instanceof Error && imgErr.name === "AbortError") {
            throw imgErr;
          }
          console.warn(
            "Image generation failed, falling back to chat:",
            imgErr,
          );
          setStreamingContent("");
          // Fall through to normal chat branch
        }
      }

      if (!imageGenHandled) {
        // --- Normal chat branch ---
        const history = await db.chat_messages
          .where("thread_id")
          .equals(resolvedThreadId)
          .sortBy("created_at");

        // Server schema caps at 11 messages; keep the most recent 10
        const trimmed = history.length > 10 ? history.slice(-10) : history;

        // Only include image on the last user message to avoid bloating payload
        let lastImageIdx = -1;
        for (let i = trimmed.length - 1; i >= 0; i--) {
          if (trimmed[i].image) {
            lastImageIdx = i;
            break;
          }
        }

        const messages = trimmed.map((m: ChatMessage, idx: number) => {
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

        console.info(
          "[Chat] Building context with preferredUnit:",
          preferredUnit,
        );

        await streamChatMessage(
          messages,
          {
            onChunk: (fullText) => {
              setStreamingContent(stripThinkTags(fullText));
            },
            onDone: async (fullText) => {
              try {
                const responseText = stripThinkTags(fullText);

                const hasRedFlags =
                  responseText
                    .toLowerCase()
                    .includes("please contact your healthcare provider") ||
                  responseText.toLowerCase().includes("emergency services");

                const flags: ChatMessage["flags"] = [];
                if (hasRedFlags) flags.push("medical_caution");

                await db.chat_messages.add({
                  thread_id: resolvedThreadId,
                  role: "assistant",
                  content: responseText,
                  created_at: new Date(),
                  flags: flags.length > 0 ? flags : undefined,
                });

                // Generate title after first exchange in a thread
                const thread = await db.chat_threads.get(resolvedThreadId);
                const fallbackTitle = truncateTitle(content);
                if (
                  thread &&
                  (thread.title === "New conversation" ||
                    thread.title === fallbackTitle)
                ) {
                  generateChatTitle(content, responseText)
                    .then((title) =>
                      db.chat_threads.update(resolvedThreadId, { title }),
                    )
                    .catch((err) => {
                      console.warn("Title generation failed:", err);
                    });
                }
              } catch (e) {
                console.warn("Failed to save assistant message:", e);
                toast.error("Response received but failed to save");
              } finally {
                setStreamingContent("");
              }
            },
            onError: (error) => {
              toast.error(error.message);
            },
          },
          {
            data_summary: chatContext.data_summary,
            session_count: chatContext.session_count,
            preferred_unit: preferredUnit,
            thread_summaries: chatContext.thread_summaries,
          },
          abortControllerRef.current.signal,
        );
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
