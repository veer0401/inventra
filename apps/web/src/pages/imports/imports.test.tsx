import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@inventra/ui";
import { ImportsPage } from "./ImportsPage";
import { ImportReviewPage } from "./ImportReviewPage";
import { importApi } from "../../services/importApi";
import type { ImportJobResponse, ImportRowResponse } from "@inventra/api-types";

vi.mock("../../services/importApi", () => ({
  importApi: {
    listImports: vi.fn(),
    getImport: vi.fn(),
    getImportRows: vi.fn(),
    updateImportRow: vi.fn(),
    skipImportRow: vi.fn(),
    confirmImport: vi.fn(),
    cancelImport: vi.fn(),
    getTemplateMetadata: vi.fn(),
    uploadImport: vi.fn(),
  },
}));

const mockJob: ImportJobResponse = {
  id: "job-01",
  businessId: "biz-1",
  importSource: "CSV",
  importDomain: "PRODUCT_CATALOG",
  originalFilename: "products_master_august.csv",
  fileHash: "hash-01",
  status: "PENDING_REVIEW",
  totalRows: 2,
  validRows: 1,
  invalidRows: 1,
  skippedRows: 0,
  createdBy: "user-1",
  version: 1,
  createdAt: "2026-08-27T10:00:00Z",
  updatedAt: "2026-08-27T10:00:00Z",
};

const mockRows: ImportRowResponse[] = [
  {
    id: "row-1",
    importJobId: "job-01",
    rowIndex: 1,
    rawData: { name: "Amoxicillin 500mg", category: "Antibiotics" },
    normalizedData: { name: "Amoxicillin 500mg", category: "Antibiotics" },
    status: "VALID",
    matchConfidence: 1.0,
    matchedEntityId: "prod-existing-1",
    validationIssues: [],
    createdAt: "2026-08-27T10:00:00Z",
  },
  {
    id: "row-2",
    importJobId: "job-01",
    rowIndex: 2,
    rawData: { name: "", category: "Unknown" },
    normalizedData: { category: "Unknown" },
    status: "INVALID",
    matchConfidence: 0.0,
    validationIssues: [
      {
        id: "issue-1",
        fieldName: "name",
        errorCode: "REQUIRED_FIELD_MISSING",
        errorMessage: "Product name is required",
        severity: "ERROR",
      },
    ],
    createdAt: "2026-08-27T10:00:00Z",
  },
];

describe("Imports Ingestion Pages", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    vi.mocked(importApi.listImports).mockResolvedValue({
      content: [mockJob],
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

    vi.mocked(importApi.getImport).mockResolvedValue(mockJob);
    vi.mocked(importApi.getImportRows).mockResolvedValue({
      content: mockRows,
      number: 0,
      size: 25,
      totalElements: 2,
      totalPages: 1,
      numberOfElements: 2,
      first: true,
      last: true,
      empty: false,
      pageable: {} as any,
    });
  });

  it("renders ImportsPage with list of import jobs and breakdown counts", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <ImportsPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("products_master_august.csv")).toBeInTheDocument();
      expect(screen.getByText("Products Catalog")).toBeInTheDocument();
      expect(screen.getByText("2 total")).toBeInTheDocument();
      expect(screen.getByText("1 valid")).toBeInTheDocument();
      expect(screen.getByText("1 errors")).toBeInTheDocument();
    });
  });

  it("renders ImportReviewPage with draft verification metrics and issues", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter initialEntries={["/imports/job-01"]}>
            <Routes>
              <Route path="/imports/:id" element={<ImportReviewPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("products_master_august.csv")).toBeInTheDocument();
      expect(screen.getByText("Amoxicillin 500mg")).toBeInTheDocument();
      expect(screen.getByText("Product name is required")).toBeInTheDocument();
    });
  });
});
