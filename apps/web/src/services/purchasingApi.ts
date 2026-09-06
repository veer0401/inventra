import { apiClient } from "../stores/authStore";
import type {
  Page,
  SupplierResponse,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierProductResponse,
  CreateSupplierProductRequest,
  GoodsReceiptSummaryResponse,
  GoodsReceiptResponse,
  CreateGoodsReceiptRequest,
  UpdateGoodsReceiptRequest,
  GoodsReceiptStatus,
  PurchaseOrderSummaryResponse,
  PurchaseOrderResponse,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  CancelOrderRequest,
  PurchaseOrderStatus,
  PurchaseInvoiceSummaryResponse,
  PurchaseInvoiceResponse,
  CreatePurchaseInvoiceRequest,
  PurchaseInvoiceStatus,
} from "@inventra/api-types";

export interface ListSuppliersParams {
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ListGoodsReceiptsParams {
  storeId?: string;
  supplierId?: string;
  status?: GoodsReceiptStatus;
  purchaseOrderId?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ListPurchaseOrdersParams {
  storeId?: string;
  supplierId?: string;
  status?: PurchaseOrderStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ListPurchaseInvoicesParams {
  storeId?: string;
  supplierId?: string;
  status?: PurchaseInvoiceStatus;
  dueDateBefore?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const purchasingApi = {
  // --- Suppliers ---
  listSuppliers: async (params: ListSuppliersParams = {}): Promise<Page<SupplierResponse>> => {
    const { search, page = 0, size = 20, sort = "legalName,asc" } = params;
    const response = await apiClient.get<Page<SupplierResponse>>("/api/v1/suppliers", {
      params: {
        search: search && search.trim() ? search.trim() : undefined,
        page,
        size,
        sort,
      },
    });
    return response.data;
  },

  getSupplier: async (supplierId: string): Promise<SupplierResponse> => {
    const response = await apiClient.get<SupplierResponse>(`/api/v1/suppliers/${supplierId}`);
    return response.data;
  },

  createSupplier: async (request: CreateSupplierRequest): Promise<SupplierResponse> => {
    const response = await apiClient.post<SupplierResponse>("/api/v1/suppliers", request);
    return response.data;
  },

  updateSupplier: async (supplierId: string, request: UpdateSupplierRequest): Promise<SupplierResponse> => {
    const response = await apiClient.patch<SupplierResponse>(`/api/v1/suppliers/${supplierId}`, request);
    return response.data;
  },

  listSupplierProducts: async (supplierId: string): Promise<SupplierProductResponse[]> => {
    const response = await apiClient.get<SupplierProductResponse[]>(`/api/v1/suppliers/${supplierId}/products`);
    return response.data;
  },

  addOrUpdateSupplierProduct: async (
    supplierId: string,
    request: CreateSupplierProductRequest
  ): Promise<SupplierProductResponse> => {
    const response = await apiClient.post<SupplierProductResponse>(
      `/api/v1/suppliers/${supplierId}/products`,
      request
    );
    return response.data;
  },

  // --- Goods Receipts (GRN) ---
  listGoodsReceipts: async (params: ListGoodsReceiptsParams = {}): Promise<Page<GoodsReceiptSummaryResponse>> => {
    const { storeId, supplierId, status, purchaseOrderId, page = 0, size = 20, sort = "createdAt,desc" } = params;
    const response = await apiClient.get<Page<GoodsReceiptSummaryResponse>>("/api/v1/goods-receipts", {
      params: {
        storeId,
        supplierId,
        status,
        purchaseOrderId,
        page,
        size,
        sort,
      },
    });
    return response.data;
  },

  getGoodsReceipt: async (id: string): Promise<GoodsReceiptResponse> => {
    const response = await apiClient.get<GoodsReceiptResponse>(`/api/v1/goods-receipts/${id}`);
    return response.data;
  },

  createGoodsReceipt: async (request: CreateGoodsReceiptRequest): Promise<GoodsReceiptResponse> => {
    const response = await apiClient.post<GoodsReceiptResponse>("/api/v1/goods-receipts", request);
    return response.data;
  },

  updateGoodsReceipt: async (id: string, request: UpdateGoodsReceiptRequest): Promise<GoodsReceiptResponse> => {
    const response = await apiClient.patch<GoodsReceiptResponse>(`/api/v1/goods-receipts/${id}`, request);
    return response.data;
  },

  postGoodsReceipt: async (id: string): Promise<GoodsReceiptResponse> => {
    const response = await apiClient.post<GoodsReceiptResponse>(`/api/v1/goods-receipts/${id}/post`);
    return response.data;
  },

  cancelGoodsReceipt: async (id: string): Promise<GoodsReceiptResponse> => {
    const response = await apiClient.post<GoodsReceiptResponse>(`/api/v1/goods-receipts/${id}/cancel`);
    return response.data;
  },

  // --- Purchase Orders ---
  listPurchaseOrders: async (params: ListPurchaseOrdersParams = {}): Promise<Page<PurchaseOrderSummaryResponse>> => {
    const { storeId, supplierId, status, fromDate, toDate, page = 0, size = 20, sort = "orderDate,desc" } = params;
    const response = await apiClient.get<Page<PurchaseOrderSummaryResponse>>("/api/v1/purchase-orders", {
      params: {
        storeId,
        supplierId,
        status,
        fromDate,
        toDate,
        page,
        size,
        sort,
      },
    });
    return response.data;
  },

  getPurchaseOrder: async (id: string): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.get<PurchaseOrderResponse>(`/api/v1/purchase-orders/${id}`);
    return response.data;
  },

  createPurchaseOrder: async (request: CreatePurchaseOrderRequest): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.post<PurchaseOrderResponse>("/api/v1/purchase-orders", request);
    return response.data;
  },

  updatePurchaseOrder: async (id: string, request: UpdatePurchaseOrderRequest): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.patch<PurchaseOrderResponse>(`/api/v1/purchase-orders/${id}`, request);
    return response.data;
  },

  confirmPurchaseOrder: async (id: string): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.post<PurchaseOrderResponse>(`/api/v1/purchase-orders/${id}/confirm`);
    return response.data;
  },

