import type { ChatMessage } from "@/types/chat";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import CautionFlag from "./CautionFlag";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasCaution = message.flags?.includes("medical_caution");

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      )}
    >
      {hasCaution && <CautionFlag />}
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-rose-primary/15 text-plum rounded-br-md"
            : "bg-white text-plum shadow-sm border border-plum/5 rounded-bl-md",
        )}
      >
        {message.image && (
          <img
            src={`data:${message.image.mime_type};base64,${message.image.base64}`}
            alt="Shared image"
            className="mb-2 max-h-60 rounded-lg object-contain"
          />
        )}
        {message.content && (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
      </div>
      <span className="px-1 text-[10px] text-plum/30">
        {formatTime(message.created_at)}
      </span>
    </div>
  );
}
