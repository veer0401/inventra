import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "@inventra/ui";
import { TopBar } from "./TopBar";
import { AppShell } from "./AppShell";
import { MobileNavSheet } from "./MobileNavSheet";
import { WorkspaceCustomizerModal } from "./WorkspaceCustomizerModal";
import { Breadcrumbs } from "./Breadcrumbs";
import { ConnectionStatus } from "./ConnectionStatus";
import { useAuthStore } from "../../stores/authStore";
import { useShortcutStore } from "../../stores/shortcutStore";
import { useWorkspaceStore } from "../../stores/workspaceStore";

const renderWithProviders = (ui: React.ReactElement, initialEntries = ["/dashboard"]) => {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </ToastProvider>
  );
};

describe("Application Shell & Top Navigation Workspace", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({
      status: "AUTHENTICATED",
      accessToken: "valid-token",
      refreshToken: "valid-rt",
      user: {
        id: "usr-1",
        email: "pharmacist@inventra.local",
        fullName: "Dr. Vikram Seth",
        status: "ACTIVE",
        emailVerified: true,
      },
      activeContext: {
        businessId: "biz-1",
        businessName: "Apollo Health",
        storeId: "store-1",
        storeName: "Indiranagar Dispensary",
        storeCode: "AP-BLR-01",
        role: "OWNER",
      },
      memberships: [
        {
          businessId: "biz-1",
          businessName: "Apollo Health",
          role: "OWNER",
          stores: [
            {
              storeId: "store-1",
              storeName: "Indiranagar Dispensary",
              storeCode: "AP-BLR-01",
              isPrimaryStore: true,
            },
          ],
        },
      ],
      error: null,
      isOnline: true,
    });

    useWorkspaceStore.getState().initializeForUser("usr-1", "OWNER");
  });

  describe("TopBar Workspace Header", () => {
    it("renders primary navigation tabs and pharmacy quick tools", () => {
      renderWithProviders(
        <TopBar onToggleSidebar={() => {}} onOpenContextSwitcher={() => {}} />
      );

      // Primary top navigation tabs
      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Sales")).toBeDefined();
      expect(screen.getByText("Inventory")).toBeDefined();
      expect(screen.getByText("Purchasing")).toBeDefined();
      expect(screen.getByText("Reports")).toBeDefined();

      // Quick Tools bar
      expect(screen.getByText("Quick Tools:")).toBeDefined();
      expect(screen.getByText("Scan")).toBeDefined();
      expect(screen.getByText("New Sale")).toBeDefined();
      expect(screen.getByText("Low Stock")).toBeDefined();
    });

    it("displays active business and store name with online status", () => {
      renderWithProviders(
        <TopBar onToggleSidebar={() => {}} onOpenContextSwitcher={() => {}} />
      );

      expect(screen.getByText("Indiranagar Dispensary")).toBeDefined();
      expect(screen.getByText("AP-BLR-01")).toBeDefined();
      expect(screen.getByText("ONLINE")).toBeDefined();
    });

    it("opens More mega menu popover on click and lists all workflow groups", () => {
      renderWithProviders(
        <TopBar onToggleSidebar={() => {}} onOpenContextSwitcher={() => {}} />
      );

      const moreBtn = screen.getByRole("button", { name: /all application modules/i });
      fireEvent.click(moreBtn);

      expect(screen.getByText("All Modules & Operations")).toBeDefined();
      expect(screen.getByText("WORK")).toBeDefined();
      expect(screen.getByText("INVENTORY")).toBeDefined();
      expect(screen.getByText("PURCHASING")).toBeDefined();
      expect(screen.getByText("CATALOG")).toBeDefined();
      expect(screen.getByText("ADMIN")).toBeDefined();
    });

    it("opens and displays submenu dropdown when clicking a parent tab with children (e.g. Sales)", () => {
      renderWithProviders(
        <TopBar onToggleSidebar={() => {}} onOpenContextSwitcher={() => {}} />
      );

      const salesBtn = screen.getByRole("button", { name: /^Sales$/i });
      fireEvent.click(salesBtn);

      // Verify sub-items appear in the open dropdown
      expect(screen.getByText("Point of Sale (POS)")).toBeDefined();
      expect(screen.getByText("Sales & Invoices")).toBeDefined();
      expect(screen.getByText("Returns")).toBeDefined();
    });

    it("opens workspace customizer modal when clicking Customize Workspace", () => {
      renderWithProviders(
        <TopBar onToggleSidebar={() => {}} onOpenContextSwitcher={() => {}} />
      );

      const customizeBtn = screen.getByRole("button", { name: /customize workspace/i });
      fireEvent.click(customizeBtn);

      expect(useWorkspaceStore.getState().isCustomizerOpen).toBe(true);
    });

    it("collapses and expands the contextual ribbon toolbar when toggled", () => {
      renderWithProviders(
        <TopBar onToggleSidebar={() => {}} onOpenContextSwitcher={() => {}} />
      );

      // Verify quick tools are initially present
      expect(screen.getByText("Quick Tools:")).toBeDefined();

      // Click Collapse button in TopBar
      const collapseBtn = screen.getAllByRole("button", { name: /collapse workspace ribbon/i })[0];
      fireEvent.click(collapseBtn);

      // Ribbon rows are collapsed
      expect(screen.queryByText("Quick Tools:")).toBeNull();

      // Click Expand button
      const expandBtn = screen.getByRole("button", { name: /expand workspace ribbon/i });
      fireEvent.click(expandBtn);

      // Ribbon rows are expanded back
      expect(screen.getByText("Quick Tools:")).toBeDefined();
    });
  });

  describe("AppShell Desktop Workspace (No Persistent Sidebar)", () => {
    it("renders full-width workspace with no persistent sidebar element", () => {
      renderWithProviders(
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<div data-testid="workspace-content">Workspace Content</div>} />
          </Route>
        </Routes>,
        ["/dashboard"]
      );

      // Verify workspace content is present
      expect(screen.getByTestId("workspace-content")).toBeDefined();

      // Verify persistent sidebar navigation element is NOT in document
      expect(screen.queryByLabelText("Application Sidebar Navigation")).toBeNull();
    });
  });

  describe("Mobile Navigation Sheet", () => {
    it("renders workflow modules when open", () => {
      const handleClose = vitest.fn();
      renderWithProviders(<MobileNavSheet isOpen={true} onClose={handleClose} />);

      expect(screen.getByText("WORK")).toBeDefined();
      expect(screen.getByText("INVENTORY")).toBeDefined();
      expect(screen.getByText("PURCHASING")).toBeDefined();
    });
  });

  describe("Workspace Customizer Modal", () => {
    it("renders customize dialog when open and allows reordering and resetting", () => {
      useWorkspaceStore.setState({ isCustomizerOpen: true });
      renderWithProviders(<WorkspaceCustomizerModal />);

      expect(screen.getByText("Customize ERP Workspace")).toBeDefined();
      expect(screen.getByText("Top Navigation Tabs")).toBeDefined();
      expect(screen.getByText("Pharmacy Quick Tools")).toBeDefined();

      // Switch to Pharmacy Quick Tools tab
      const toolsTab = screen.getByText("Pharmacy Quick Tools");
      fireEvent.click(toolsTab);

      expect(screen.getByText("Active Pharmacy Quick Tools")).toBeDefined();

      // Reset to Role Defaults
      const resetBtn = screen.getByText("Reset to Role Defaults");
      fireEvent.click(resetBtn);

      expect(useWorkspaceStore.getState().isCustomizerOpen).toBe(false);
    });
  });

  describe("Breadcrumbs", () => {
    it("renders hierarchical path segments", () => {
      renderWithProviders(<Breadcrumbs />, ["/catalog/products/new"]);

      expect(screen.getByText("Home")).toBeDefined();
      expect(screen.getByText("Catalog & Categories")).toBeDefined();
      expect(screen.getByText("Products")).toBeDefined();
      expect(screen.getByText("New Product")).toBeDefined();
    });
  });

  describe("Connection Status Banner", () => {
    it("renders offline banner when client loses connectivity", () => {
      useAuthStore.setState({ isOnline: false });
      renderWithProviders(<ConnectionStatus />);

      expect(screen.getByText("Network Offline:")).toBeDefined();
    });
  });
});
