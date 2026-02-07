import type { ChatMessage } from "@/types/chat";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import CautionFlag from "./CautionFlag";

function parseInline(text: string, keyPrefix: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`${keyPrefix}-${match.index}`}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^\s*(#{1,4})\s+(.+)$/);

    if (headingMatch) {
      const content = parseInline(headingMatch[2], i);
      result.push(
        <strong key={`h-${i}`} className="block mt-2 text-[0.94em]">
          {content}
        </strong>,
      );
    } else {
      result.push(<span key={`l-${i}`}>{parseInline(line, i)}</span>);
    }

    if (i < lines.length - 1) {
      result.push(<br key={`br-${i}`} />);
    }
  }

  return result;
}

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
            : "bg-surface text-plum shadow-sm border border-plum/5 rounded-bl-md",
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
          <div className="whitespace-pre-wrap">
            {parseMarkdown(message.content)}
          </div>
        )}
      </div>
      <span className="px-1 text-[10px] text-plum/30">
        {formatTime(message.created_at)}
      </span>
    </div>
  );
}
