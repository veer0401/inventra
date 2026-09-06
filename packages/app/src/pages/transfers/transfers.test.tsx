import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ToastProvider } from "@inventra/ui";
import { TransfersPage } from "./TransfersPage";
import { transferApi } from "../../services/transferApi";
import { useAuthStore } from "../../stores/authStore";
import type { TransferResponse } from "@inventra/api-types";

vi.mock("../../services/transferApi", () => ({
  transferApi: {
    listTransfers: vi.fn(),
    getTransfer: vi.fn(),
  },
}));

const mockTransfers: TransferResponse[] = [
  {
    id: "trans-01",
    businessId: "biz-1",
    sourceStoreId: "store-main",
    destinationStoreId: "store-branch-1",
    transferNumber: "TRF-MAIN-000001",
    status: "IN_TRANSIT",
    requestedBy: "user-1",
    requestedAt: "2026-08-27T10:00:00Z",
    version: 1,
    lines: [
      {
        id: "tl-01",
        productId: "p-01",
        productName: "Amoxicillin 500mg",
        lineNumber: 1,
        sellingUnit: "BOX",
        conversionFactor: 1,
        requestedQuantity: 10,
        approvedQuantity: 10,
        shippedQuantity: 10,
        receivedQuantity: 0,
        batchAllocations: [],
      },
    ],
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
      <ToastProvider>
        <BrowserRouter>{ui}</BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe("TransfersPage — Phase F8 Inter-Store Inventory Transfers", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      activeContext: {
        businessId: "biz-1",
        businessName: "Apollo Pharmacy Group",
        storeId: "store-main",
        storeName: "Main Dispensary",
        storeCode: "AP-MAIN-01",
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

    vi.mocked(transferApi.listTransfers).mockResolvedValue({
      content: mockTransfers,
      totalElements: 1,
      totalPages: 1,
      size: 15,
      number: 0,
      numberOfElements: 1,
      first: true,
      last: true,
      empty: false,
      pageable: {} as any,
    });
  });

  it("renders list of transfers with transfer number, stores and status badge", async () => {
    renderWithProviders(<TransfersPage />);

    expect(screen.getByText("Inter-Store Transfers")).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText("TRF-MAIN-000001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("In Transit").length).toBeGreaterThan(0);
    });
  });
});
