import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, Plus, X } from "lucide-react";
import type { ChatImageData } from "@/types/chat";
import PromptStarters from "./PromptStarters";
import toast from "react-hot-toast";
import { useTranslation } from "@/i18n";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export interface ExternalPrompt {
  text: string;
  key: number;
}

interface ChatInputProps {
  onSend: (message: string, image?: ChatImageData) => void;
  disabled?: boolean;
  className?: string;
  externalPrompt?: ExternalPrompt | null;
  showStarters?: boolean;
  onStarterSelect?: (prompt: string) => void;
}

export default function ChatInput({
  onSend,
  disabled = false,
  className,
  externalPrompt,
  showStarters = false,
  onStarterSelect,
}: ChatInputProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [image, setImage] = useState<ChatImageData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevImagePreviewRef = useRef<string | null>(null);

  // Cleanup previous image preview URL when it changes, and on unmount
  useEffect(() => {
    // Revoke the previous URL if it changed
    if (
      prevImagePreviewRef.current &&
      prevImagePreviewRef.current !== imagePreview
    ) {
      URL.revokeObjectURL(prevImagePreviewRef.current);
    }
    prevImagePreviewRef.current = imagePreview;

    return () => {
      if (prevImagePreviewRef.current) {
        URL.revokeObjectURL(prevImagePreviewRef.current);
        prevImagePreviewRef.current = null;
      }
    };
  }, [imagePreview]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, []);

  // Handle external text injection (from prompt starters).
  // Keyed by externalPrompt.key so the same prompt can be selected twice.
  useEffect(() => {
    if (!externalPrompt) return;
    setText(externalPrompt.text);

    // Focus the textarea and try to select the first [placeholder]
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      adjustHeight();

      const match = externalPrompt.text.match(/\[([^\]]+)\]/);
      if (match && match.index !== undefined) {
        el.setSelectionRange(match.index, match.index + match[0].length);
      }
    });
  }, [externalPrompt?.key, adjustHeight]);

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(t("chat.imageTooLarge"));
        return;
      }

      const mime = file.type as ChatImageData["mime_type"];
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
        toast.error(t("chat.unsupportedFormat"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        setImage({ base64, mime_type: mime });
        setImagePreview(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);

      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [t],
  );

  const clearImage = useCallback(() => {
    // URL cleanup handled by useEffect tracking prevImagePreviewRef
    setImage(null);
    setImagePreview(null);
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !image) || disabled) return;
    onSend(trimmed || "What's in this image?", image ?? undefined);
    setText("");
    clearImage();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = (text.trim() || image) && !disabled;

  return (
    <div className={cn("bg-cream p-3 pb-6 border-t border-plum/10", className)}>
      {showStarters && onStarterSelect && (
        <PromptStarters onSelect={onStarterSelect} />
      )}
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 inline-flex items-start gap-1">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Attached"
              className="h-20 w-20 rounded-lg object-cover border border-plum/10"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-plum text-white shadow-sm hover:bg-plum/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Image upload button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="shrink-0 rounded-xl p-2.5 text-plum/50 transition-colors hover:bg-plum/5 hover:text-plum disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageSelect}
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          id="chat-message-input"
          name="message"
          aria-label="Chat message"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            image ? t("chat.addMessageOrSend") : t("chat.askAnything")
          }
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl bg-surface border border-plum/10 px-3 py-2 text-sm text-plum placeholder:text-plum/40 outline-none focus:ring-2 focus:ring-rose-primary/50 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "shrink-0 rounded-xl p-2.5 transition-colors",
            canSend
              ? "bg-rose-primary text-white hover:bg-[#d48eae]"
              : "bg-plum/10 text-plum/30",
          )}
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
