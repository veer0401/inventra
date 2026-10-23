import * as React from "react";
import { cn } from "./utils";
import { Spinner } from "./spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost" | "accent" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors duration-100 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-teal-600/40 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 disabled:active:scale-100 cursor-pointer";

    const variantStyles = {
      primary:
        "bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-fg border border-primary/20 shadow-[0_1px_2px_0_rgba(15,23,42,0.08)]",
      success:
        "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border border-emerald-600/30 shadow-[0_1px_2px_0_rgba(15,23,42,0.06)]",
      accent:
        "bg-accent hover:bg-accent-hover text-accent-fg border border-accent/20 shadow-[0_1px_2px_0_rgba(15,23,42,0.06)]",
      secondary:
        "bg-surface dark:bg-slate-900 text-primary hover:bg-surface-muted dark:hover:bg-slate-800/80 active:bg-surface-muted border border-subtle dark:border-slate-800 shadow-xs hover:border-strong",
      destructive:
        "bg-danger hover:bg-rose-700 active:bg-rose-800 text-white border border-danger/20 shadow-[0_1px_2px_0_rgba(15,23,42,0.06)]",
      outline:
        "bg-transparent text-primary hover:bg-surface-muted dark:hover:bg-slate-800/60 border border-subtle dark:border-slate-700 hover:border-strong",
      ghost:
        "text-secondary hover:text-primary hover:bg-surface-muted dark:hover:bg-slate-800/70 border border-transparent",
    };

    const sizeStyles = {
      sm: "h-7 px-2.5 text-xs rounded gap-1 font-medium",
      md: "h-8 px-3 text-xs rounded gap-1.5 font-medium",
      lg: "h-9 px-4 text-sm rounded gap-2 font-medium",
      icon: "h-8 w-8 p-0 rounded shrink-0",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && <Spinner size={size === "sm" ? "sm" : "md"} className="text-current shrink-0" />}
        {!isLoading && leftIcon && <span className="inline-flex items-center shrink-0">{leftIcon}</span>}
        {children && (
          <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap leading-none">
            {children}
          </span>
        )}
        {!isLoading && rightIcon && <span className="inline-flex items-center shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
