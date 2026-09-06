import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { Spinner } from "@inventra/ui";

export interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { status, activeContext } = useAuthStore();

  if (status === "RESTORING_SESSION") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-lg text-white shadow-lg">
            IN
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Spinner size="sm" className="text-teal-400" />
            <span>Validating session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === "AUTHENTICATED") {
    if (activeContext?.role === "PLATFORM_ADMIN") {
      return <Navigate to="/admin/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (status === "CONTEXT_SELECTION_REQUIRED") {
    return <Navigate to="/select-context" replace />;
  }

  return <div className="h-full w-full overflow-y-auto">{children}</div>;
};
