import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { PurchaseOrdersPage } from "./PurchaseOrdersPage";
import { purchasingApi } from "../../services/purchasingApi";
import { useAuthStore } from "../../stores/authStore";

vi.mock("../../services/purchasingApi", () => ({
  purchasingApi: {
    listPurchaseOrders: vi.fn(),
    listSuppliers: vi.fn(),
  },
}));

const mockPOs = [
  {
    id: "po-1",
    orderNumber: "PO-2026-0001",
    storeId: "store-1",
    supplierId: "sup-1",
    status: "CONFIRMED",
    orderDate: "2026-08-25",
    expectedDeliveryDate: "2026-09-01",
    totalAmount: 15400.5,
    createdAt: "2026-08-25T10:00:00Z",
  },
  {
    id: "po-2",
    orderNumber: "PO-2026-0002",
    storeId: "store-1",
    supplierId: "sup-2",
    status: "DRAFT",
    orderDate: "2026-08-26",
    expectedDeliveryDate: "2026-09-05",
    totalAmount: 8200.0,
    createdAt: "2026-08-26T12:00:00Z",
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("PurchaseOrdersPage — Phase F4 Procurement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      activeContext: {
        businessId: "biz-1",
        businessName: "Apollo Pharmacy Group",
        storeId: "store-1",
        storeName: "Indiranagar Dispensary",
        storeCode: "AP-BLR-01",
        role: "OWNER",
      },
      user: {
        id: "user-1",
        email: "pharmacist@apollo.com",
        fullName: "Test Pharmacist",
        status: "ACTIVE",
        emailVerified: true,
      },
      status: "AUTHENTICATED",
      accessToken: "mock-token",
      refreshToken: "mock-refresh-token",
      memberships: [],
      error: null,
      isOnline: true,
    });

    vi.mocked(purchasingApi.listPurchaseOrders).mockResolvedValue({
      content: mockPOs,
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: false,
    } as any);

    vi.mocked(purchasingApi.listSuppliers).mockResolvedValue({
      content: [
        { id: "sup-1", legalName: "Cipla Health Ltd", supplierCode: "CIP-01" },
        { id: "sup-2", legalName: "Sun Pharma Dist", supplierCode: "SUN-01" },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 100,
      number: 0,
    } as any);
  });

  it("renders purchase orders table with order numbers, status badges, and store context", async () => {
    renderWithProviders(<PurchaseOrdersPage />);

    expect(screen.getByText("Purchase Orders (PO)")).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText("PO-2026-0001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("PO-2026-0002").length).toBeGreaterThan(0);
      expect(screen.getAllByText("CONFIRMED").length).toBeGreaterThan(0);
      expect(screen.getAllByText("DRAFT").length).toBeGreaterThan(0);
    });
  });
});
