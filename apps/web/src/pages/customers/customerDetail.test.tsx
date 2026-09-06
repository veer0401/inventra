import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CustomerDetailPage } from "./CustomerDetailPage";
import { customerApi } from "../../services/customerApi";
import { usePosCartStore } from "../../stores/posCartStore";
import type { CustomerResponse } from "@inventra/api-types";

vi.mock("../../services/customerApi", () => ({
  customerApi: {
    getCustomer: vi.fn(),
    getCustomerSales: vi.fn(),
    getCustomerReturns: vi.fn(),
    updateCustomer: vi.fn(),
  },
}));

const mockCustomer: CustomerResponse = {
  id: "cust-01",
  businessId: "biz-1",
  customerCode: "CUST-000001",
  fullName: "Rahul Sharma",
  phone: "9876543210",
  email: "rahul@example.com",
  address: "42 MG Road, Mumbai",
  gstin: "27AAAAA0000A1Z5",
  notes: "Allergic to penicillin",
  status: "ACTIVE",
  version: 0,
  createdAt: "2026-08-27T10:00:00Z",
  updatedAt: "2026-08-27T10:00:00Z",
  statistics: {
    totalSalesCount: 5,
    totalSpendAmount: 1450.5,
    totalReturnsCount: 1,
    totalRefundAmount: 120.0,
    lastPurchaseDate: "2026-08-25",
  },
};

describe("CustomerDetailPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    usePosCartStore.getState().clearCart();

    vi.mocked(customerApi.getCustomer).mockResolvedValue(mockCustomer);
    vi.mocked(customerApi.getCustomerSales).mockResolvedValue({
      content: [],
      number: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      numberOfElements: 0,
      first: true,
      last: true,
      empty: true,
      pageable: {} as any,
    });
    vi.mocked(customerApi.getCustomerReturns).mockResolvedValue({
      content: [],
      number: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      numberOfElements: 0,
      first: true,
      last: true,
      empty: true,
      pageable: {} as any,
    });
  });

  it("renders customer profile details and KPI summary stats", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/customers/cust-01"]}>
          <Routes>
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.getByText("CUST-000001")).toBeInTheDocument();
      expect(screen.getAllByText("9876543210").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("rahul@example.com").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("42 MG Road, Mumbai")).toBeInTheDocument();
      expect(screen.getAllByText(/27AAAAA0000A1Z5/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/allergic to penicillin/i)).toBeInTheDocument();
    });

    // Check KPI statistics
    expect(screen.getByText("₹1,450.50")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument(); // 5 completed invoices
  });

  it("switches tabs between overview, purchase history, and return history", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/customers/cust-01"]}>
          <Routes>
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
    });

    const salesTab = screen.getByRole("button", { name: /purchase history/i });
    fireEvent.click(salesTab);

    await waitFor(() => {
      expect(customerApi.getCustomerSales).toHaveBeenCalledWith("cust-01", 0, 10);
    });

    const returnsTab = screen.getByRole("button", { name: /returns history/i });
    fireEvent.click(returnsTab);

    await waitFor(() => {
      expect(customerApi.getCustomerReturns).toHaveBeenCalledWith("cust-01", 0, 10);
    });
  });

  it("attaches customer to POS cart when clicking New Sale at POS", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/customers/cust-01"]}>
          <Routes>
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/pos" element={<div>POS Terminal Mock</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
    });

    const posBtn = screen.getByRole("button", { name: /new sale at pos/i });
    fireEvent.click(posBtn);

    const posState = usePosCartStore.getState();
    expect(posState.customerId).toBe("cust-01");
    expect(posState.customerName).toBe("Rahul Sharma");
    expect(posState.customerPhone).toBe("9876543210");
  });
});
