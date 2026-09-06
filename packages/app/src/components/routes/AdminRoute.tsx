import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { status, activeContext } = useAuthStore();

  if (status !== "AUTHENTICATED") {
    return <Navigate to="/login" replace />;
  }

  if (activeContext?.role !== "PLATFORM_ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
