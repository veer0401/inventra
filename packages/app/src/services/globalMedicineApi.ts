import { apiClient, useAuthStore } from "../stores/authStore";
import type { Page, DosageForm, ProductResponse } from "@inventra/api-types";
import { baseUrl } from "./api";

export type GlobalMedicineStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type SuggestionStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface GlobalMedicineResponse {
  id: string;
  name: string;
  genericName: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm: DosageForm;
  strength?: string;
  baseUnit: string;
  sellingUnit: string;
  unitsPerSellingUnit: number;
  hsnCode?: string;
  taxRate: number;
  prescriptionRequired: boolean;
  categoryName?: string;
  barcode?: string;
  description?: string;
  status: GlobalMedicineStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGlobalMedicineRequest {
  name: string;
  genericName: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm: DosageForm;
  strength?: string;
  baseUnit: string;
  sellingUnit?: string;
  unitsPerSellingUnit?: number;
  hsnCode?: string;
  taxRate?: number;
  prescriptionRequired?: boolean;
  categoryName?: string;
  barcode?: string;
  description?: string;
}

export interface UpdateGlobalMedicineRequest {
  name?: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm?: DosageForm;
  strength?: string;
  baseUnit?: string;
  sellingUnit?: string;
  unitsPerSellingUnit?: number;
  hsnCode?: string;
  taxRate?: number;
  prescriptionRequired?: boolean;
  categoryName?: string;
  barcode?: string;
  description?: string;
  status?: GlobalMedicineStatus;
}

export interface GlobalMedicineSuggestionResponse {
  id: string;
  businessId: string;
  businessName: string;
  productId?: string;
  name: string;
  genericName?: string;
  brandName?: string;
  manufacturer?: string;
  dosageForm: DosageForm;
  strength?: string;
  baseUnit: string;
  sellingUnit: string;
  unitsPerSellingUnit: number;
  hsnCode?: string;
  taxRate: number;
  prescriptionRequired: boolean;
  status: SuggestionStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  globalMedicineId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GlobalMedicineCsvImportResult {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
}

export const globalMedicineApi = {
  // Store / Pharmacist methods
  searchGlobalMedicines: async (query = "", page = 0, size = 20): Promise<Page<GlobalMedicineResponse>> => {
    const response = await apiClient.get<Page<GlobalMedicineResponse>>("/api/v1/catalog/global-medicines", {
      params: { query: query || undefined, page, size },
    });
    return response.data;
  },

  getGlobalMedicine: async (id: string): Promise<GlobalMedicineResponse> => {
    const response = await apiClient.get<GlobalMedicineResponse>(`/api/v1/catalog/global-medicines/${id}`);
    return response.data;
  },

  quickImportToStore: async (id: string): Promise<ProductResponse> => {
    const response = await apiClient.post<ProductResponse>(`/api/v1/catalog/global-medicines/${id}/quick-import`);
    return response.data;
  },

  getImportedGlobalMedicineIds: async (): Promise<string[]> => {
    const response = await apiClient.get<string[]>("/api/v1/catalog/global-medicines/imported-ids");
    return response.data || [];
  },

  // Platform Admin methods
  adminSearchMedicines: async (
    query = "",
    status?: GlobalMedicineStatus,
    page = 0,
    size = 20
  ): Promise<Page<GlobalMedicineResponse>> => {
    const response = await apiClient.get<Page<GlobalMedicineResponse>>("/api/v1/admin/medicines", {
      params: { query: query || undefined, status: status || undefined, page, size },
    });
    return response.data;
  },

  adminGetMedicine: async (id: string): Promise<GlobalMedicineResponse> => {
    const response = await apiClient.get<GlobalMedicineResponse>(`/api/v1/admin/medicines/${id}`);
    return response.data;
  },

  adminCreateMedicine: async (request: CreateGlobalMedicineRequest): Promise<GlobalMedicineResponse> => {
    const response = await apiClient.post<GlobalMedicineResponse>("/api/v1/admin/medicines", request);
    return response.data;
  },

  adminUpdateMedicine: async (id: string, request: UpdateGlobalMedicineRequest): Promise<GlobalMedicineResponse> => {
    const response = await apiClient.put<GlobalMedicineResponse>(`/api/v1/admin/medicines/${id}`, request);
    return response.data;
  },

  adminUpdateStatus: async (id: string, status: GlobalMedicineStatus): Promise<GlobalMedicineResponse> => {
    const response = await apiClient.patch<GlobalMedicineResponse>(`/api/v1/admin/medicines/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  adminImportCsv: async (file: File): Promise<GlobalMedicineCsvImportResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<GlobalMedicineCsvImportResult>("/api/v1/admin/medicines/import-csv", formData);
    return response.data;
  },

  adminDownloadCsvTemplate: async (): Promise<void> => {
    const token = useAuthStore.getState().accessToken;
    const response = await fetch(`${baseUrl}/api/v1/admin/medicines/csv-template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = "inventra_global_medicines_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  adminGetSuggestions: async (
    query = "",
    status?: SuggestionStatus,
    page = 0,
    size = 20
  ): Promise<Page<GlobalMedicineSuggestionResponse>> => {
    const response = await apiClient.get<Page<GlobalMedicineSuggestionResponse>>("/api/v1/admin/medicines/suggestions", {
      params: { query: query || undefined, status: status || undefined, page, size },
    });
    return response.data;
  },

  adminGetPendingCount: async (): Promise<number> => {
    const response = await apiClient.get<{ pending: number }>("/api/v1/admin/medicines/suggestions/count");
    return response.data?.pending || 0;
  },

  adminApproveSuggestion: async (id: string, notes?: string): Promise<GlobalMedicineSuggestionResponse> => {
    const response = await apiClient.post<GlobalMedicineSuggestionResponse>(
      `/api/v1/admin/medicines/suggestions/${id}/approve`,
      null,
      { params: { notes: notes || undefined } }
    );
    return response.data;
  },

  adminRejectSuggestion: async (id: string, reason: string): Promise<GlobalMedicineSuggestionResponse> => {
    const response = await apiClient.post<GlobalMedicineSuggestionResponse>(
      `/api/v1/admin/medicines/suggestions/${id}/reject`,
      { reason }
    );
    return response.data;
  },
};

