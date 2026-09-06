import * as React from "react";
import { cn } from "./utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "accent";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-primary-subtle text-primary border-primary-border",
    accent: "bg-accent-subtle text-accent border-accent-border",
    secondary: "bg-surface-muted text-secondary border-strong",
    destructive: "bg-danger-subtle text-danger border-danger-border",
    outline: "text-primary border-strong bg-transparent",
    success: "bg-success-subtle text-success-fg border-success-border",
    warning: "bg-warning-subtle text-warning-fg border-warning-border",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-0.2 text-[10px] font-mono font-bold tracking-wider uppercase transition-colors select-none",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}
