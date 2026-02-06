import { useRef, useEffect, useCallback } from "react";
import { useChatMessages } from "@/db/hooks";
import { useChatStore } from "@/stores/useChatStore";
import { useChatActions } from "@/hooks/useChatMessages";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { MessageCircle } from "lucide-react";
import type { ChatImageData } from "@/types/chat";

export default function ChatContainer() {
  const { activeThreadId, isStreaming, streamingContent } = useChatStore();
  const messages = useChatMessages(activeThreadId ?? undefined);
  const { sendMessage, createThread } = useChatActions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const checkNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  const handleSend = async (content: string, image?: ChatImageData) => {
    if (!activeThreadId) {
      await createThread(content);
    }
    await sendMessage(content, image);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col">
      <div
        ref={scrollRef}
        onScroll={checkNearBottom}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-3"
      >
        {!messages || messages.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="Start a conversation"
            description="Ask questions about your data, get tips, or just chat."
          />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        {isStreaming && streamingContent && (
          <div className="flex flex-col gap-1 items-start">
            <div className="max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-white text-plum shadow-sm border border-plum/5 rounded-bl-md">
              {streamingContent}
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-rose-primary/60 animate-pulse rounded-sm align-text-bottom" />
            </div>
          </div>
        )}
        {isStreaming && !streamingContent && (
          <div className="flex items-center gap-2 px-2">
            <Spinner size="sm" />
            <span className="text-xs text-plum/40">Thinking...</span>
          </div>
        )}
      </div>
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
