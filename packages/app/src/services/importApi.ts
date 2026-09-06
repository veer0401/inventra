import { apiClient } from "./api";
import type {
  Page,
  ImportJobResponse,
  ImportRowResponse,
  ImportDomain,
  ImportJobStatus,
  ImportRowStatus,
  ImportTemplateMetadata,
  ConfirmImportResponse,
} from "@inventra/api-types";

export interface ImportFilterParams {
  domain?: ImportDomain;
  status?: ImportJobStatus;
  page?: number;
  size?: number;
}

export interface ImportRowsFilterParams {
  status?: ImportRowStatus;
  page?: number;
  size?: number;
}

export const importApi = {
  async uploadImport(
    file: File,
    domain: ImportDomain,
    storeId?: string,
    idempotencyKey?: string
  ): Promise<ImportJobResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("domain", domain);
    if (storeId) {
      formData.append("storeId", storeId);
    }

    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    const res = await apiClient.post<ImportJobResponse>("/api/v1/imports/upload", formData, {
      headers: {
        ...headers,
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  },

  async listImports(params?: ImportFilterParams): Promise<Page<ImportJobResponse>> {
    const res = await apiClient.get<Page<ImportJobResponse>>("/api/v1/imports", {
      params: {
        domain: params?.domain,
        status: params?.status,
        page: params?.page,
        size: params?.size,
      },
    });
    return res.data;
  },

  async getImport(id: string): Promise<ImportJobResponse> {
    const res = await apiClient.get<ImportJobResponse>(`/api/v1/imports/${id}`);
    return res.data;
  },

  async getImportRows(id: string, params?: ImportRowsFilterParams): Promise<Page<ImportRowResponse>> {
    const res = await apiClient.get<Page<ImportRowResponse>>(`/api/v1/imports/${id}/rows`, {
      params: {
        status: params?.status,
        page: params?.page,
        size: params?.size,
      },
    });
    return res.data;
  },

  async updateImportRow(
    jobId: string,
    rowId: string,
    fields: Record<string, string>
  ): Promise<ImportRowResponse> {
    const res = await apiClient.patch<ImportRowResponse>(`/api/v1/imports/${jobId}/rows/${rowId}`, {
      fields,
    });
    return res.data;
  },

  async skipImportRow(
    jobId: string,
    rowId: string,
    skipReason: string
  ): Promise<ImportRowResponse> {
    const res = await apiClient.post<ImportRowResponse>(`/api/v1/imports/${jobId}/rows/${rowId}/skip`, {
      skipReason,
    });
    return res.data;
  },

  async confirmImport(id: string): Promise<ConfirmImportResponse> {
    const res = await apiClient.post<ConfirmImportResponse>(`/api/v1/imports/${id}/confirm`);
    return res.data;
  },

  async cancelImport(id: string): Promise<ImportJobResponse> {
    const res = await apiClient.post<ImportJobResponse>(`/api/v1/imports/${id}/cancel`);
    return res.data;
  },

  async getTemplateMetadata(domain: ImportDomain): Promise<ImportTemplateMetadata> {
    const res = await apiClient.get<ImportTemplateMetadata>(`/api/v1/imports/templates/${domain}`);
    return res.data;
  },
};
