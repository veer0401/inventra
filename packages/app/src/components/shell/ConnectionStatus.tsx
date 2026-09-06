import React from "react";
import { WifiOff } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

export const ConnectionStatus: React.FC = () => {
  const isOnline = useAuthStore((state) => state.isOnline);

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-danger text-white px-4 py-2 text-xs font-medium flex items-center justify-between border-b border-danger-border animate-in slide-in-from-top duration-150 sticky top-0 z-50 shadow-xs"
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          <strong>Network Offline:</strong> The web terminal requires an active internet connection to communicate with the server. Actions will be queued or rejected until connectivity is restored.
        </span>
      </div>
    </div>
  );
};
