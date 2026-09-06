export type BatchStatus = "ACTIVE" | "EXPIRED" | "DEPLETED" | "QUARANTINED" | "RECALLED";

export type StockMovementType =
  | "INITIAL_STOCK"
  | "PURCHASE_RECEIPT"
  | "PURCHASE_RETURN"
  | "SALE"
  | "SALE_RETURN"
  | "SALE_VOID"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "DAMAGE_WRITE_OFF"
  | "EXPIRY_WRITE_OFF"
  | "STOCK_AUDIT";

export interface InventoryItemResponse {
  id: string;
  businessId: string;
  storeId: string;
  productId: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  minStock: number;
  maxStock: number;
  locationRack: string | null;
  isBatchTracked: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryBatchResponse {
  id: string;
  businessId: string;
  storeId: string;
  productId: string;
  inventoryItemId: string;
  batchNumber: string;
  manufacturingDate: string | null;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  status: BatchStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface BatchAdjustmentDto {
  batchId?: string;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  purchasePrice?: number;
  mrp?: number;
  sellingPrice?: number;
  quantityDelta: number;
}

export interface StockAdjustmentRequest {
  productId: string;
  movementType: StockMovementType;
  quantityDelta?: number;
  batchAdjustment?: BatchAdjustmentDto;
  reason?: string;
  referenceId?: string;
  referenceType?: string;
}

export interface StockMovementResponse {
  id: string;
  businessId: string;
  storeId: string;
  productId: string;
  batchId: string | null;
  movementType: StockMovementType;
  quantityDelta: number;
  unitCost: number;
  balanceAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  userId: string | null;
  deviceId: string | null;
  occurredAt: string;
  createdAt: string;
}

