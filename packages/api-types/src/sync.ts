export type SyncEventType = "SALE_CREATED" | "SALE_VOIDED" | "SALE_RETURNED";
export type SyncStatus = "PENDING" | "APPLIED" | "DUPLICATE" | "REJECTED" | "FAILED";
export type SyncChangeOperation = "UPSERT" | "DELETE";

export interface SyncOperationRequest {
  eventId: string;
  deviceSequenceNumber: number;
  eventType: SyncEventType;
  eventVersion: number;
  occurredAt: string;
  payload: Record<string, unknown>;
  payloadChecksum: string;
}

export interface SyncBatchUploadRequest {
  operations: SyncOperationRequest[];
}

export interface SyncOperationResponse {
  eventId: string;
  deviceSequenceNumber: number;
  status: SyncStatus;
  serverEntityId?: string;
  errorCode?: string;
  errorMessage?: string;
  appliedAt?: string;
}

export interface SyncBatchUploadResponse {
  totalProcessed: number;
  appliedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  results: SyncOperationResponse[];
}

export interface SyncChangeFeedItem {
  changeSeq: number;
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncChangeOperation;
  entityVersion: number;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SyncDownloadResponse {
  changes: SyncChangeFeedItem[];
  nextCursor: number;
  hasMore: boolean;
}

export interface SyncDeviceStateResponse {
  deviceId: string;
  lastSyncedSequenceNumber: number;
  lastDownloadedCursor: number;
  lastSyncAt: string;
}
