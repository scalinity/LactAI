import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useChatStore } from "@/stores/useChatStore";
import { useChatThreads } from "@/db/hooks";
import { useChatActions } from "@/hooks/useChatMessages";
import ThreadList from "@/components/chat/ThreadList";
import ChatContainer from "@/components/chat/ChatContainer";
import EphemeralToggle from "@/components/chat/EphemeralToggle";
import EmptyState from "@/components/ui/EmptyState";
import {
  MessageCircle,
  Plus,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { useTranslation } from "@/i18n";

export default function ChatPage() {
  const { threadId: urlThreadId } = useParams<{ threadId: string }>();
  const { activeThreadId, setActiveThread } = useChatStore();
  const threads = useChatThreads();
  const { createThread } = useChatActions();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation();

  // Sync URL param to store
  useEffect(() => {
    if (urlThreadId) {
      setActiveThread(Number(urlThreadId));
    }
  }, [urlThreadId, setActiveThread]);

  const handleNewThread = async () => {
    await createThread();
    setSidebarOpen(false);
  };

  const isLoading = threads === undefined;

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cream-dark px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-plum shadow-sm transition-colors hover:bg-cream-dark lg:hidden"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeftOpen className="h-5 w-5" />
            )}
          </button>
          <h1 className="font-[Nunito] text-xl font-bold text-plum">
            {t("chat.askClaudiaFlow")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <EphemeralToggle />
          <button
            onClick={handleNewThread}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-primary text-white shadow-sm transition-colors hover:bg-rose-dark"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop: always visible, Mobile: overlay drawer */}
        <div
          className={`absolute inset-y-0 left-0 z-20 w-72 transform border-r border-cream-dark bg-cream transition-transform lg:relative lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-rose-primary border-t-transparent" />
            </div>
          ) : (
            <ThreadList />
          )}
        </div>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-10 bg-plum/20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col">
          {activeThreadId ? (
            <ChatContainer />
          ) : (
            <div className="flex flex-1 items-center justify-center p-4 pb-24">
              <EmptyState
                icon={<MessageCircle className="h-12 w-12 text-plum-light" />}
                title={t("chat.startConversation")}
                description={t("chat.startConversationDescLong")}
              >
                <button
                  onClick={handleNewThread}
                  className="mt-4 rounded-xl bg-rose-primary px-6 py-3 font-[Nunito] font-bold text-white shadow-md transition-transform active:scale-[0.98]"
                >
                  {t("chat.newConversation")}
                </button>
              </EmptyState>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
