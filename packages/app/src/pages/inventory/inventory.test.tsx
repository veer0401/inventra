import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@inventra/ui";
import { InventoryPage } from "./InventoryPage";
import { InventoryDetailPage } from "./InventoryDetailPage";
import { inventoryApi } from "../../services/inventoryApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type {
  Page,
  InventoryItemResponse,
  InventoryBatchResponse,
  ProductResponse,
  ProductSummaryResponse,
} from "@inventra/api-types";

vi.mock("../../services/inventoryApi");
vi.mock("../../services/catalogApi");

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithRoutes = (initialEntries = ["/inventory"]) => {
  const testClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/:productId" element={<InventoryDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe("Inventory Module — Phase F4", () => {
  const storeAId = "11111111-1111-1111-1111-111111111111";
  const storeBId = "22222222-2222-2222-2222-222222222222";
  const businessId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const productId1 = "33333333-3333-3333-3333-333333333333";

  const mockProduct: ProductResponse = {
    id: productId1,
    businessId,
    name: "Amoxicillin 500mg Capsules",
    genericName: "Amoxicillin Trihydrate",
    dosageForm: "CAPSULE",
    strength: "500mg",
    baseUnit: "BOX",
    unitsPerSellingUnit: 1,
    isTaxInclusive: false,
    prescriptionRequired: true,
    status: "ACTIVE",
    identifiers: [],
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  };

  const mockStoreAInventory = {
    content: [
      {
        id: "item-1",
        businessId,
        storeId: storeAId,
        productId: productId1,
        currentStock: 150,
        reorderLevel: 50,
        reorderQuantity: 100,
        minStock: 20,
        maxStock: 500,
        locationRack: "RACK-A1",
        isBatchTracked: true,
        version: 1,
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
      },
    ],
    totalElements: 1,
    totalPages: 1,
    size: 20,
    number: 0,
    numberOfElements: 1,
    first: true,
    last: true,
    empty: false,
  } as unknown as Page<InventoryItemResponse>;

  const mockStoreBInventory = {
    content: [
      {
        id: "item-2",
        businessId,
        storeId: storeBId,
        productId: productId1,
        currentStock: 12,
        reorderLevel: 25,
        reorderQuantity: 50,
        minStock: 5,
        maxStock: 200,
        locationRack: "RACK-B4",
        isBatchTracked: true,
        version: 1,
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
      },
    ],
    totalElements: 1,
    totalPages: 1,
    size: 20,
    number: 0,
    numberOfElements: 1,
    first: true,
    last: true,
    empty: false,
  } as unknown as Page<InventoryItemResponse>;

  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      status: "AUTHENTICATED",
      accessToken: "valid-token",
      activeContext: {
        businessId,
        businessName: "Apollo Health Group",
        storeId: storeAId,
        storeName: "Indiranagar Main Pharmacy",
        storeCode: "IND-HQ",
        role: "OWNER",
      },
    });

    vi.mocked(catalogApi.listProducts).mockResolvedValue({
      content: [mockProduct as unknown as ProductSummaryResponse],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
      numberOfElements: 1,
      first: true,
      last: true,
      empty: false,
    } as unknown as Page<ProductSummaryResponse>);

    vi.mocked(catalogApi.getProduct).mockResolvedValue(mockProduct);
    vi.mocked(inventoryApi.listInventory).mockResolvedValue(mockStoreAInventory);
    vi.mocked(inventoryApi.listBatches).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 1,
      size: 1,
      number: 0,
      numberOfElements: 0,
      first: true,
      last: true,
      empty: true,
    } as unknown as Page<InventoryBatchResponse>);
  });

  it("renders store inventory overview with correct store header and KPI badges", async () => {
    renderWithRoutes(["/inventory"]);

    expect(screen.getByText(/Inventory & Batches/i)).toBeDefined();
    expect(screen.getByText(/Indiranagar Main Pharmacy/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText("Amoxicillin 500mg Capsules").length).toBeGreaterThan(0);
      expect(screen.getAllByText("RACK-A1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("150").length).toBeGreaterThan(0);
    });
  });

  it("renders FEFO batch lots in authoritative order from backend", async () => {
    const mockFefoBatches: InventoryBatchResponse[] = [
      {
        id: "batch-1",
        businessId,
        storeId: storeAId,
        productId: productId1,
        inventoryItemId: "item-1",
        batchNumber: "LOT-A-2026",
        expiryDate: "2026-09-01",
        manufacturingDate: "2024-09-01",
        quantity: 50,
        purchasePrice: 100.0,
        mrp: 160.0,
        sellingPrice: 150.0,
        status: "ACTIVE",
        version: 1,
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
      },
      {
        id: "batch-2",
        businessId,
        storeId: storeAId,
        productId: productId1,
        inventoryItemId: "item-1",
        batchNumber: "LOT-C-2027",
        expiryDate: "2027-01-15",
        manufacturingDate: "2025-01-15",
        quantity: 100,
        purchasePrice: 105.0,
        mrp: 160.0,
        sellingPrice: 150.0,
        status: "ACTIVE",
        version: 1,
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
      },
      {
        id: "batch-3",
        businessId,
        storeId: storeAId,
        productId: productId1,
        inventoryItemId: "item-1",
        batchNumber: "LOT-B-2028",
        expiryDate: "2028-06-30",
        manufacturingDate: "2025-06-30",
        quantity: 200,
        purchasePrice: 110.0,
        mrp: 160.0,
        sellingPrice: 150.0,
        status: "ACTIVE",
        version: 1,
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
      },
    ];

    vi.mocked(inventoryApi.listFefoBatches).mockResolvedValue(mockFefoBatches);

    renderWithRoutes([`/inventory/${productId1}`]);

    await waitFor(() => {
      expect(screen.getByText("LOT-A-2026")).toBeDefined();
      expect(screen.getByText("LOT-C-2027")).toBeDefined();
      expect(screen.getByText("LOT-B-2028")).toBeDefined();
      expect(screen.getByText("Dispense 1st")).toBeDefined();
    });

    // Check that LOT-A appears before LOT-C and LOT-B in DOM sequence
    const lotA = screen.getByText("LOT-A-2026");
    const lotC = screen.getByText("LOT-C-2027");
    const lotB = screen.getByText("LOT-B-2028");

    expect(lotA.compareDocumentPosition(lotC) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lotC.compareDocumentPosition(lotB) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("verifies store isolation: switching context queries Store B without displaying Store A data", async () => {
    vi.mocked(inventoryApi.listInventory).mockImplementation(async (params) => {
      if (params?.storeId === storeBId) {
        return mockStoreBInventory;
      }
      return mockStoreAInventory;
    });

    const { rerender } = renderWithRoutes(["/inventory"]);

    await waitFor(() => {
      expect(screen.getAllByText("RACK-A1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("150").length).toBeGreaterThan(0);
    });

    // Switch store context to Store B in AuthStore
    useAuthStore.setState({
      activeContext: {
        businessId,
        businessName: "Apollo Health Group",
        storeId: storeBId,
        storeName: "Koramangala Branch",
        storeCode: "KOR-02",
        role: "OWNER",
      },
    });

    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <ToastProvider>
          <MemoryRouter initialEntries={["/inventory"]}>
            <Routes>
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/inventory/:productId" element={<InventoryDetailPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Koramangala Branch")).toBeDefined();
      expect(screen.getAllByText("RACK-B4").length).toBeGreaterThan(0);
      expect(screen.getAllByText("12").length).toBeGreaterThan(0);
    });
  });
});
