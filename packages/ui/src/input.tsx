import * as React from "react";
import { cn } from "./utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error = false, leftIcon, rightIcon, disabled, type = "text", ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-2.5 flex items-center pointer-events-none text-muted dark:text-slate-500">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-8 w-full rounded-md border bg-surface dark:bg-slate-900/70 px-3 py-1 text-xs text-primary dark:text-slate-100 shadow-xs transition-colors duration-100 file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-surface-muted dark:disabled:bg-slate-800/50 disabled:text-muted",
            leftIcon ? "pl-8" : "",
            rightIcon ? "pr-8" : "",
            error
              ? "border-danger/70 dark:border-rose-800 focus-visible:border-danger focus-visible:ring-danger/15"
              : "border-subtle dark:border-slate-800 hover:border-strong dark:hover:border-slate-700 focus-visible:border-focus focus-visible:ring-focus/10 dark:focus-visible:ring-focus/20",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-2.5 flex items-center text-muted dark:text-slate-500">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
