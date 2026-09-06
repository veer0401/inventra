import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@inventra/ui";
import { CatalogPage } from "./CatalogPage";
import { ProductDetailPage } from "./ProductDetailPage";
import { ProductTable } from "../../components/catalog/ProductTable";
import { ProductStatusBadge } from "../../components/catalog/ProductStatusBadge";
import { useAuthStore } from "../../stores/authStore";
import { catalogApi } from "../../services/catalogApi";
import type { ProductSummaryResponse, ProductResponse, Page } from "@inventra/api-types";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

const renderWithProviders = (ui: React.ReactElement, initialEntries = ["/catalog"]) => {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          {ui}
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe("Catalog Module Components & Pages", () => {
  const mockProducts: ProductSummaryResponse[] = [
    {
      id: "prod-001",
      name: "Paracetamol 650mg Tablet",
      genericName: "Paracetamol",
      brandName: "Dolo 650",
      manufacturer: "Micro Labs Ltd",
      dosageForm: "TABLET",
      strength: "650mg",
      baseUnit: "Tablet",
      sellingUnit: "Strip of 15",
      unitsPerSellingUnit: 15,
      taxRate: 12.0,
      prescriptionRequired: false,
      status: "ACTIVE",
    },
    {
      id: "prod-002",
      name: "Amoxicillin 500mg Capsule",
      genericName: "Amoxicillin Trihydrate",
      brandName: "Mox 500",
      manufacturer: "Ranbaxy",
      dosageForm: "CAPSULE",
      strength: "500mg",
      baseUnit: "Capsule",
      sellingUnit: "Strip of 10",
      unitsPerSellingUnit: 10,
      taxRate: 12.0,
      prescriptionRequired: true,
      status: "ACTIVE",
    },
  ];

  const mockProductDetail: ProductResponse = {
    id: "prod-001",
    businessId: "biz-001",
    name: "Paracetamol 650mg Tablet",
    genericName: "Paracetamol",
    brandName: "Dolo 650",
    manufacturer: "Micro Labs Ltd",
    dosageForm: "TABLET",
    strength: "650mg",
    baseUnit: "Tablet",
    sellingUnit: "Strip of 15",
    unitsPerSellingUnit: 15,
    hsnCode: "3004",
    taxRate: 12.0,
    isTaxInclusive: true,
    prescriptionRequired: false,
    status: "ACTIVE",
    identifiers: [
      {
        id: "id-001",
        productId: "prod-001",
        identifierType: "BARCODE",
        identifierValue: "8901234567890",
        isPrimary: true,
        createdAt: "2026-08-25T10:00:00Z",
      },
    ],
    createdAt: "2026-08-25T10:00:00Z",
    updatedAt: "2026-08-25T10:00:00Z",
  };

  const mockPageData: Page<ProductSummaryResponse> = {
    content: mockProducts,
    pageable: {
      pageNumber: 0,
      pageSize: 20,
      offset: 0,
      paged: true,
      unpaged: false,
    },
    totalElements: 2,
    totalPages: 1,
    size: 20,
    number: 0,
    first: true,
    last: true,
    empty: false,
    numberOfElements: 2,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      status: "AUTHENTICATED",
      activeContext: {
        businessId: "biz-001",
        businessName: "Apollo Pharmacy Ventures",
        storeId: "store-001",
        storeName: "Indiranagar HQ",
        role: "OWNER",
      },
    });
  });

  describe("ProductStatusBadge", () => {
    it("renders ACTIVE status with emerald styling", () => {
      render(<ProductStatusBadge status="ACTIVE" />);
      expect(screen.getByText("ACTIVE")).toBeDefined();
    });

    it("renders INACTIVE status", () => {
      render(<ProductStatusBadge status="INACTIVE" />);
      expect(screen.getByText("INACTIVE")).toBeDefined();
    });

    it("renders DISCONTINUED status", () => {
      render(<ProductStatusBadge status="DISCONTINUED" />);
      expect(screen.getByText("DISCONTINUED")).toBeDefined();
    });
  });

  describe("ProductTable", () => {
    it("renders table headers and product rows", () => {
      renderWithProviders(<ProductTable products={mockProducts} />);

      expect(screen.getAllByText("Paracetamol 650mg Tablet").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Amoxicillin 500mg Capsule").length).toBeGreaterThan(0);
      expect(screen.getByText("Dolo 650")).toBeDefined();
      expect(screen.getByText("Prescription Required (Rx)")).toBeDefined();
    });
  });

  describe("CatalogPage", () => {
    it("loads and displays product catalog from API", async () => {
      vi.spyOn(catalogApi, "listProducts").mockResolvedValue(mockPageData);
      vi.spyOn(catalogApi, "listCategories").mockResolvedValue([]);

      renderWithProviders(<CatalogPage />);

      await waitFor(() => {
        expect(screen.getAllByText("Paracetamol 650mg Tablet").length).toBeGreaterThan(0);
      });

      expect(screen.getByText("Product Master Catalog")).toBeDefined();
      expect(screen.getByText("2 ITEMS")).toBeDefined();
    });

    it("searches catalog with debounced query", async () => {
      vi.spyOn(catalogApi, "listProducts").mockResolvedValue(mockPageData);
      const searchSpy = vi.spyOn(catalogApi, "searchProducts").mockResolvedValue({
        ...mockPageData,
        content: [mockProducts[1]],
        totalElements: 1,
      });

      renderWithProviders(<CatalogPage />);

      const searchInput = screen.getByPlaceholderText(/Search products by name/i);
      fireEvent.change(searchInput, { target: { value: "Amoxicillin" } });

      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledWith("Amoxicillin", 0, 20);
      });
    });
  });

  describe("ProductDetailPage", () => {
    it("renders complete clinical and tax specifications", async () => {
      vi.spyOn(catalogApi, "getProduct").mockResolvedValue(mockProductDetail);
      vi.spyOn(catalogApi, "listCategories").mockResolvedValue([]);

      renderWithProviders(
        <Routes>
          <Route path="/catalog/products/:productId" element={<ProductDetailPage />} />
        </Routes>,
        ["/catalog/products/prod-001"]
      );

      await waitFor(() => {
        expect(screen.getByText("Paracetamol 650mg Tablet")).toBeDefined();
      });

      expect(screen.getByText("8901234567890")).toBeDefined();
      expect(screen.getByText("PRIMARY")).toBeDefined();
      expect(screen.getByText("12%")).toBeDefined();
      expect(screen.getByText("Micro Labs Ltd")).toBeDefined();
    });
  });
});
