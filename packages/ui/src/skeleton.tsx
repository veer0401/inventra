import * as React from "react";
import { cn } from "./utils";

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
      {...props}
    />
  );
};
