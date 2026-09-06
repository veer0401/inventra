import * as React from "react";
import { cn } from "./utils";
import { Spinner } from "./spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "destructive" | "outline" | "ghost" | "accent";
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
      "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus active:scale-[0.99] disabled:pointer-events-none disabled:opacity-45 disabled:active:scale-100";

    const variantStyles = {
      primary:
        "bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active shadow-xs border border-primary-border",
      accent:
        "bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-hover shadow-xs border border-accent",
      secondary:
        "bg-surface-muted text-primary hover:bg-surface active:bg-surface-muted border border-strong shadow-xs",
      destructive:
        "bg-danger text-white hover:bg-danger-hover active:bg-danger shadow-xs border border-danger",
      outline:
        "border border-strong bg-surface text-primary hover:bg-surface-muted active:bg-surface-elevated shadow-xs",
      ghost:
        "text-primary hover:bg-surface-muted active:bg-surface-elevated border border-transparent",
    };

    const sizeStyles = {
      sm: "min-h-[28px] h-7 px-2.5 text-xs rounded-md gap-1.5",
      md: "min-h-[36px] h-9 px-3.5 py-1.5 text-xs rounded-md gap-2",
      lg: "min-h-[44px] h-11 px-5 py-2.5 text-sm rounded-md gap-2.5 font-semibold",
      icon: "h-9 w-9 p-0 rounded-md shrink-0",
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
