import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { BatchesPage } from "./BatchesPage";
import { inventoryApi } from "../../services/inventoryApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";

vi.mock("../../services/inventoryApi", () => ({
  inventoryApi: {
    listBatches: vi.fn(),
  },
}));

vi.mock("../../services/catalogApi", () => ({
  catalogApi: {
    listProducts: vi.fn(),
  },
}));

const mockBatches = [
  {
    id: "batch-1",
    businessId: "biz-1",
    storeId: "store-1",
    productId: "prod-1",
    batchNumber: "LOT-2026-AUG",
    manufacturingDate: "2025-01-01",
    expiryDate: "2027-08-01",
    quantity: 150,
    purchasePrice: 45.0,
    mrp: 75.0,
    sellingPrice: 65.0,
    status: "ACTIVE",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
  {
    id: "batch-2",
    businessId: "biz-1",
    storeId: "store-1",
    productId: "prod-2",
    batchNumber: "LOT-EXP-NEAR",
    manufacturingDate: "2024-05-01",
    expiryDate: "2026-09-01",
    quantity: 30,
    purchasePrice: 120.0,
    mrp: 180.0,
    sellingPrice: 160.0,
    status: "ACTIVE",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
];

const mockCatalogProducts = {
  content: [
    {
      id: "prod-1",
      name: "Amoxicillin 500mg Capsules",
      genericName: "Amoxicillin",
    },
    {
      id: "prod-2",
      name: "Azithromycin 500mg Tablets",
      genericName: "Azithromycin",
    },
  ],
  totalElements: 2,
  totalPages: 1,
  size: 100,
  number: 0,
};

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

describe("BatchesPage — Phase F4 Store Batches & FEFO Explorer", () => {
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

    vi.mocked(inventoryApi.listBatches).mockResolvedValue({
      content: mockBatches,
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: false,
    } as any);

    vi.mocked(catalogApi.listProducts).mockResolvedValue(mockCatalogProducts as any);
  });

  it("renders store batches table with active branch and product names", async () => {
    renderWithProviders(<BatchesPage />);

    expect(screen.getByText("Store Batches & FEFO Explorer")).toBeDefined();
    expect(screen.getByText("Indiranagar Dispensary")).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText("LOT-2026-AUG").length).toBeGreaterThan(0);
      expect(screen.getAllByText("LOT-EXP-NEAR").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Amoxicillin 500mg Capsules").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Azithromycin 500mg Tablets").length).toBeGreaterThan(0);
    });
  });

  it("filters batches by search term", async () => {
    renderWithProviders(<BatchesPage />);

    await waitFor(() => {
      expect(screen.getAllByText("LOT-2026-AUG").length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText("Search batch lot, product, SKU...");
    fireEvent.change(searchInput, { target: { value: "Azithromycin" } });

    expect(screen.queryByText("Amoxicillin 500mg Capsules")).toBeNull();
    expect(screen.getAllByText("Azithromycin 500mg Tablets").length).toBeGreaterThan(0);
  });
});
