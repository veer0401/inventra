import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@inventra/ui";
import { GlobalMedicineSelectModal } from "../../components/catalog/GlobalMedicineSelectModal";
import { AdminGlobalMedicinesPage } from "./AdminGlobalMedicinesPage";
import { globalMedicineApi } from "../../services/globalMedicineApi";

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe("Global Medicine Database Module", () => {
  it("renders GlobalMedicineSelectModal and selects a formulation", async () => {
    const mockOnSelect = vi.fn();
    const mockOnOpenChange = vi.fn();

    vi.spyOn(globalMedicineApi, "searchGlobalMedicines").mockResolvedValue({
      content: [
        {
          id: "018e3a20-0001-7000-8000-000000000001",
          name: "Dolo 650 Tablet",
          genericName: "Paracetamol",
          brandName: "Dolo",
          manufacturer: "Micro Labs Ltd",
          dosageForm: "TABLET",
          strength: "650 mg",
          baseUnit: "Tablet",
          sellingUnit: "Strip of 15",
          unitsPerSellingUnit: 15,
          taxRate: 12.0,
          prescriptionRequired: false,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 50,
      number: 0,
      first: true,
      last: true,
      empty: false,
    });

    renderWithProviders(
      <GlobalMedicineSelectModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText("Global Medicine Database")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Dolo 650 Tablet")).toBeInTheDocument();
    });

    const selectBtn = screen.getByRole("button", { name: /Select & Autofill/i });
    fireEvent.click(selectBtn);

    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Dolo 650 Tablet",
        genericName: "Paracetamol",
      })
    );
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders AdminGlobalMedicinesPage with master catalog and store proposals tabs", async () => {
    vi.spyOn(globalMedicineApi, "adminGetPendingCount").mockResolvedValue(3);
    vi.spyOn(globalMedicineApi, "adminSearchMedicines").mockResolvedValue({
      content: [
        {
          id: "018e3a20-0001-7000-8000-000000000001",
          name: "Dolo 650 Tablet",
          genericName: "Paracetamol",
          dosageForm: "TABLET",
          baseUnit: "Tablet",
          sellingUnit: "Strip of 15",
          unitsPerSellingUnit: 15,
          taxRate: 12.0,
          prescriptionRequired: false,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
      first: true,
      last: true,
      empty: false,
    });

    renderWithProviders(<AdminGlobalMedicinesPage />);

    expect(screen.getByText("Global Medicine Master Database")).toBeInTheDocument();
    expect(screen.getByText("Master Catalog")).toBeInTheDocument();
    expect(screen.getByText("Store Product Proposals")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("3 PENDING")).toBeInTheDocument();
      expect(screen.getByText("Dolo 650 Tablet")).toBeInTheDocument();
    });
  });
});
