export type TransferStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "IN_TRANSIT"
  | "PARTIALLY_RECEIVED"
  | "FULLY_RECEIVED"
  | "CANCELLED";

export interface TransferLineBatchAllocationResponse {
  id: string;
  sourceBatchId: string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate: string;
  allocatedQuantity: number;
  unitCost: number;
  mrp: number;
  sellingPrice: number;
}

export interface TransferLineResponse {
  id: string;
  productId: string;
  productName: string;
  lineNumber: number;
  sellingUnit: string;
  conversionFactor: number;
  requestedQuantity: number;
  approvedQuantity: number;
  shippedQuantity: number;
  receivedQuantity: number;
  notes?: string;
  batchAllocations: TransferLineBatchAllocationResponse[];
}

export interface TransferResponse {
  id: string;
  businessId: string;
  sourceStoreId: string;
  destinationStoreId: string;
  transferNumber: string;
  status: TransferStatus;
  requestedBy: string;
  approvedBy?: string;
  shippedBy?: string;
  requestedAt: string;
  approvedAt?: string;
  shippedAt?: string;
  expectedDeliveryDate?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  notes?: string;
  version: number;
  lines: TransferLineResponse[];
}

export interface CreateTransferLineRequest {
  productId: string;
  requestedQuantity: number;
  sellingUnit?: string;
  notes?: string;
}

export interface CreateTransferRequest {
  sourceStoreId: string;
  destinationStoreId: string;
  expectedDeliveryDate?: string;
  idempotencyKey?: string;
  notes?: string;
  lines: CreateTransferLineRequest[];
}

export interface ApproveTransferLineRequest {
  transferLineId: string;
  approvedQuantity: number;
}

export interface ApproveTransferRequest {
  lines?: ApproveTransferLineRequest[];
}

export interface RejectTransferRequest {
  reason: string;
}

export interface CancelTransferRequest {
  reason: string;
}

export interface ShipBatchAllocationRequest {
  sourceBatchId: string;
  shippedQuantity: number;
}

export interface ShipTransferLineRequest {
  transferLineId: string;
  batchAllocations: ShipBatchAllocationRequest[];
}

export interface ShipTransferRequest {
  idempotencyKey?: string;
  lines: ShipTransferLineRequest[];
}

export interface ReceiveBatchAllocationRequest {
  sourceBatchId: string;
  receivedQuantity: number;
}

export interface ReceiveTransferLineRequest {
  transferLineId: string;
  batchAllocations: ReceiveBatchAllocationRequest[];
}

export interface ReceiveTransferRequest {
  idempotencyKey?: string;
  notes?: string;
  lines: ReceiveTransferLineRequest[];
}

export interface TransferReceiptResponse {
  id: string;
  transferId: string;
  receiptNumber: string;
  receivedBy: string;
  receivedAt: string;
  notes?: string;
  transferStatus: TransferStatus;
}
