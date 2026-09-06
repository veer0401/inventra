import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { ContextGuard } from "./ContextGuard";
import { AdminRoute } from "./AdminRoute";
import { useAuthStore } from "../../stores/authStore";

describe("Route Guards", () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: "UNAUTHENTICATED",
      accessToken: null,
      refreshToken: null,
      user: null,
      activeContext: null,
      memberships: [],
      error: null,
      isOnline: true,
    });
  });

  describe("ProtectedRoute", () => {
    it("redirects unauthenticated user to login", () => {
      useAuthStore.setState({ status: "UNAUTHENTICATED" });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Login Page")).toBeDefined();
    });

    it("renders protected content when authenticated", () => {
      useAuthStore.setState({
        status: "AUTHENTICATED",
        accessToken: "valid-token",
        user: { id: "1", email: "user@test.local", fullName: "Test User", status: "ACTIVE", emailVerified: true },
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Protected Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Protected Content")).toBeDefined();
    });
  });

  describe("ContextGuard", () => {
    it("redirects tenant user to select-context when store context is missing", () => {
      useAuthStore.setState({
        status: "CONTEXT_SELECTION_REQUIRED",
        activeContext: { businessName: "Test Biz", role: "OWNER" },
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route path="/select-context" element={<div>Context Selector Page</div>} />
            <Route
              path="/dashboard"
              element={
                <ContextGuard>
                  <div>Store Workspace</div>
                </ContextGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Context Selector Page")).toBeDefined();
    });

    it("allows PLATFORM_ADMIN without requiring storeId", () => {
      useAuthStore.setState({
        status: "AUTHENTICATED",
        activeContext: { businessName: "Platform", role: "PLATFORM_ADMIN" },
      });

      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ContextGuard>
                  <div>Admin Workspace</div>
                </ContextGuard>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Admin Workspace")).toBeDefined();
    });
  });

  describe("AdminRoute", () => {
    it("allows PLATFORM_ADMIN role", () => {
      useAuthStore.setState({
        status: "AUTHENTICATED",
        activeContext: { businessName: "Platform", role: "PLATFORM_ADMIN" },
      });

      render(
        <MemoryRouter initialEntries={["/admin/onboarding"]}>
          <Routes>
            <Route
              path="/admin/onboarding"
              element={
                <AdminRoute>
                  <div>Admin Onboarding Console</div>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Admin Onboarding Console")).toBeDefined();
    });

    it("blocks non-admin users and redirects to root", () => {
      useAuthStore.setState({
        status: "AUTHENTICATED",
        activeContext: { businessName: "Apollo", storeId: "store-1", role: "OWNER" },
      });

      render(
        <MemoryRouter initialEntries={["/admin/onboarding"]}>
          <Routes>
            <Route path="/" element={<div>Home / Dashboard</div>} />
            <Route
              path="/admin/onboarding"
              element={
                <AdminRoute>
                  <div>Admin Onboarding Console</div>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText("Home / Dashboard")).toBeDefined();
    });
  });
});
