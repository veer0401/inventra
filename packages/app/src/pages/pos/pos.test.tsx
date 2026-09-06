import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { PosPage } from "./PosPage";
import { useAuthStore } from "../../stores/authStore";
import { usePosCartStore } from "../../stores/posCartStore";
import { salesApi } from "../../services/salesApi";
import type { PosProductSearchResponse, SaleResponse } from "@inventra/api-types";

vi.mock("../../services/salesApi", () => ({
  salesApi: {
    searchPosProducts: vi.fn(),
    checkoutSale: vi.fn(),
    getReceipt: vi.fn(),
  },
}));

const mockProduct: PosProductSearchResponse = {
  id: "0194eb84-a4f6-7b81-a982-123456789012",
  name: "Paracetamol 500mg Tablets",
  genericName: "Paracetamol",
  dosageForm: "TABLET",
  strength: "500mg",
  baseUnit: "TABLET",
  sellingUnit: "STRIP",
  unitsPerSellingUnit: 10,
  taxRate: 12,
  isTaxInclusive: false,
  prescriptionRequired: true,
  currentStock: 100,
  isBatchTracked: true,
  fefoSellingPrice: 45.0,
  fefoBatchNumber: "PCM-001",
  fefoExpiryDate: "2027-01-01",
};

const mockCompletedSale: SaleResponse = {
  id: "0194eb84-sale-001",
  businessId: "biz-1",
  storeId: "store-1",
  saleNumber: "SALE-STR-000001",
  invoiceNumber: "INV-STR-000001",
  status: "COMPLETED",
  saleDate: "2026-08-27",
  subtotal: 45.0,
  taxAmount: 5.4,
  discountAmount: 0,
  roundOffAmount: 0,
  totalAmount: 50.4,
  paidAmount: 50.4,
  changeAmount: 0,
  prescriptionRequired: true,
  cashierId: "user-1",
  lines: [
    {
      id: "line-1",
      productId: "0194eb84-a4f6-7b81-a982-123456789012",
      lineNumber: 1,
      productName: "Paracetamol 500mg Tablets",
      sellingUnit: "STRIP",
      conversionFactor: 10,
      quantity: 1,
      baseQuantity: 10,
      unitPrice: 45.0,
      grossAmount: 45.0,
      discountPercentage: 0,
      discountAmount: 0,
      taxRate: 12,
      taxAmount: 5.4,
      lineTotal: 50.4,
      returnedQuantity: 0,
      allocations: [
        {
          id: "alloc-1",
          batchId: "batch-1",
          productId: "0194eb84-a4f6-7b81-a982-123456789012",
          batchNumber: "PCM-001",
          expiryDate: "2027-01-01",
          allocatedBaseQuantity: 10,
          unitCost: 15.0,
          mrp: 50.0,
          sellingPrice: 45.0,
        },
      ],
    },
  ],
  payments: [
    {
      id: "pay-1",
      paymentMethod: "CASH",
      amount: 50.4,
      tenderedAmount: 60.0,
      changeAmount: 9.6,
      status: "SUCCESS",
    },
  ],
  createdAt: "2026-08-27T10:00:00Z",
};

function renderPosPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PosPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PosPage — Phase F6 POS Foundation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePosCartStore.getState().reset();

    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "cashier@inventra.local",
        fullName: "Jane Cashier",
        role: "CASHIER",
        permissions: [],
      } as any,
      activeContext: {
        businessId: "biz-1",
        businessName: "Inventra Pharmacy",
        storeId: "store-1",
        storeName: "Main Branch",
        role: "CASHIER",
      },
    });
  });

  it("renders POS header, store badge, and empty cart state", () => {
    renderPosPage();

    expect(screen.getByText("POS Terminal")).toBeDefined();
    expect(screen.getByText("Main Branch")).toBeDefined();
    expect(screen.getByText("Jane Cashier")).toBeDefined();
    expect(screen.getByText("Cart is Empty")).toBeDefined();
    expect(screen.getByPlaceholderText(/Scan Barcode or Search Medicine/i)).toBeDefined();
  });

  it("searches products and adds medicine to cart with FEFO batch details", async () => {
    vi.mocked(salesApi.searchPosProducts).mockResolvedValueOnce({
      content: [mockProduct],
      number: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      numberOfElements: 1,
      first: true,
      last: true,
      empty: false,
      pageable: {} as any,
    });

    renderPosPage();

    const searchInput = screen.getByPlaceholderText(/Scan Barcode or Search Medicine/i);
    fireEvent.change(searchInput, { target: { value: "Paracetamol" } });

    await waitFor(() => {
      expect(salesApi.searchPosProducts).toHaveBeenCalledWith(
        expect.objectContaining({ q: "Paracetamol", storeId: "store-1" })
      );
    });

    // Click product card to add to cart
    const productCard = await screen.findByText("Paracetamol 500mg Tablets");
    fireEvent.click(productCard);

    // Verify item added to cart
    expect(usePosCartStore.getState().items).toHaveLength(1);
    expect(screen.getByText("Prescription required — Verify doctor's physical slip")).toBeDefined();
    expect(screen.getByText("₹50.40")).toBeDefined(); // 45 + 12% tax = 50.40
  });

  it("opens checkout modal and submits successful sale", async () => {
    vi.mocked(salesApi.checkoutSale).mockResolvedValueOnce(mockCompletedSale);

    // Pre-fill cart with item
    usePosCartStore.getState().setContext("biz-1", "store-1");
    usePosCartStore.getState().addItem(mockProduct);

    renderPosPage();

    // Click Pay & Settle button
    const payBtn = screen.getByRole("button", { name: /Pay & Settle/i });
    fireEvent.click(payBtn);

    // Verify modal is open
    expect(screen.getByText("Payment & Checkout")).toBeDefined();

    // Enter customer name
    const customerInput = screen.getByPlaceholderText("Walk-in Customer");
    fireEvent.change(customerInput, { target: { value: "Alice Smith" } });

    // Submit checkout
    const completeBtn = screen.getByRole("button", { name: /Complete Sale/i });
    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(salesApi.checkoutSale).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: "store-1",
          customerName: "Alice Smith",
          lines: [
            expect.objectContaining({
              productId: mockProduct.id,
              quantity: 1,
            }),
          ],
        })
      );
    });

    // Verify success modal displayed
    expect(await screen.findByText("Sale Completed!")).toBeDefined();
    expect(screen.getByText(/SALE-STR-000001/i)).toBeDefined();
  });
});
