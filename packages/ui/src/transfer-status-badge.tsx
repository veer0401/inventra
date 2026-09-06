import * as React from "react";
import { Badge, type BadgeProps } from "./badge";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  PackageCheck,
  PackageMinus,
  Ban,
} from "lucide-react";
import { cn } from "./utils";

export type TransferStatusType =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "IN_TRANSIT"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "CANCELLED"
  | string;

export interface TransferStatusBadgeProps extends Omit<BadgeProps, "children"> {
  status: TransferStatusType;
  showIcon?: boolean;
}

export const TransferStatusBadge: React.FC<TransferStatusBadgeProps> = ({
  status,
  showIcon = true,
  className,
  ...props
}) => {
  const normalized = (status || "").toUpperCase();

  let variant: BadgeProps["variant"] = "secondary";
  let icon: React.ReactNode = null;
  let label = status;

  switch (normalized) {
    case "REQUESTED":
      variant = "secondary";
      icon = <Clock className="h-3 w-3 shrink-0" />;
      label = "Requested";
      break;

    case "APPROVED":
      variant = "outline";
      icon = <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-500" />;
      label = "Approved";
      break;

    case "REJECTED":
      variant = "destructive";
      icon = <XCircle className="h-3 w-3 shrink-0" />;
      label = "Rejected";
      break;

    case "IN_TRANSIT":
      variant = "warning";
      icon = <Truck className="h-3 w-3 shrink-0" />;
      label = "In Transit";
      break;

    case "PARTIALLY_RECEIVED":
      variant = "warning";
      icon = <PackageMinus className="h-3 w-3 shrink-0" />;
      label = "Partially Received";
      break;

    case "FULLY_RECEIVED":
      variant = "success";
      icon = <PackageCheck className="h-3 w-3 shrink-0" />;
      label = "Fully Received";
      break;

    case "CANCELLED":
      variant = "destructive";
      icon = <Ban className="h-3 w-3 shrink-0" />;
      label = "Cancelled";
      break;

    default:
      variant = "outline";
      icon = null;
  }

  return (
    <Badge variant={variant} className={cn("gap-1 py-0.5 font-medium text-xs", className)} {...props}>
      {showIcon && icon}
      <span>{label}</span>
    </Badge>
  );
};
