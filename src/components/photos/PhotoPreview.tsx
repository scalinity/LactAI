import type { AIStatus } from "@/types/upload";
import Spinner from "@/components/ui/Spinner";
import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoPreviewProps {
  thumbnailUrl: string;
  filename: string;
  status: AIStatus;
  className?: string;
}

export default function PhotoPreview({
  thumbnailUrl,
  filename,
  status,
  className,
}: PhotoPreviewProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-plum/10 bg-surface p-2",
        className,
      )}
    >
      <img
        src={thumbnailUrl}
        alt={filename}
        className="h-12 w-12 rounded-lg object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-plum">{filename}</p>
        <p className="text-xs text-plum/40 capitalize">{status}</p>
      </div>
      <div className="shrink-0">
        {status === "processing" && <Spinner size="sm" />}
        {status === "done" && <Check className="h-5 w-5 text-sage" />}
        {status === "failed" && (
          <AlertTriangle className="h-5 w-5 text-red-500" />
        )}
      </div>
    </div>
  );
}
