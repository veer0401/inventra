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
          <div className="absolute left-2.5 flex items-center pointer-events-none text-muted dark:text-slate-500 z-10">
            {leftIcon}
          </div>
        )}
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-8 w-full appearance-none rounded-md border bg-surface dark:bg-slate-900/70 hover:bg-surface-muted dark:hover:bg-slate-800/50 px-3 py-1 pr-8 text-xs font-medium text-primary dark:text-slate-100 shadow-xs transition-colors duration-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-surface-muted dark:disabled:bg-slate-800/50 disabled:text-muted [&>option]:bg-white dark:[&>option]:bg-slate-900 [&>option]:text-primary dark:[&>option]:text-slate-100 [&>optgroup]:font-semibold",
            leftIcon ? "pl-8" : "",
            error
              ? "border-danger/70 dark:border-rose-800 focus-visible:border-danger focus-visible:ring-danger/15"
              : "border-subtle dark:border-slate-800 hover:border-strong dark:hover:border-slate-700 focus-visible:border-focus focus-visible:ring-focus/10 dark:focus-visible:ring-focus/20",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute right-2.5 flex items-center pointer-events-none text-muted dark:text-slate-500">
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";
