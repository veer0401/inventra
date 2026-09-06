import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CustomerSelectModal } from "./CustomerSelectModal";
import { customerApi } from "../../services/customerApi";
import type { CustomerSummaryResponse } from "@inventra/api-types";

vi.mock("../../services/customerApi", () => ({
  customerApi: {
    searchCustomers: vi.fn(),
    createCustomer: vi.fn(),
  },
}));

const mockResults: CustomerSummaryResponse[] = [
  {
    id: "cust-01",
    customerCode: "CUST-000001",
    fullName: "Amit Verma",
    phone: "9876543210",
    email: "amit@example.com",
    status: "ACTIVE",
    createdAt: "2026-08-27T10:00:00Z",
  },
];

describe("CustomerSelectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(customerApi.searchCustomers).mockResolvedValue(mockResults);
  });

  it("searches and selects customer when clicked", async () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <CustomerSelectModal
        isOpen={true}
        onClose={handleClose}
        onSelectCustomer={handleSelect}
        selectedCustomerId={null}
      />
    );

    expect(screen.getByPlaceholderText(/search patient by mobile number/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Amit Verma")).toBeInTheDocument();
      expect(screen.getByText("CUST-000001")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Amit Verma"));

    expect(handleSelect).toHaveBeenCalledWith({
      id: "cust-01",
      name: "Amit Verma",
      phone: "9876543210",
    });
    expect(handleClose).toHaveBeenCalled();
  });
});
