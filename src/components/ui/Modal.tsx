import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150"
    >
      <div
        className={cn(
          "w-full max-w-md rounded-xl bg-surface shadow-lg animate-in zoom-in-95 duration-150",
          className,
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-plum/10 px-4 py-3">
            <h2 className="font-[Nunito] text-lg font-bold text-plum">
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-1 text-plum/50 hover:bg-plum/5 hover:text-plum transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
