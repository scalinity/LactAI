import { useMemo } from "react";
import type { ChatMessage, ChatImageData } from "@/types/chat";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
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

function GeneratedImage({ image }: { image: ChatImageData }) {
  const { t } = useTranslation();
  const src = useMemo(
    () => `data:${image.mime_type};base64,${image.base64}`,
    [image.mime_type, image.base64],
  );

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = `claudiaflow-${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="mt-2 relative group">
      <img
        src={src}
        alt="Generated infographic"
        className="w-full max-w-md rounded-xl object-contain"
      />
      <button
        type="button"
        onClick={handleDownload}
        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-plum/70 text-white text-xs px-2.5 py-1.5 rounded-lg backdrop-blur-sm"
      >
        {t("common.save")}
      </button>
    </div>
  );
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasCaution = message.flags?.includes("medical_caution");
  const isGeneratedImage = !isUser && message.image;

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
          "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-rose-primary/15 text-plum rounded-br-md"
            : "bg-surface text-plum shadow-sm border border-plum/5 rounded-bl-md",
        )}
      >
        {/* User-attached image: show above text */}
        {isUser && message.image && (
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
        {/* AI-generated image: show below text with download */}
        {isGeneratedImage && <GeneratedImage image={message.image!} />}
      </div>
      <span className="px-1 text-[10px] text-plum/30">
        {formatTime(message.created_at)}
      </span>
    </div>
  );
}
