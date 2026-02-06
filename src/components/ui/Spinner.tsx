import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
} as const;

interface SpinnerProps {
  size?: keyof typeof sizeClasses;
  className?: string;
}

export default function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-rose-primary border-t-transparent",
        sizeClasses[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );
}
