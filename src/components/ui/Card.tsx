import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "hover-lift rounded-2xl bg-white shadow-sm border border-plum/[0.04] p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
