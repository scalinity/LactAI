import { useState, useRef, useCallback, type DragEvent } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

interface PhotoUploaderProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

export default function PhotoUploader({
  onFilesSelected,
  className,
}: PhotoUploaderProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (files.length > 0) onFilesSelected(files);
    },
    [onFilesSelected],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) onFilesSelected(files);
    e.target.value = "";
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
        dragging
          ? "border-rose-primary bg-rose-primary/5"
          : "border-plum/20 bg-white hover:border-rose-primary/50 hover:bg-cream",
        className,
      )}
    >
      <div className="rounded-full bg-rose-primary/10 p-3">
        <Upload className="h-6 w-6 text-rose-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-plum">
          Drop photos here or click to select
        </p>
        <p className="mt-1 text-xs text-plum/40">Supports JPG, PNG, HEIC</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
