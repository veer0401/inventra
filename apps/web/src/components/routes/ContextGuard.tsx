import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export interface ContextGuardProps {
  children: React.ReactNode;
}

export const ContextGuard: React.FC<ContextGuardProps> = ({ children }) => {
  const { status, activeContext } = useAuthStore();

  // Platform Admin does not operate within a specific tenant store context
  if (activeContext?.role === "PLATFORM_ADMIN") {
    return <>{children}</>;
  }

  if (status === "CONTEXT_SELECTION_REQUIRED" || !activeContext?.storeId) {
    return <Navigate to="/select-context" replace />;
  }

  return <>{children}</>;
};
