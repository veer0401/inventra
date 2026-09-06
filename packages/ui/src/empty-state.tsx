import * as React from "react";
import { cn } from "./utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  className,
  icon,
  title,
  description,
  action,
  ...props
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-strong bg-surface text-primary shadow-xs",
        className
      )}
      {...props}
    >
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <h4 className="text-sm font-semibold text-primary">{title}</h4>
      {description && <p className="mt-1 text-xs text-secondary max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
