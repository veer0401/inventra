import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReturnsPage } from "./ReturnsPage";
import { ReturnDetailPage } from "./ReturnDetailPage";
import { salesApi } from "../../services/salesApi";
import type { SaleReturnResponse } from "@inventra/api-types";

vi.mock("../../services/salesApi", () => ({
  salesApi: {
    listReturns: vi.fn(),
    getSaleReturn: vi.fn(),
    getSale: vi.fn(),
  },
}));

const mockReturns: SaleReturnResponse[] = [
  {
    id: "ret-01",
    businessId: "biz-1",
    storeId: "store-1",
    saleId: "sale-01",
    returnNumber: "RET-MAIN-000001",
    returnDate: "2026-08-27",
    reason: "Damaged packaging",
    status: "COMPLETED",
    subtotal: 50.0,
    discountAmount: 0,
    taxAmount: 6.0,
    roundOffAmount: 0,
    totalRefundAmount: 56.0,
    returnedBy: "user-1",
    createdAt: "2026-08-27T12:00:00Z",
    lines: [],
    refunds: [],
  },
];

describe("ReturnsPage and ReturnDetailPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    vi.mocked(salesApi.listReturns).mockResolvedValue({
      content: mockReturns,
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
  });

  it("renders list of sales returns with status and refund amounts", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ReturnsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Sales Returns & Credit Notes")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("RET-MAIN-000001")).toBeInTheDocument();
      expect(screen.getByText("Damaged packaging")).toBeInTheDocument();
      expect(screen.getByText("₹56.00")).toBeInTheDocument();
      expect(screen.getByText("COMPLETED")).toBeInTheDocument();
    });
  });

  it("renders return detail page with financial breakdown and lines", async () => {
    vi.mocked(salesApi.getSaleReturn).mockResolvedValue(mockReturns[0]);

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/returns/ret-01"]}>
          <Routes>
            <Route path="/returns/:id" element={<ReturnDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Sales Return RET-MAIN-000001/i);
      expect(screen.getByText("Total Refund")).toBeInTheDocument();
      expect(screen.getAllByText("₹56.00").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Print Return Credit Note")).toBeInTheDocument();
    });
  });
});
