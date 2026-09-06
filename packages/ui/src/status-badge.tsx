import * as React from "react";
import { Badge, type BadgeProps } from "./badge";
import {
  CheckCircle2,
  CircleSlash,
  Ban,
  Clock,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { cn } from "./utils";

export type DomainStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "DISCONTINUED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "LOW_STOCK"
  | "OUT_OF_STOCK"
  | "EXPIRED"
  | "RX_REQUIRED"
  | "IN_STOCK"
  | string;

export interface StatusBadgeProps extends Omit<BadgeProps, "children"> {
  status: DomainStatus;
  showIcon?: boolean;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  label,
  className,
  ...props
}) => {
  const normalized = (status || "").toUpperCase();

  let variant: BadgeProps["variant"] = "secondary";
  let icon: React.ReactNode = null;
  const displayLabel = label || status;

  switch (normalized) {
    case "ACTIVE":
    case "APPROVED":
    case "IN_STOCK":
      variant = "success";
      icon = <CheckCircle2 className="h-3 w-3 shrink-0" />;
      break;

    case "INACTIVE":
    case "DRAFT":
      variant = "secondary";
      icon = <CircleSlash className="h-3 w-3 shrink-0" />;
      break;

    case "DISCONTINUED":
    case "REJECTED":
    case "OUT_OF_STOCK":
    case "EXPIRED":
      variant = "destructive";
      icon = normalized === "DISCONTINUED" ? <Ban className="h-3 w-3 shrink-0" /> : <ShieldAlert className="h-3 w-3 shrink-0" />;
      break;

    case "PENDING_REVIEW":
    case "PENDING":
    case "LOW_STOCK":
    case "RX_REQUIRED":
      variant = "warning";
      icon = normalized === "PENDING_REVIEW" || normalized === "PENDING"
        ? <Clock className="h-3 w-3 shrink-0" />
        : <AlertTriangle className="h-3 w-3 shrink-0" />;
      break;

    default:
      variant = "outline";
      icon = null;
  }

  return (
    <Badge variant={variant} className={cn("gap-1 py-0.5", className)} {...props}>
      {showIcon && icon}
      <span>{displayLabel}</span>
    </Badge>
  );
};
