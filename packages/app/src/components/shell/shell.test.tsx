import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@inventra/ui";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Breadcrumbs } from "./Breadcrumbs";
import { ConnectionStatus } from "./ConnectionStatus";
import { useAuthStore } from "../../stores/authStore";
import { useShortcutStore } from "../../stores/shortcutStore";

const renderWithProviders = (ui: React.ReactElement, initialEntries = ["/dashboard"]) => {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </ToastProvider>
  );
};

describe("Application Shell Components", () => {
  beforeEach(() => {
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
  });

  describe("Sidebar Navigation", () => {
    it("renders core overview and operational navigation items", () => {
      renderWithProviders(<Sidebar isOpen={true} onClose={() => {}} />);

      expect(screen.getByText("Dashboard")).toBeDefined();
      expect(screen.getByText("Point of Sale (POS)")).toBeDefined();
      expect(screen.getByText("Sales & Invoices")).toBeDefined();
      expect(screen.getByText("Inventory Overview")).toBeDefined();
      expect(screen.getByText("Batches & FEFO")).toBeDefined();
      expect(screen.getByText("Stock Movements")).toBeDefined();
      expect(screen.getByText("Catalog & Categories")).toBeDefined();
      expect(screen.getByText("Purchase Orders (PO)")).toBeDefined();
      expect(screen.getByText("Goods Receipts (GRN)")).toBeDefined();
      expect(screen.getByText("Purchase Invoices")).toBeDefined();
      expect(screen.getByText("Suppliers & Vendors")).toBeDefined();
      expect(screen.getByText("Reports & Analytics")).toBeDefined();
      expect(screen.getByText("Workstation Settings")).toBeDefined();
    });

    it("displays future phase markers for upcoming modules", () => {
      renderWithProviders(<Sidebar isOpen={true} onClose={() => {}} />);

      const futureTags = screen.getAllByText("Future");
      expect(futureTags.length).toBeGreaterThan(0);
    });

    it("toggles collapse state, updates aria attributes, and persists to localStorage", () => {
      localStorage.clear();
      renderWithProviders(<Sidebar isOpen={true} onClose={() => {}} />);

      const toggleButton = screen.getByRole("button", { name: /collapse sidebar/i });
      expect(toggleButton.getAttribute("aria-expanded")).toBe("true");

      // Click to collapse
      fireEvent.click(toggleButton);
      expect(localStorage.getItem("inventra_sidebar_collapsed")).toBe("true");

      // Collapse button is now expand
      const expandButton = screen.getByRole("button", { name: /expand sidebar/i });
      expect(expandButton.getAttribute("aria-expanded")).toBe("false");

      // Click to expand again
      fireEvent.click(expandButton);
      expect(localStorage.getItem("inventra_sidebar_collapsed")).toBe("false");
    });

    it("toggles Inventra Copilot side panel from sidebar control", () => {
      useShortcutStore.setState({ copilotOpen: false });
      renderWithProviders(<Sidebar isOpen={true} onClose={() => {}} />);

      const toggleBtn = screen.getByTestId("test-sidebar-copilot-toggle");
      expect(toggleBtn).toBeDefined();
      expect(toggleBtn.getAttribute("aria-pressed")).toBe("false");

      // Click to toggle ON
      fireEvent.click(toggleBtn);
      expect(useShortcutStore.getState().copilotOpen).toBe(true);

      // Click to toggle OFF
      fireEvent.click(toggleBtn);
      expect(useShortcutStore.getState().copilotOpen).toBe(false);
    });
  });

  describe("TopBar Header", () => {
    it("displays active business and store name badge", () => {
      renderWithProviders(
        <TopBar onToggleSidebar={() => {}} onOpenContextSwitcher={() => {}} />
      );

      expect(screen.getByText("Indiranagar Dispensary")).toBeDefined();
      expect(screen.getByText("Apollo Health")).toBeDefined();
      expect(screen.getByText("ONLINE")).toBeDefined();
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
