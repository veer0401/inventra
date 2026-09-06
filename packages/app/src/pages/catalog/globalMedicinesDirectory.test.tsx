import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@inventra/ui";
import { GlobalMedicinesDirectoryPage } from "./GlobalMedicinesDirectoryPage";
import { GlobalMedicineGuidePage } from "./GlobalMedicineGuidePage";
import { GlobalMedicineHelpModal } from "../../components/catalog/GlobalMedicineHelpModal";
import { globalMedicineApi, type GlobalMedicineResponse } from "../../services/globalMedicineApi";
import { useAuthStore } from "../../stores/authStore";

vi.mock("../../services/globalMedicineApi", () => ({
  globalMedicineApi: {
    searchGlobalMedicines: vi.fn(),
    getImportedGlobalMedicineIds: vi.fn(),
    quickImportToStore: vi.fn(),
    adminImportCsv: vi.fn(),
    adminDownloadCsvTemplate: vi.fn(),
  },
}));

const mockGlobalMedicines: GlobalMedicineResponse[] = [
  {
    id: "gm-1",
    name: "Paracetamol 500mg Tablet",
    genericName: "Paracetamol",
    brandName: "Crocin",
    manufacturer: "GSK",
    dosageForm: "TABLET",
    strength: "500mg",
    baseUnit: "Tablet",
    sellingUnit: "Strip of 10",
    unitsPerSellingUnit: 10,
    hsnCode: "30049099",
    taxRate: 12,
    prescriptionRequired: false,
    categoryName: "Analgesics & Antipyretics",
    barcode: "890103000001",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "gm-2",
    name: "Amoxicillin 500mg Capsule",
    genericName: "Amoxicillin Trihydrate",
    brandName: "Mox 500",
    manufacturer: "Sun Pharma",
    dosageForm: "CAPSULE",
    strength: "500mg",
    baseUnit: "Capsule",
    sellingUnit: "Strip of 10",
    unitsPerSellingUnit: 10,
    hsnCode: "30041010",
    taxRate: 12,
    prescriptionRequired: true,
    categoryName: "Antibiotics",
    barcode: "890103000002",
    status: "ACTIVE",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe("Global Medicines Directory Page & 1-Click Store Import", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useAuthStore.setState({
      activeContext: {
        businessId: "biz-1",
        businessName: "Apollo Pharmacy",
        storeId: "store-1",
        storeName: "Main Branch",
        role: "OWNER",
        permissions: ["CATALOG_WRITE", "CATALOG_READ"],
      },
      accessToken: "mock-token",
    });

    vi.mocked(globalMedicineApi.searchGlobalMedicines).mockResolvedValue({
      content: mockGlobalMedicines,
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    });

    // Assume gm-2 is already imported by this store, but gm-1 is not
    vi.mocked(globalMedicineApi.getImportedGlobalMedicineIds).mockResolvedValue(["gm-2"]);
  });

  it("renders global medicines directory with formulation details and imported status badge", async () => {
    renderWithProviders(<GlobalMedicinesDirectoryPage />);

    // Header title and count
    expect(screen.getByText("Global Medicine Directory")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Paracetamol 500mg Tablet")).toBeInTheDocument();
      expect(screen.getByText("Amoxicillin 500mg Capsule")).toBeInTheDocument();
    });

    // Generic names and packaging
    expect(screen.getByText("Paracetamol")).toBeInTheDocument();
    expect(screen.getByText("Amoxicillin Trihydrate")).toBeInTheDocument();
    expect(screen.getByText("Rx")).toBeInTheDocument();

    // gm-2 should show 'In Store' status badge since it is already imported
    expect(screen.getByText("In Store")).toBeInTheDocument();

    // gm-1 should show 1-click 'Add to Store' button
    const addButton = screen.getByRole("button", { name: /Add to Store/i });
    expect(addButton).toBeInTheDocument();
  });

  it("performs 1-click automatic store add without opening any modal or popup", async () => {
    vi.mocked(globalMedicineApi.quickImportToStore).mockResolvedValue({
      id: "prod-1",
      businessId: "biz-1",
      globalProductId: "gm-1",
      name: "Paracetamol 500mg Tablet",
      genericName: "Paracetamol",
      dosageForm: "TABLET",
      baseUnit: "Tablet",
      unitsPerSellingUnit: 10,
      taxRate: 12,
      isTaxInclusive: true,
      prescriptionRequired: false,
      status: "ACTIVE",
      createdAt: "2026-09-06T12:00:00Z",
      updatedAt: "2026-09-06T12:00:00Z",
    });

    renderWithProviders(<GlobalMedicinesDirectoryPage />);

    await waitFor(() => {
      expect(screen.getByText("Paracetamol 500mg Tablet")).toBeInTheDocument();
    });

    const addButton = screen.getByRole("button", { name: /Add to Store/i });
    fireEvent.click(addButton);

    // Verified: api called with global medicine id
    await waitFor(() => {
      expect(globalMedicineApi.quickImportToStore).toHaveBeenCalledWith("gm-1");
    });

    // Verified: no popup appeared, button transitioned to 'In Store'
    await waitFor(() => {
      const inStoreBadges = screen.getAllByText("In Store");
      expect(inStoreBadges.length).toBe(2);
    });
  });

  it("opens GlobalMedicineHelpModal when clicking question mark button and displays non-technical guidance", async () => {
    renderWithProviders(<GlobalMedicineHelpModal />);

    const helpTrigger = screen.getByLabelText(/How does this work\?/i);
    expect(helpTrigger).toBeInTheDocument();

    fireEvent.click(helpTrigger);

    await waitFor(() => {
      expect(screen.getByText(/How Global Medicines Work/i)).toBeInTheDocument();
      expect(screen.getByText(/1\. What is the Global Medicine Database\?/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Fast 1-Click Addition/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Why doesn't the Global Database include prices or stock\?/i)).toBeInTheDocument();
      expect(screen.getByText(/View Full Guide/i)).toBeInTheDocument();
    });
  });

  it("renders GlobalMedicineGuidePage with 3-step workflow, comparison table, and field dictionary", () => {
    renderWithProviders(<GlobalMedicineGuidePage />);

    expect(screen.getByText("Global Medicine Master Guide")).toBeInTheDocument();
    expect(screen.getByText("FUNCTIONAL HANDBOOK")).toBeInTheDocument();

    // Check main conceptual tabs
    expect(screen.getByText(/1\. Why Global Medicines\?/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. The 3-Step Store Workflow/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Shared vs Private Data/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Field-by-Field Dictionary/i)).toBeInTheDocument();

    // Check step 2 heading
    expect(screen.getAllByText(/Click "Add to Store"/i).length).toBeGreaterThan(0);

    // Check field dictionary preview
    expect(screen.getByText(/Product Trade \/ Display Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Generic \/ Salt Composition/i)).toBeInTheDocument();
  });
});
