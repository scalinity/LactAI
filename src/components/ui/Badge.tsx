import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const variantClasses = {
  default: "bg-plum/[0.07] text-plum/70",
  success: "bg-sage/15 text-sage-dark",
  warning: "bg-amber-100/80 text-amber-700",
  error: "bg-red-100/80 text-red-600",
  rose: "bg-rose-primary/15 text-rose-dark",
} as const;

interface BadgeProps {
  variant?: keyof typeof variantClasses;
  children: ReactNode;
  className?: string;
}

export default function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
