import { apiClient } from "./api";
import type {
  Page,
  PosProductSearchResponse,
  SaleResponse,
  CreateSaleRequest,
  ReceiptResponse,
  InvoiceResponse,
  VoidSaleRequest,
  SaleFilterParams,
} from "@inventra/api-types";

export const salesApi = {
  /**
   * Fast server-side product search for POS terminal
   */
  async searchPosProducts(params: {
    q: string;
    storeId?: string;
    page?: number;
    size?: number;
  }): Promise<Page<PosProductSearchResponse>> {
    const res = await apiClient.get<Page<PosProductSearchResponse>>(
      "/api/v1/pos/products/search",
      {
        params: {
          q: params.q.trim(),
          storeId: params.storeId,
          page: params.page,
          size: params.size,
        },
      }
    );
    return res.data;
  },

  /**
   * Atomic POS sale checkout
   */
  async checkoutSale(request: CreateSaleRequest): Promise<SaleResponse> {
    const res = await apiClient.post<SaleResponse>("/api/v1/sales", request);
    return res.data;
  },

  /**
   * Search / list historical sales with filters and pagination
   */
  async listSales(params?: SaleFilterParams): Promise<Page<SaleResponse>> {
    const res = await apiClient.get<Page<SaleResponse>>("/api/v1/sales", {
      params: {
        storeId: params?.storeId,
        status: params?.status,
        startDate: params?.startDate,
        endDate: params?.endDate,
        page: params?.page,
        size: params?.size,
      },
    });
    return res.data;
  },

  /**
   * Get single sale details by ID
   */
  async getSale(id: string): Promise<SaleResponse> {
    const res = await apiClient.get<SaleResponse>(`/api/v1/sales/${id}`);
    return res.data;
  },

  /**
   * Get printable / downloadable commercial invoice
   */
  async getInvoice(id: string): Promise<InvoiceResponse> {
    const res = await apiClient.get<InvoiceResponse>(`/api/v1/sales/${id}/invoice`);
    return res.data;
  },

  /**
   * Get printable thermal receipt
   */
  async getReceipt(id: string): Promise<ReceiptResponse> {
    const res = await apiClient.get<ReceiptResponse>(`/api/v1/sales/${id}/receipt`);
    return res.data;
  },

  /**
   * Void an existing sale (Owner / Manager only)
   */
  async voidSale(id: string, request: VoidSaleRequest): Promise<SaleResponse> {
    const res = await apiClient.post<SaleResponse>(`/api/v1/sales/${id}/void`, request);
    return res.data;
  },

  /**
   * Process a sales return against an existing sale
   */
  async createSaleReturn(saleId: string, request: import("@inventra/api-types").CreateSaleReturnRequest): Promise<import("@inventra/api-types").SaleReturnResponse> {
    const res = await apiClient.post<import("@inventra/api-types").SaleReturnResponse>(`/api/v1/sales/${saleId}/returns`, request);
    return res.data;
  },

  /**
   * Search / list returns with filters and pagination
   */
  async listReturns(params?: {
    storeId?: string;
    saleId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<Page<import("@inventra/api-types").SaleReturnResponse>> {
    const res = await apiClient.get<Page<import("@inventra/api-types").SaleReturnResponse>>("/api/v1/returns", {
      params: {
        storeId: params?.storeId,
        saleId: params?.saleId,
        startDate: params?.startDate,
        endDate: params?.endDate,
        page: params?.page,
        size: params?.size,
      },
    });
    return res.data;
  },

  /**
   * Get single return details by ID
   */
  async getSaleReturn(id: string): Promise<import("@inventra/api-types").SaleReturnResponse> {
    const res = await apiClient.get<import("@inventra/api-types").SaleReturnResponse>(`/api/v1/returns/${id}`);
    return res.data;
  },
};

