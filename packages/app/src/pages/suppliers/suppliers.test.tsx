import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@inventra/ui";
import { SuppliersPage } from "./SuppliersPage";
import { SupplierDetailPage } from "./SupplierDetailPage";
import { purchasingApi } from "../../services/purchasingApi";
import { useAuthStore } from "../../stores/authStore";
import type { Page, SupplierResponse, SupplierProductResponse, GoodsReceiptSummaryResponse } from "@inventra/api-types";

vi.mock("../../services/purchasingApi");
vi.mock("../../services/catalogApi");

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithRoutes = (initialEntries = ["/suppliers"]) => {
  const testClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/suppliers/:supplierId" element={<SupplierDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe("Suppliers Module — Phase F4", () => {
  const businessId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const supplierId1 = "ssssssss-ssss-ssss-ssss-ssssssssssss";

  const mockSupplier: SupplierResponse = {
    id: supplierId1,
    businessId,
    supplierCode: "SUP-CIPLA-01",
    legalName: "Cipla Pharmaceuticals Ltd",
    tradeName: "Cipla Healthcare",
    supplierType: "MANUFACTURER",
    gstin: "29AABCC1234D1Z5",
    drugLicenseNumber: "DL-KA-2024-9988",
    pan: "AABCC1234D",
    email: "orders@cipla.com",
    phoneNumber: "+91 9876543210",
    contactPersonName: "Rajesh Sharma",
    addressLine1: "Plot 45, Peenya Industrial Area",
    addressLine2: null,
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560058",
    paymentTermsDays: 30,
    creditLimit: 500000,
    status: "ACTIVE",
    notes: "Preferred distributor for antibiotics",
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  };

  const mockSuppliersPage = {
    content: [mockSupplier],
    totalElements: 1,
    totalPages: 1,
    size: 20,
    number: 0,
    numberOfElements: 1,
    first: true,
    last: true,
    empty: false,
  } as unknown as Page<SupplierResponse>;

  const mockProducts: SupplierProductResponse[] = [
    {
      id: "sp-1",
      businessId,
      supplierId: supplierId1,
      productId: "prod-1",
      supplierProductCode: "CIP-AMX-500",
      supplierProductName: "Amoxicillin 500mg",
      purchaseUnit: "BOX",
      conversionFactor: 10,
      lastPurchasePrice: 85.0,
      isPreferred: true,
      minOrderQuantity: 5,
      leadTimeDays: 3,
      status: "ACTIVE",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      status: "AUTHENTICATED",
      accessToken: "valid-token",
      activeContext: {
        businessId,
        businessName: "Apollo Health Group",
        storeId: "store-1",
        storeName: "Indiranagar Main Pharmacy",
        storeCode: "IND-HQ",
        role: "OWNER",
      },
    });

    vi.mocked(purchasingApi.listSuppliers).mockResolvedValue(mockSuppliersPage);
    vi.mocked(purchasingApi.getSupplier).mockResolvedValue(mockSupplier);
    vi.mocked(purchasingApi.listSupplierProducts).mockResolvedValue(mockProducts);
    vi.mocked(purchasingApi.listGoodsReceipts).mockResolvedValue({
      content: [],
      totalElements: 0,
      totalPages: 1,
      size: 20,
      number: 0,
      numberOfElements: 0,
      first: true,
      last: true,
      empty: true,
    } as unknown as Page<GoodsReceiptSummaryResponse>);
  });

  it("renders supplier registry with credentials and type badge", async () => {
    renderWithRoutes(["/suppliers"]);

    expect(screen.getByText(/Suppliers & Vendors/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText("Cipla Pharmaceuticals Ltd").length).toBeGreaterThan(0);
      expect(screen.getAllByText("MANUFACTURER").length).toBeGreaterThan(0);
      expect(screen.getAllByText(/DL-KA-2024-9988/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText("30 Days").length).toBeGreaterThan(0);
      expect(screen.getAllByText("ACTIVE").length).toBeGreaterThan(0);
    });
  });

  it("renders detailed supplier profile and supplied products catalog", async () => {
    renderWithRoutes([`/suppliers/${supplierId1}`]);

    await waitFor(() => {
      expect(screen.getAllByText("Cipla Pharmaceuticals Ltd").length).toBeGreaterThan(0);
      expect(screen.getByText("Rajesh Sharma")).toBeDefined();
      expect(screen.getByText("orders@cipla.com")).toBeDefined();
      expect(screen.getByText(/Supplied Products \(1\)/i)).toBeDefined();
      expect(screen.getByText(/CIP-AMX-500/i)).toBeDefined();
    });
  });
});
