import * as React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "./utils";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "danger";
  title?: string;
  onDismiss?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  className,
  variant = "info",
  title,
  onDismiss,
  children,
  ...props
}) => {
  const variantStyles = {
    info: "bg-info-subtle border-info text-info-fg",
    success: "bg-success-subtle border-success text-success-fg",
    warning: "bg-warning-subtle border-warning text-warning-fg",
    danger: "bg-danger-subtle border-danger text-danger-fg",
  };

  const iconMap = {
    info: <Info className="h-4 w-4 text-info shrink-0 mt-0.5" aria-hidden="true" />,
    success: <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />,
    warning: <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />,
    danger: <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" aria-hidden="true" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative flex items-start gap-3 rounded-md border p-3.5 text-xs shadow-xs transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {iconMap[variant]}
      <div className="flex-1 space-y-0.5">
        {title && <h5 className="font-semibold leading-tight">{title}</h5>}
        <div className="text-xs leading-normal opacity-95">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          className="text-muted hover:text-primary transition-colors -mr-1 -mt-1 p-1 rounded-sm focus:outline-none focus:ring-1 focus:ring-focus"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
