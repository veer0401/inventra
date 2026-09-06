import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export interface ContextGuardProps {
  children: React.ReactNode;
}

export const ContextGuard: React.FC<ContextGuardProps> = ({ children }) => {
  const { status, activeContext } = useAuthStore();

  // Platform Admin must use the Platform Admin Console, not the pharmacy store workspace
  if (activeContext?.role === "PLATFORM_ADMIN") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (status === "CONTEXT_SELECTION_REQUIRED" || !activeContext?.storeId) {
    return <Navigate to="/select-context" replace />;
  }

  return <>{children}</>;
};
