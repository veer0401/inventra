import * as React from "react";
import { Badge, type BadgeProps } from "./badge";
import { CheckCircle2, ShieldAlert, MonitorCheck, MonitorOff } from "lucide-react";
import { cn } from "./utils";

export type DeviceStatusType =
  | "REGISTERED"
  | "REVOKED"
  | "ACTIVE"
  | "OFFLINE"
  | string;

export interface DeviceStatusBadgeProps extends Omit<BadgeProps, "children"> {
  status: DeviceStatusType;
  showIcon?: boolean;
}

export const DeviceStatusBadge: React.FC<DeviceStatusBadgeProps> = ({
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
    case "REGISTERED":
    case "ACTIVE":
      variant = "success";
      icon = <MonitorCheck className="h-3 w-3 shrink-0" />;
      label = "Active / Registered";
      break;

    case "REVOKED":
      variant = "destructive";
      icon = <ShieldAlert className="h-3 w-3 shrink-0" />;
      label = "Revoked";
      break;

    case "OFFLINE":
      variant = "secondary";
      icon = <MonitorOff className="h-3 w-3 shrink-0" />;
      label = "Offline";
      break;

    default:
      variant = "outline";
      icon = <CheckCircle2 className="h-3 w-3 shrink-0" />;
  }

  return (
    <Badge variant={variant} className={cn("gap-1 py-0.5 font-medium text-xs", className)} {...props}>
      {showIcon && icon}
      <span>{label}</span>
    </Badge>
  );
};
