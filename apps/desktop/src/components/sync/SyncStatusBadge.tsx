import React from "react";
import { Cloud, CloudOff, RefreshCw, AlertTriangle, ShieldAlert } from "lucide-react";

export type SyncBadgeState = "ONLINE" | "SYNCING" | "OFFLINE" | "CONFLICT" | "REVOKED";

interface SyncStatusBadgeProps {
  state: SyncBadgeState;
  pendingCount?: number;
  conflictCount?: number;
  onClick?: () => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  state,
  pendingCount = 0,
  conflictCount = 0,
  onClick,
}) => {
  const getBadgeConfig = () => {
    switch (state) {
      case "ONLINE":
        return {
          icon: <Cloud className="w-3.5 h-3.5 text-emerald-500" />,
          label: pendingCount > 0 ? `Synced (${pendingCount} pending)` : "Online",
          className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
        };
      case "SYNCING":
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />,
          label: `Syncing ${pendingCount > 0 ? `(${pendingCount})` : ""}`,
          className: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
        };
      case "OFFLINE":
        return {
          icon: <CloudOff className="w-3.5 h-3.5 text-amber-500" />,
          label: pendingCount > 0 ? `Offline (${pendingCount} queued)` : "Offline Mode",
          className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
        };
      case "CONFLICT":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-500 animate-bounce" />,
          label: `${conflictCount} Conflicts`,
          className: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800",
        };
      case "REVOKED":
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-red-500" />,
          label: "Device Revoked",
          className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800 font-bold",
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all hover:scale-105 ${config.className}`}
      title="Click to open Sync Center"
    >
      {config.icon}
      <span>{config.label}</span>
    </button>
  );
};
