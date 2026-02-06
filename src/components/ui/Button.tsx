import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import Spinner from "./Spinner";

const variantClasses = {
  primary:
    "bg-rose-primary text-white shadow-sm hover:bg-[#d48eae] hover:shadow-md active:bg-[#c07d9d] active:shadow-none active:scale-[0.98]",
  secondary:
    "bg-transparent border border-rose-primary/60 text-rose-primary hover:bg-rose-primary/10 hover:border-rose-primary active:bg-rose-primary/20 active:scale-[0.98]",
  ghost: "bg-transparent text-plum hover:bg-plum/5 active:bg-plum/10 active:scale-[0.98]",
  danger:
    "bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md active:bg-red-700 active:shadow-none active:scale-[0.98]",
} as const;

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-2xl",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  loading?: boolean;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-primary/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
