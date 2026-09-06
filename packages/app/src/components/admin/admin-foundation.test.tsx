import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@inventra/ui";
import { AdminShell } from "./shell/AdminShell";
import { AdminDashboardPage } from "../../pages/admin/AdminDashboardPage";
import { OnboardingApplicationsPage } from "../../pages/admin/OnboardingApplicationsPage";
import { AdminRoute } from "../routes/AdminRoute";
import { ContextGuard } from "../routes/ContextGuard";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";

describe("Platform Admin Foundation & Shared Architecture", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      status: "AUTHENTICATED",
      accessToken: "valid-admin-token",
      refreshToken: "valid-admin-rt",
      user: {
        id: "adm-1",
        email: "admin@inventra.platform",
        fullName: "Platform SuperAdmin",
        status: "ACTIVE",
        emailVerified: true,
      },
      activeContext: {
        businessName: "Inventra Platform",
        role: "PLATFORM_ADMIN",
      },
      memberships: [],
      error: null,
      isOnline: true,
    });
  });

  describe("Admin Routing & Access Control", () => {
    it("allows PLATFORM_ADMIN to view /admin/dashboard and /admin/applications", () => {
      render(
        <ToastProvider>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <Routes>
              <Route
                element={
                  <AdminRoute>
                    <AdminShell />
                  </AdminRoute>
                }
              >
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/applications" element={<OnboardingApplicationsPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      );

      expect(screen.getByText("Platform Dashboard")).toBeDefined();
      expect(screen.getByText("Applications Pending Review")).toBeDefined();
    });

    it("blocks normal pharmacy users from /admin/dashboard and redirects to /dashboard", () => {
      useAuthStore.setState({
        status: "AUTHENTICATED",
        activeContext: {
          businessId: "biz-1",
          businessName: "Apollo",
          storeId: "store-1",
          storeName: "Indiranagar",
          role: "OWNER",
        },
      });

      render(
        <ToastProvider>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <Routes>
              <Route path="/dashboard" element={<div>Pharmacy Workspace Dashboard</div>} />
              <Route
                element={
                  <AdminRoute>
                    <AdminShell />
                  </AdminRoute>
                }
              >
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      );

      expect(screen.getByText("Pharmacy Workspace Dashboard")).toBeDefined();
      expect(screen.queryByText("Platform Dashboard")).toBeNull();
    });

    it("redirects PLATFORM_ADMIN from pharmacy /dashboard to /admin/dashboard via ContextGuard", () => {
      render(
        <ToastProvider>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
              <Route path="/admin/dashboard" element={<div>Admin Dashboard Landed</div>} />
              <Route
                path="/dashboard"
                element={
                  <ContextGuard>
                    <div>Pharmacy Workspace</div>
                  </ContextGuard>
                }
              />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      );

      expect(screen.getByText("Admin Dashboard Landed")).toBeDefined();
      expect(screen.queryByText("Pharmacy Workspace")).toBeNull();
    });
  });

  describe("Admin Navigation Flow", () => {
    it("provides explicit navigation back to admin dashboard from applications page", () => {
      render(
        <ToastProvider>
          <MemoryRouter initialEntries={["/admin/applications"]}>
            <Routes>
              <Route
                element={
                  <AdminRoute>
                    <AdminShell />
                  </AdminRoute>
                }
              >
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/applications" element={<OnboardingApplicationsPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      );

      const backLink = screen.getByRole("link", { name: /← back to admin dashboard/i });
      expect(backLink).toBeDefined();
      expect(backLink.getAttribute("href")).toBe("/admin/dashboard");
    });
  });

  describe("Admin Sidebar Sticky & Collapsible Behavior", () => {
    it("supports expanded (240px) and collapsed (72px) states with localStorage persistence", () => {
      localStorage.clear();

      render(
        <ToastProvider>
          <MemoryRouter initialEntries={["/admin/dashboard"]}>
            <AdminShell />
          </MemoryRouter>
        </ToastProvider>
      );

      const aside = screen.getByRole("complementary", { name: /platform admin sidebar/i });
      expect(aside.className).toContain("lg:w-60"); // 60 = 240px

      const toggleButton = screen.getByRole("button", { name: /collapse sidebar/i });
      fireEvent.click(toggleButton);

      // Collapsed to 72px
      expect(aside.className).toContain("lg:w-[72px]");
      expect(localStorage.getItem("inventra_admin_sidebar_collapsed")).toBe("true");

      // Expand back to 240px
      const expandButton = screen.getByRole("button", { name: /expand sidebar/i });
      fireEvent.click(expandButton);
      expect(aside.className).toContain("lg:w-60");
      expect(localStorage.getItem("inventra_admin_sidebar_collapsed")).toBe("false");
    });
  });

  describe("Theme Custom Properties & Desktop Propagation", () => {
    beforeEach(() => {
      document.documentElement.className = "";
      document.documentElement.removeAttribute("style");
      useThemeStore.getState().resetToDefaults();
    });

    it("verifies Clinical Light, Clinical Dark, Ocean Light, and Custom color variables on document.documentElement", () => {
      // 1. Clinical Light
      useThemeStore.getState().setPreset("clinical");
      useThemeStore.getState().setMode("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(document.documentElement.getAttribute("data-theme")).toBe("clinical");
      expect(document.documentElement.style.getPropertyValue("--primary")).toBeDefined();
      expect(document.documentElement.style.getPropertyValue("--bg-app")).toBeDefined();

      // 2. Clinical Dark
      useThemeStore.getState().setMode("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      // 3. Ocean Preset
      useThemeStore.getState().setPreset("ocean");
      expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");

      // 4. Custom Colors: Primary = #00AAFF, Accent = #FF00AA
      useThemeStore.getState().setCustomColors("#00AAFF", "#FF00AA");
      expect(document.documentElement.getAttribute("data-theme")).toBe("custom");
      expect(document.documentElement.style.getPropertyValue("--primary")).toBe("#00AAFF");
      expect(document.documentElement.style.getPropertyValue("--accent")).toBe("#FF00AA");
    });
  });
});
