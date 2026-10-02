import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@inventra/ui";
import { GoodsReceiptsPage } from "./GoodsReceiptsPage";
import { GoodsReceiptDetailPage } from "./GoodsReceiptDetailPage";
import { GoodsReceiptCreatePage } from "./GoodsReceiptCreatePage";
import { purchasingApi } from "../../services/purchasingApi";
import { catalogApi } from "../../services/catalogApi";
import { useAuthStore } from "../../stores/authStore";
import type {
  Page,
  GoodsReceiptSummaryResponse,
  GoodsReceiptResponse,
  PurchaseOrderResponse,
} from "@inventra/api-types";

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

const renderWithRoutes = (initialEntries = ["/goods-receipts"]) => {
  const testClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/goods-receipts" element={<GoodsReceiptsPage />} />
            <Route path="/goods-receipts/new" element={<GoodsReceiptCreatePage />} />
            <Route path="/goods-receipts/:receiptId" element={<GoodsReceiptDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe("Goods Receipts (GRN) Module — Phase F4", () => {
  const storeId = "11111111-1111-1111-1111-111111111111";
  const businessId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
  const receiptId1 = "rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr";

  const mockReceiptSummary: GoodsReceiptSummaryResponse = {
    id: receiptId1,
    businessId,
    storeId,
    supplierId: "supp-1",
    purchaseOrderId: null,
    receiptNumber: "GRN-2026-0001",
    vendorDeliveryNote: "DC-9921",
    receivedDate: "2026-08-25",
    status: "DRAFT",
    totalItems: 2,
    totalReceivedQuantity: 30,
    totalAmount: 3360.0,
  };

  const mockReceiptDetail: GoodsReceiptResponse = {
    id: receiptId1,
    businessId,
    storeId,
    supplierId: "supp-1",
    purchaseOrderId: null,
    receiptNumber: "GRN-2026-0001",
    vendorDeliveryNote: "DC-9921",
    receivedDate: "2026-08-25",
    status: "DRAFT",
    totalItems: 2,
    totalReceivedQuantity: 30,
    totalAmount: 3360.0,
    postedAt: null,
    postedBy: null,
    notes: "Temperature controlled",
    idempotencyKey: null,
    version: 1,
    lines: [
      {
        id: "line-1",
        businessId,
        goodsReceiptId: receiptId1,
        purchaseOrderLineId: null,
        productId: "prod-1",
        lineNumber: 1,
        receivedQuantity: 20,
        purchaseUnit: "BOX",
        conversionFactor: 10,
        receivedBaseQuantity: 200,
        rejectedQuantity: 0,
        batchNumber: "LOT-AUG-2026",
        manufacturingDate: "2025-01-01",
        expiryDate: "2027-01-01",
        unitCost: 100.0,
        baseUnitCost: 10.0,
        mrp: 150.0,
        sellingPrice: 140.0,
        taxRate: 12.0,
        taxAmount: 240.0,
        lineTotal: 2240.0,
        inventoryBatchId: null,
      },
    ],
    createdAt: "2026-08-25T00:00:00Z",
    updatedAt: "2026-08-25T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      status: "AUTHENTICATED",
      accessToken: "valid-token",
      activeContext: {
        businessId,
        businessName: "Apollo Health Group",
        storeId,
        storeName: "Indiranagar Main Pharmacy",
        storeCode: "IND-HQ",
        role: "OWNER",
      },
    });

    vi.mocked(purchasingApi.listGoodsReceipts).mockResolvedValue({
      content: [mockReceiptSummary],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      numberOfElements: 1,
      first: true,
      last: true,
      empty: false,
    } as unknown as Page<GoodsReceiptSummaryResponse>);

    vi.mocked(purchasingApi.getGoodsReceipt).mockResolvedValue(mockReceiptDetail);
    vi.mocked(purchasingApi.postGoodsReceipt).mockResolvedValue({
      ...mockReceiptDetail,
      status: "POSTED",
      postedAt: "2026-08-25T12:00:00Z",
    });
  });

  it("renders goods receipt registry with receiving branch banner", async () => {
    renderWithRoutes(["/goods-receipts"]);

    expect(screen.getByText(/Goods Receipts \(GRN\)/i)).toBeDefined();
    expect(screen.getByText(/Indiranagar Main Pharmacy/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("GRN-2026-0001")).toBeDefined();
      expect(screen.getByText("DC-9921")).toBeDefined();
      expect(screen.getByText("Draft")).toBeDefined();
    });
  });

  it("opens post confirmation modal and triggers post goods receipt mutation", async () => {
    renderWithRoutes([`/goods-receipts/${receiptId1}`]);

    await waitFor(() => {
      expect(screen.getByText("GRN-2026-0001")).toBeDefined();
      expect(screen.getByText("LOT-AUG-2026")).toBeDefined();
      expect(screen.getByText("Post Goods Receipt")).toBeDefined();
    });

    // Click "Post Goods Receipt" to trigger confirmation modal
    fireEvent.click(screen.getByText("Post Goods Receipt"));

    await waitFor(() => {
      expect(screen.getByText(/Post Goods Receipt & Commit Stock/i)).toBeDefined();
    });

    // Click "Confirm & Post Receipt" button in dialog
    fireEvent.click(screen.getByText("Confirm & Post Receipt"));

    await waitFor(() => {
      expect(purchasingApi.postGoodsReceipt).toHaveBeenCalledWith(receiptId1);
    });
  });

  it("pre-fills PO lines with exact ordered quantity and unit cost on GRN create page", async () => {
    const mockPo: PurchaseOrderResponse = {
      id: "po-1",
      businessId,
      storeId,
      supplierId: "supp-1",
      orderNumber: "PO-2026-0099",
      status: "CONFIRMED",
      orderDate: "2026-08-25",
      subtotal: 2204.0,
      taxAmount: 264.48,
      discountAmount: 0,
      totalAmount: 2468.48,
      lines: [
        {
          id: "po-line-1",
          productId: "prod-1",
          lineNumber: 1,
          orderedQuantity: 8,
          receivedQuantity: 0,
          purchaseUnit: "BOX",
          conversionFactor: 10,
          unitCost: 275.50,
          taxRate: 12,
          taxAmount: 264.48,
          lineTotal: 2468.48,
        },
      ],
      createdAt: "2026-08-25T00:00:00Z",
      updatedAt: "2026-08-25T00:00:00Z",
    };

    vi.mocked(purchasingApi.getPurchaseOrder).mockResolvedValue(mockPo);
    vi.mocked(purchasingApi.listSuppliers).mockResolvedValue({
      content: [
        { id: "supp-1", legalName: "MedLife Pharmaceuticals", supplierCode: "SUPP-001" } as any,
      ],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
      numberOfElements: 1,
      first: true,
      last: true,
      empty: false,
    } as unknown as Page<any>);
    vi.mocked(catalogApi.listProducts).mockResolvedValue({
      content: [
        { id: "prod-1", name: "Amoxicillin 500mg Capsules", taxRate: 12 } as any,
      ],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
      numberOfElements: 1,
      first: true,
      last: true,
      empty: false,
    } as unknown as Page<any>);

    renderWithRoutes(["/goods-receipts/new?purchaseOrderId=po-1&supplierId=supp-1"]);

    // Verify PO banner appears
    await waitFor(() => {
      expect(screen.getByText("PO-2026-0099")).toBeDefined();
    });

    // Verify line item is pre-filled with PO's exact 8 BOX and ₹275.50 (NOT dummy 10 or 100)
    await waitFor(() => {
      expect(screen.getByText("8 BOX")).toBeDefined();
      expect(screen.getByText("₹275.50")).toBeDefined();
      expect(screen.getByText("PO Linked Item")).toBeDefined();
    });
  });

  it("allows editing an existing prefilled line and updates values in table", async () => {
    const mockPo: PurchaseOrderResponse = {
      id: "po-2",
      businessId,
      storeId,
      supplierId: "supp-1",
      orderNumber: "PO-2026-0100",
      status: "CONFIRMED",
      orderDate: "2026-08-25",
      subtotal: 1000.0,
      taxAmount: 120.0,
      discountAmount: 0,
      totalAmount: 1120.0,
      lines: [
        {
          id: "po-line-2",
          productId: "prod-1",
          lineNumber: 1,
          orderedQuantity: 5,
          receivedQuantity: 0,
          purchaseUnit: "BOX",
          conversionFactor: 10,
          unitCost: 200.00,
          taxRate: 12,
          taxAmount: 120.0,
          lineTotal: 1120.0,
        },
      ],
      createdAt: "2026-08-25T00:00:00Z",
      updatedAt: "2026-08-25T00:00:00Z",
    };

    vi.mocked(purchasingApi.getPurchaseOrder).mockResolvedValue(mockPo);
    vi.mocked(purchasingApi.listSuppliers).mockResolvedValue({
      content: [
        { id: "supp-1", legalName: "MedLife Pharmaceuticals", supplierCode: "SUPP-001" } as any,
      ],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
      numberOfElements: 1,
      first: true,
      last: true,
      empty: false,
    } as unknown as Page<any>);
    vi.mocked(catalogApi.listProducts).mockResolvedValue({
      content: [
        { id: "prod-1", name: "Amoxicillin 500mg Capsules", taxRate: 12 } as any,
      ],
      totalElements: 1,
      totalPages: 1,
      size: 100,
      number: 0,
      numberOfElements: 1,
      first: true,
      last: true,
      empty: false,
    } as unknown as Page<any>);

    renderWithRoutes(["/goods-receipts/new?purchaseOrderId=po-2&supplierId=supp-1"]);

    await waitFor(() => {
      expect(screen.getByText("5 BOX")).toBeDefined();
      expect(screen.getByText("₹200.00")).toBeDefined();
    });

    // Click Edit button on the row
    const editBtn = screen.getByTitle("Edit Line Item");
    fireEvent.click(editBtn);

    // Verify editor switches to EDITING LINE mode
    await waitFor(() => {
      expect(screen.getByText("EDITING LINE")).toBeDefined();
      expect(screen.getByText("Update Line Item")).toBeDefined();
    });

    // Change received quantity from 5 to 4 (e.g. only 4 boxes arrived)
    const qtyInput = screen.getByPlaceholderText("e.g. 5");
    fireEvent.change(qtyInput, { target: { value: "4" } });

    // Change unit cost from 200 to 195
    const costInput = screen.getByPlaceholderText("Cost e.g. 100.00");
    fireEvent.change(costInput, { target: { value: "195" } });

    // Click "Update Line Item"
    fireEvent.click(screen.getByText("Update Line Item"));

    // Verify the table now shows updated 4 BOX and ₹195.00
    await waitFor(() => {
      expect(screen.getByText("4 BOX")).toBeDefined();
      expect(screen.getByText("₹195.00")).toBeDefined();
    });
  });
});

