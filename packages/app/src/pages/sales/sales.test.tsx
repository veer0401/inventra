import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SalesPage } from "./SalesPage";
import { SaleDetailPage } from "./SaleDetailPage";
import { useAuthStore } from "../../stores/authStore";
import { salesApi } from "../../services/salesApi";
import type { SaleResponse } from "@inventra/api-types";

vi.mock("../../services/salesApi", () => ({
  salesApi: {
    listSales: vi.fn(),
    getSale: vi.fn(),
    getReceipt: vi.fn(),
    voidSale: vi.fn(),
  },
}));

const mockSale: SaleResponse = {
  id: "0194eb84-sale-001",
  businessId: "biz-1",
  storeId: "store-1",
  saleNumber: "SALE-MAIN-000001",
  invoiceNumber: "INV-MAIN-000001",
  status: "COMPLETED",
  saleDate: "2026-08-27",
  customerName: "John Doe",
  customerPhone: "9876543210",
  prescriptionRequired: true,
  subtotal: 100.0,
  taxAmount: 12.0,
  discountAmount: 0,
  roundOffAmount: 0,
  totalAmount: 112.0,
  paidAmount: 112.0,
  changeAmount: 0,
  cashierId: "user-1",
  lines: [
    {
      id: "line-1",
      productId: "prod-1",
      lineNumber: 1,
      productName: "Augmentin 625 Duo",
      genericName: "Amoxicillin + Clavulanic Acid",
      sellingUnit: "STRIP",
      conversionFactor: 10,
      quantity: 1,
      baseQuantity: 10,
      unitPrice: 100.0,
      grossAmount: 100.0,
      discountPercentage: 0,
      discountAmount: 0,
      taxRate: 12,
      taxAmount: 12.0,
      lineTotal: 112.0,
      returnedQuantity: 0,
      allocations: [
        {
          id: "alloc-1",
          batchId: "batch-1",
          productId: "prod-1",
          batchNumber: "AUG-001",
          expiryDate: "2027-05-30",
          allocatedBaseQuantity: 10,
          unitCost: 70.0,
          mrp: 120.0,
          sellingPrice: 100.0,
        },
      ],
    },
  ],
  payments: [
    {
      id: "pay-1",
      paymentMethod: "CASH",
      amount: 112.0,
      tenderedAmount: 112.0,
      changeAmount: 0,
      status: "SUCCESS",
    },
  ],
  createdAt: "2026-08-27T10:00:00Z",
};

function renderWithRouter(ui: React.ReactElement, initialEntries = ["/sales"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Sales & Invoices Pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "owner@inventra.local",
        fullName: "Owner Bob",
        role: "OWNER",
        permissions: [],
      } as any,
      activeContext: {
        businessId: "biz-1",
        businessName: "Inventra Pharmacy",
        storeId: "store-1",
        storeName: "Main Branch",
        role: "OWNER",
      },
    });
  });

  describe("SalesPage", () => {
    it("renders sales table with records, status, and total amount", async () => {
      vi.mocked(salesApi.listSales).mockResolvedValueOnce({
        content: [mockSale],
        number: 0,
        size: 15,
        totalElements: 1,
        totalPages: 1,
        numberOfElements: 1,
        first: true,
        last: true,
        empty: false,
        pageable: {} as any,
      });

      renderWithRouter(<SalesPage />);

      expect(screen.getByText("Sales & Invoices")).toBeDefined();
      expect(await screen.findByText("SALE-MAIN-000001")).toBeDefined();
      expect(screen.getByText("INV-MAIN-000001")).toBeDefined();
      expect(screen.getByText("John Doe")).toBeDefined();
      expect(screen.getByText("₹112.00")).toBeDefined();
      expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    });
  });

  describe("SaleDetailPage", () => {
    it("renders sale detail breakdown, lot allocations, and void action", async () => {
      vi.mocked(salesApi.getSale).mockResolvedValueOnce(mockSale);

      renderWithRouter(
        <Routes>
          <Route path="/sales/:id" element={<SaleDetailPage />} />
        </Routes>,
        ["/sales/0194eb84-sale-001"]
      );

      expect(await screen.findByText("SALE-MAIN-000001")).toBeDefined();
      expect(screen.getByText("Augmentin 625 Duo")).toBeDefined();
      expect(screen.getByText(/Lot: AUG-001/i)).toBeDefined();
      expect(screen.getByText("Void Sale")).toBeDefined();
    });
  });
});
