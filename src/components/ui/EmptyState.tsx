import { isValidElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "./Button";

interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return null;
    if (isValidElement(icon)) {
      return <div className="mb-5">{icon}</div>;
    }
    const Icon = icon as LucideIcon;
    return (
      <div className="mb-5 rounded-2xl bg-gradient-to-br from-rose-primary/10 to-rose-light/20 p-5">
        <Icon className="h-8 w-8 text-rose-primary/70" />
      </div>
    );
  };

  return (
    <div
      className={cn(
        "animate-page-enter flex flex-col items-center justify-center py-16 px-4 text-center",
        className,
      )}
    >
      {renderIcon()}
      <h3 className="font-[Nunito] text-lg font-bold text-plum">{title}</h3>
      {description && (
        <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-plum/50">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-5">
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}