  cancelPurchaseOrder: async (id: string, request?: CancelOrderRequest): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.post<PurchaseOrderResponse>(`/api/v1/purchase-orders/${id}/cancel`, request);
    return response.data;
  },

  closePurchaseOrder: async (id: string): Promise<PurchaseOrderResponse> => {
    const response = await apiClient.post<PurchaseOrderResponse>(`/api/v1/purchase-orders/${id}/close`);
    return response.data;
  },

  // --- Purchase Invoices ---
  listPurchaseInvoices: async (params: ListPurchaseInvoicesParams = {}): Promise<Page<PurchaseInvoiceSummaryResponse>> => {
    const { storeId, supplierId, status, dueDateBefore, page = 0, size = 20, sort = "invoiceDate,desc" } = params;
    const response = await apiClient.get<Page<PurchaseInvoiceSummaryResponse>>("/api/v1/purchase-invoices", {
      params: {
        storeId,
        supplierId,
        status,
        dueDateBefore,
        page,
        size,
        sort,
      },
    });
    return response.data;
  },

  getPurchaseInvoice: async (id: string): Promise<PurchaseInvoiceResponse> => {
    const response = await apiClient.get<PurchaseInvoiceResponse>(`/api/v1/purchase-invoices/${id}`);
    return response.data;
  },

  createPurchaseInvoice: async (request: CreatePurchaseInvoiceRequest): Promise<PurchaseInvoiceResponse> => {
    const response = await apiClient.post<PurchaseInvoiceResponse>("/api/v1/purchase-invoices", request);
    return response.data;
  },

  postPurchaseInvoice: async (id: string): Promise<PurchaseInvoiceResponse> => {
    const response = await apiClient.post<PurchaseInvoiceResponse>(`/api/v1/purchase-invoices/${id}/post`);
    return response.data;
  },

  cancelPurchaseInvoice: async (id: string): Promise<PurchaseInvoiceResponse> => {
    const response = await apiClient.post<PurchaseInvoiceResponse>(`/api/v1/purchase-invoices/${id}/cancel`);
    return response.data;
  },
};

