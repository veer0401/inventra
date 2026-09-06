import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CustomersPage } from "./CustomersPage";
import { customerApi } from "../../services/customerApi";
import type { CustomerSummaryResponse } from "@inventra/api-types";

vi.mock("../../services/customerApi", () => ({
  customerApi: {
    listCustomers: vi.fn(),
    getCustomer: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    searchCustomers: vi.fn(),
  },
}));

const mockCustomers: CustomerSummaryResponse[] = [
  {
    id: "cust-01",
    customerCode: "CUST-000001",
    fullName: "Rahul Sharma",
    phone: "9876543210",
    email: "rahul@example.com",
    status: "ACTIVE",
    createdAt: "2026-08-27T10:00:00Z",
  },
  {
    id: "cust-02",
    customerCode: "CUST-000002",
    fullName: "Priya Patel",
    phone: "9811223344",
    email: null,
    status: "INACTIVE",
    createdAt: "2026-08-27T11:00:00Z",
  },
];

describe("CustomersPage", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    vi.mocked(customerApi.listCustomers).mockResolvedValue({
      content: mockCustomers,
      number: 0,
      size: 20,
      totalElements: 2,
      totalPages: 1,
      numberOfElements: 2,
      first: true,
      last: true,
      empty: false,
      pageable: {} as any,
    });
  });

  it("renders customer directory table with records", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomersPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(screen.getByText("Customer Management")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();
      expect(screen.getByText("CUST-000001")).toBeInTheDocument();
      expect(screen.getByText("9876543210")).toBeInTheDocument();
      expect(screen.getByText("Priya Patel")).toBeInTheDocument();
      expect(screen.getByText("CUST-000002")).toBeInTheDocument();
    });
  });

  it("triggers search and updates filter parameters", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomersPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText(/search by name, phone/i);
    fireEvent.change(searchInput, { target: { value: "Rahul" } });

    await waitFor(() => {
      expect(customerApi.listCustomers).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "Rahul",
        })
      );
    });
  });

  it("opens create customer modal on button click", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CustomersPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const addBtn = screen.getByRole("button", { name: /add customer/i });
    fireEvent.click(addBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Register New Customer")).toBeInTheDocument();
  });
});
