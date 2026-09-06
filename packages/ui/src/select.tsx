import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error = false, leftIcon, disabled, children, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-muted z-10">
            {leftIcon}
          </div>
        )}
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full appearance-none rounded-lg border bg-surface hover:bg-surface-muted/40 px-3 py-1.5 pr-8 text-xs font-medium text-primary shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted [&>option]:bg-surface-elevated [&>option]:text-primary [&>optgroup]:bg-surface-elevated [&>optgroup]:text-secondary [&>optgroup]:font-semibold",
            leftIcon ? "pl-9" : "",
            error
              ? "border-danger focus-visible:ring-danger text-danger focus-visible:border-danger"
              : "border-subtle hover:border-strong focus-visible:border-primary",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-2.5 flex items-center pointer-events-none text-muted">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
