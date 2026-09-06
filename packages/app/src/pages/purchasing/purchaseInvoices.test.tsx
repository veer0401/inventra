import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { PurchaseInvoicesPage } from "./PurchaseInvoicesPage";
import { purchasingApi } from "../../services/purchasingApi";
import { useAuthStore } from "../../stores/authStore";

vi.mock("../../services/purchasingApi", () => ({
  purchasingApi: {
    listPurchaseInvoices: vi.fn(),
    listSuppliers: vi.fn(),
  },
}));

const mockInvoices = [
  {
    id: "inv-1",
    businessId: "biz-1",
    storeId: "store-1",
    supplierId: "sup-1",
    supplierInvoiceNumber: "INV-CIPLA-8821",
    invoiceDate: "2026-08-25",
    dueDate: "2026-09-25",
    status: "POSTED",
    totalAmount: 12500.0,
    totalLines: 3,
    purchaseOrderId: null,
    goodsReceiptId: null,
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

describe("PurchaseInvoicesPage — Phase F4 Accounts Payable", () => {
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

    vi.mocked(purchasingApi.listPurchaseInvoices).mockResolvedValue({
      content: mockInvoices,
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: false,
    } as any);

    vi.mocked(purchasingApi.listSuppliers).mockResolvedValue({
      content: [{ id: "sup-1", legalName: "Cipla Health Ltd", supplierCode: "CIP-01" }],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
    } as any);
  });

  it("renders purchase invoices table with invoice number, amount, and status", async () => {
    renderWithProviders(<PurchaseInvoicesPage />);

    expect(screen.getByText("Purchase Invoices")).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText("INV-CIPLA-8821").length).toBeGreaterThan(0);
      expect(screen.getAllByText("POSTED").length).toBeGreaterThan(0);
      expect(screen.getAllByText("₹12,500.00").length).toBeGreaterThan(0);
    });
  });
});
