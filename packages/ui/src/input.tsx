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
          <div className="absolute left-3 flex items-center pointer-events-none text-muted">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full rounded-md border bg-surface px-3 py-1.5 text-xs text-primary shadow-xs transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
            leftIcon ? "pl-9" : "",
            rightIcon ? "pr-9" : "",
            error
              ? "border-danger focus-visible:ring-danger text-danger focus-visible:border-danger"
              : "border-strong focus-visible:border-focus focus-visible:ring-focus",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 flex items-center text-muted">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
