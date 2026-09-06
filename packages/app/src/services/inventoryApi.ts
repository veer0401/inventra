import { apiClient } from "../stores/authStore";
import type {
  Page,
  InventoryItemResponse,
  InventoryBatchResponse,
  StockAdjustmentRequest,
  StockMovementResponse,
} from "@inventra/api-types";

export interface ListInventoryParams {
  storeId?: string;
  lowStockOnly?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ListBatchesParams {
  storeId?: string;
  expiringWithinDays?: number;
  expiredOnly?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ListStockMovementsParams {
  storeId?: string;
  productId?: string;
  batchId?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const inventoryApi = {
  listInventory: async (params: ListInventoryParams = {}): Promise<Page<InventoryItemResponse>> => {
    const { storeId, lowStockOnly = false, page = 0, size = 20, sort = "createdAt,desc" } = params;
    const response = await apiClient.get<Page<InventoryItemResponse>>("/api/v1/inventory", {
      params: {
        storeId,
        lowStockOnly,
        page,
        size,
        sort,
      },
    });
    return response.data;
  },

  listBatches: async (params: ListBatchesParams = {}): Promise<Page<InventoryBatchResponse>> => {
    const { storeId, expiringWithinDays, expiredOnly = false, page = 0, size = 20, sort = "expiryDate,asc" } = params;
    const response = await apiClient.get<Page<InventoryBatchResponse>>("/api/v1/inventory/batches", {
      params: {
        storeId,
        expiringWithinDays: expiringWithinDays && expiringWithinDays > 0 ? expiringWithinDays : undefined,
        expiredOnly,
        page,
        size,
        sort,
      },
    });
    return response.data;
  },

  listFefoBatches: async (productId: string, storeId?: string): Promise<InventoryBatchResponse[]> => {
    const response = await apiClient.get<InventoryBatchResponse[]>("/api/v1/inventory/batches/fefo", {
      params: {
        productId,
        storeId,
      },
    });
    return response.data;
  },

  adjustStock: async (request: StockAdjustmentRequest, storeId?: string): Promise<StockMovementResponse> => {
    const response = await apiClient.post<StockMovementResponse>("/api/v1/inventory/adjustments", request, {
      params: { storeId },
    });
    return response.data;
  },

  listStockMovements: async (params: ListStockMovementsParams = {}): Promise<Page<StockMovementResponse>> => {
    const { storeId, productId, batchId, page = 0, size = 20, sort = "occurredAt,desc" } = params;
    const response = await apiClient.get<Page<StockMovementResponse>>("/api/v1/inventory/movements", {
      params: {
        storeId,
        productId,
        batchId,
        page,
        size,
        sort,
      },
    });
    return response.data;
  },
};
