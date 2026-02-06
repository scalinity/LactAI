import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-plum/80"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "rounded-xl bg-white px-3.5 py-2.5 text-plum placeholder:text-plum/30 outline-none transition-all border border-plum/[0.06] focus:ring-2 focus:ring-rose-primary/40 focus:border-rose-primary/30",
            error && "ring-2 ring-red-400 border-red-400",
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-plum/40">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
