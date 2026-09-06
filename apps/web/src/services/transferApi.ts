import { apiClient } from "./api";
import type {
  Page,
  TransferResponse,
  CreateTransferRequest,
  ApproveTransferRequest,
  RejectTransferRequest,
  ShipTransferRequest,
  ReceiveTransferRequest,
  CancelTransferRequest,
  TransferReceiptResponse,
  TransferStatus,
} from "@inventra/api-types";

export interface TransferFilterParams {
  storeId?: string;
  status?: TransferStatus | string;
  page?: number;
  size?: number;
}

export const transferApi = {
  async listTransfers(params?: TransferFilterParams): Promise<Page<TransferResponse>> {
    const res = await apiClient.get<Page<TransferResponse>>("/api/v1/transfers", {
      params: {
        storeId: params?.storeId,
        status: params?.status,
        page: params?.page,
        size: params?.size,
      },
    });
    return res.data;
  },

  async getTransfer(id: string): Promise<TransferResponse> {
    const res = await apiClient.get<TransferResponse>(`/api/v1/transfers/${id}`);
    return res.data;
  },

  async createTransfer(data: CreateTransferRequest): Promise<TransferResponse> {
    const res = await apiClient.post<TransferResponse>("/api/v1/transfers", data);
    return res.data;
  },

  async approveTransfer(id: string, notes?: string): Promise<TransferResponse> {
    const res = await apiClient.post<TransferResponse>(`/api/v1/transfers/${id}/approve`, { notes } as ApproveTransferRequest);
    return res.data;
  },

  async rejectTransfer(id: string, reason: string): Promise<TransferResponse> {
    const res = await apiClient.post<TransferResponse>(`/api/v1/transfers/${id}/reject`, { reason } as RejectTransferRequest);
    return res.data;
  },

  async shipTransfer(id: string, data: ShipTransferRequest): Promise<TransferResponse> {
    const res = await apiClient.post<TransferResponse>(`/api/v1/transfers/${id}/ship`, data);
    return res.data;
  },

  async receiveTransfer(id: string, data: ReceiveTransferRequest): Promise<TransferReceiptResponse> {
    const res = await apiClient.post<TransferReceiptResponse>(`/api/v1/transfers/${id}/receive`, data);
    return res.data;
  },

  async cancelTransfer(id: string, reason: string): Promise<TransferResponse> {
    const res = await apiClient.post<TransferResponse>(`/api/v1/transfers/${id}/cancel`, { reason } as CancelTransferRequest);
    return res.data;
  },
};
