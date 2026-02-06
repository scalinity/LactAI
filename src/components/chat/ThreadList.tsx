import React from "react";
import { useChatThreads } from "@/db/hooks";
import { useChatStore } from "@/stores/useChatStore";
import { useChatActions } from "@/hooks/useChatMessages";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { Plus, Trash2 } from "lucide-react";

export default function ThreadList() {
  const threads = useChatThreads();
  const { activeThreadId, setActiveThread } = useChatStore();
  const { createThread, deleteThread } = useChatActions();

  const handleNewChat = async () => {
    await createThread();
  };

  const handleDelete = async (e: React.MouseEvent, threadId: number) => {
    e.stopPropagation();
    await deleteThread(threadId);
  };

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleNewChat}
        className="w-full"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </Button>
      {threads?.map((thread) => (
        <div
          key={thread.id}
          onClick={() => setActiveThread(thread.id!)}
          className={cn(
            "group relative w-full cursor-pointer rounded-xl px-3 py-2.5 text-left transition-colors",
            activeThreadId === thread.id
              ? "bg-rose-primary/10 border border-rose-primary/30"
              : "bg-white border border-plum/5 hover:bg-plum/[0.02]",
          )}
        >
          <p className="truncate pr-6 text-sm font-medium text-plum">
            {thread.title}
          </p>
          <p className="text-[10px] text-plum/40 mt-0.5">
            {formatDate(thread.created_at)}
          </p>
          <button
            type="button"
            onClick={(e) => handleDelete(e, thread.id!)}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg text-plum/20 opacity-0 transition-all hover:bg-rose-primary/10 hover:text-rose-primary group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
