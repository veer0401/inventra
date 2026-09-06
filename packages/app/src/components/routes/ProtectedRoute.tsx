import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { Spinner } from "@inventra/ui";

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { status } = useAuthStore();
  const location = useLocation();

  if (status === "RESTORING_SESSION") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-lg text-white shadow-lg">
            IN
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Spinner size="sm" className="text-teal-400" />
            <span>Restoring secure session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (status === "UNAUTHENTICATED" || status === "SESSION_EXPIRED" || status === "AUTH_FAILED") {
    const redirectUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectUrl}`} replace />;
  }

  return <>{children}</>;
};
