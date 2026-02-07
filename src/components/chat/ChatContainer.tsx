import { useRef, useEffect, useCallback, useState } from "react";
import { useChatMessages } from "@/db/hooks";
import { useChatStore } from "@/stores/useChatStore";
import { useChatActions } from "@/hooks/useChatMessages";
import MessageBubble from "./MessageBubble";
import ChatInput, { type ExternalPrompt } from "./ChatInput";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { MessageCircle } from "lucide-react";
import type { ChatImageData } from "@/types/chat";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export default function ChatContainer() {
  const { t } = useTranslation();
  const { activeThreadId, isStreaming, streamingContent } = useChatStore();
  const messages = useChatMessages(activeThreadId ?? undefined);
  const { sendMessage, createThread } = useChatActions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [pendingPrompt, setPendingPrompt] = useState<ExternalPrompt | null>(
    null,
  );

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
    let threadId = activeThreadId;
    if (!threadId) {
      threadId = await createThread(content);
    }
    await sendMessage(content, image, threadId);
  };

  const isEmpty = !messages || messages.length === 0;

  const handlePromptSelect = useCallback((prompt: string) => {
    setPendingPrompt((prev) => ({ text: prompt, key: (prev?.key ?? 0) + 1 }));
  }, []);

  return (
    <div
      className={cn(
        "flex h-[calc(100vh-140px-env(safe-area-inset-bottom)-4rem)] flex-col",
        isEmpty && "justify-center",
      )}
    >
      <div
        ref={scrollRef}
        onScroll={checkNearBottom}
        className={cn(
          "overflow-y-auto px-3 py-4 space-y-3",
          !isEmpty && "flex-1",
        )}
      >
        {isEmpty ? (
          <EmptyState
            icon={MessageCircle}
            title={t("chat.startConversation")}
            description={t("chat.startConversationDesc")}
          />
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}
        {isStreaming && streamingContent && (
          <div className="flex flex-col gap-1 items-start">
            <div className="max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-surface text-plum shadow-sm border border-plum/5 rounded-bl-md">
              {streamingContent}
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-rose-primary/60 animate-pulse rounded-sm align-text-bottom" />
            </div>
          </div>
        )}
        {isStreaming && !streamingContent && (
          <div className="flex items-center gap-2 px-2">
            <Spinner size="sm" />
            <span className="text-xs text-plum/40">{t("chat.thinking")}</span>
          </div>
        )}
      </div>
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        externalPrompt={pendingPrompt}
        className="mt-auto"
        showStarters={isEmpty}
        onStarterSelect={handlePromptSelect}
      />
    </div>
  );
}
