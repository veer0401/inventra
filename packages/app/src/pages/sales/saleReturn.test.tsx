import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SaleReturnWorkflowPage } from "./SaleReturnWorkflowPage";
import { salesApi } from "../../services/salesApi";
import type { SaleResponse, SaleReturnResponse } from "@inventra/api-types";

vi.mock("../../services/salesApi", () => ({
  salesApi: {
    getSale: vi.fn(),
    createSaleReturn: vi.fn(),
  },
}));

const mockSale: SaleResponse = {
  id: "sale-01",
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
  createdAt: "2026-08-27T10:00:00Z",
  lines: [
    {
      id: "line-01",
      productId: "prod-01",
      lineNumber: 1,
      productName: "Augmentin 625 Duo",
      genericName: "Amoxicillin",
      sellingUnit: "STRIP",
      conversionFactor: 10,
      quantity: 2,
      baseQuantity: 20,
      unitPrice: 50.0,
      grossAmount: 100.0,
      discountPercentage: 0,
      discountAmount: 0,
      taxRate: 12,
      taxAmount: 12.0,
      lineTotal: 112.0,
      returnedQuantity: 0,
      allocations: [
        {
          id: "alloc-01",
          batchId: "batch-01",
          productId: "prod-01",
          batchNumber: "AUG-B1",
          expiryDate: "2027-08-31",
          allocatedBaseQuantity: 20,
          unitCost: 35.0,
          mrp: 60.0,
          sellingPrice: 50.0,
        },
      ],
    },
  ],
  payments: [],
};

const mockCreatedReturn: SaleReturnResponse = {
  id: "ret-01",
  businessId: "biz-1",
  storeId: "store-1",
  saleId: "sale-01",
  returnNumber: "RET-MAIN-000001",
  returnDate: "2026-08-27",
  reason: "CUSTOMER_CHANGED_MIND",
  status: "COMPLETED",
  subtotal: 50.0,
  discountAmount: 0,
  taxAmount: 6.0,
  roundOffAmount: 0,
  totalRefundAmount: 56.0,
  returnedBy: "user-1",
  createdAt: "2026-08-27T12:00:00Z",
  lines: [
    {
      id: "ret-line-01",
      saleLineId: "line-01",
      productId: "prod-01",
      lineNumber: 1,
      quantity: 1,
      baseQuantity: 10,
      unitRefundPrice: 50.0,
      taxRate: 12,
      taxAmount: 6.0,
      lineTotal: 56.0,
      allocations: [
        {
          id: "ret-alloc-01",
          saleLineBatchAllocationId: "alloc-01",
          batchId: "batch-01",
          productId: "prod-01",
          returnedBaseQuantity: 10,
          stockCondition: "RESTOCKABLE",
        },
      ],
    },
  ],
  refunds: [
    {
      id: "refund-01",
      refundMethod: "CASH",
      amount: 56.0,
      transactionReference: undefined,
      notes: undefined,
      refundedAt: "2026-08-27T12:00:00Z",
    },
  ],
};

describe("SaleReturnWorkflowPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    vi.mocked(salesApi.getSale).mockResolvedValue(mockSale);
    vi.mocked(salesApi.createSaleReturn).mockResolvedValue(mockCreatedReturn);
  });

  it("renders original sale items and allows item selection with refund calculation", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/sales/sale-01/return"]}>
          <Routes>
            <Route path="/sales/:id/return" element={<SaleReturnWorkflowPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Process Sales Return")).toBeInTheDocument();
      expect(screen.getByText("SALE-MAIN-000001")).toBeInTheDocument();
      expect(screen.getByText("Augmentin 625 Duo")).toBeInTheDocument();
    });

    // Toggle item selection
    const toggleBtn = screen.getByText("Toggle All Eligible");
    fireEvent.click(toggleBtn);

    // Quantity selector should appear
    await waitFor(() => {
      expect(screen.getByText(/return qty:/i)).toBeInTheDocument();
    });

    // Submit return
    const submitBtn = screen.getByRole("button", { name: /confirm & process return/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(salesApi.createSaleReturn).toHaveBeenCalledWith(
        "sale-01",
        expect.objectContaining({
          reason: "CUSTOMER_CHANGED_MIND",
          lines: expect.arrayContaining([
            expect.objectContaining({
              saleLineId: "line-01",
              quantity: 2,
            }),
          ]),
        })
      );
      expect(screen.getByText("Return Processed Successfully!")).toBeInTheDocument();
      expect(screen.getAllByText("RET-MAIN-000001").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("disallows returns if sale status is VOIDED", async () => {
    vi.mocked(salesApi.getSale).mockResolvedValue({
      ...mockSale,
      status: "VOIDED",
      voidReason: "Entered by mistake",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/sales/sale-01/return"]}>
          <Routes>
            <Route path="/sales/:id/return" element={<SaleReturnWorkflowPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Cannot Return Voided Sale")).toBeInTheDocument();
      expect(screen.getByText(/void reason:/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /confirm & process return/i })).not.toBeInTheDocument();
    });
  });
});
