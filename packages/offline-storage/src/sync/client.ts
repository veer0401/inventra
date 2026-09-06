import type { IOfflineStorageDriver } from "../driver/types";
import { OfflineQueueRepository } from "../repositories/offline-queue";
import { ProductCacheRepository } from "../repositories/product-cache";
import { CustomerCacheRepository } from "../repositories/customer-cache";
import type {
  SyncBatchUploadRequest,
  SyncBatchUploadResponse,
  SyncDownloadResponse,
  SyncOperationRequest,
  SyncChangeFeedItem,
} from "@inventra/api-types";
import { InventraClient } from "@inventra/api-client";

export interface SyncClientConfig {
  businessId: string;
  storeId?: string;
  deviceId: string;
  apiClient: InventraClient;
  onDeviceRevoked?: () => void;
  onSyncStatusChange?: (status: { pendingCount: number; conflictCount: number; lastSyncAt: string }) => void;
}

export interface SyncPushResult {
  totalProcessed: number;
  appliedCount: number;
  duplicateCount: number;
  conflictCount: number;
  failedCount: number;
}

export class SyncClientWorker {
  private queueRepo: OfflineQueueRepository;
  private isSyncing = false;

  constructor(
    private driver: IOfflineStorageDriver,
    private config: SyncClientConfig
  ) {
    this.queueRepo = new OfflineQueueRepository(driver);
  }

  public async syncAll(): Promise<{ push: SyncPushResult; pulledCount: number }> {
    if (this.isSyncing) {
      return {
        push: { totalProcessed: 0, appliedCount: 0, duplicateCount: 0, conflictCount: 0, failedCount: 0 },
        pulledCount: 0,
      };
    }

    this.isSyncing = true;
    try {
      const pushResult = await this.pushPendingOperations();
      const pulledCount = await this.pullDeltaChanges();

      const lastSyncAt = new Date().toISOString();
      await this.setMetadata("last_sync_at", lastSyncAt);

      if (this.config.onSyncStatusChange) {
        const pendingCount = await this.queueRepo.getPendingCount(this.config.businessId);
        const conflictCount = await this.queueRepo.getConflictCount(this.config.businessId);
        this.config.onSyncStatusChange({ pendingCount, conflictCount, lastSyncAt });
      }

      return { push: pushResult, pulledCount };
    } finally {
      this.isSyncing = false;
    }
  }

  public async pushPendingOperations(batchSize = 50): Promise<SyncPushResult> {
    const pending = await this.queueRepo.getPendingOperations(this.config.businessId, batchSize);
    if (pending.length === 0) {
      return { totalProcessed: 0, appliedCount: 0, duplicateCount: 0, conflictCount: 0, failedCount: 0 };
    }

    const opIds = pending.map((p) => p.operationId);
    await this.queueRepo.markSyncing(opIds);

    const operations: SyncOperationRequest[] = pending.map((op) => ({
      eventId: op.operationId,
      eventType: op.eventType,
      eventVersion: op.eventVersion,
      deviceSequenceNumber: op.deviceSequenceNumber,
      occurredAt: new Date(op.createdAt).toISOString(),
      payloadChecksum: op.payloadChecksum,
      payload: op.payload,
    }));

    const uploadPayload: SyncBatchUploadRequest = {
      operations,
    };

    let pushResult: SyncPushResult = {
      totalProcessed: 0,
      appliedCount: 0,
      duplicateCount: 0,
      conflictCount: 0,
      failedCount: 0,
    };

    try {
      const response = await this.config.apiClient.post<SyncBatchUploadResponse>(
        "/api/v1/sync/upload",
        uploadPayload
      );

      const data = response.data;
      if (!data || !data.results) {
        throw new Error("Invalid response from sync upload endpoint");
      }

      pushResult.totalProcessed = data.totalProcessed || data.results.length;

      for (const res of data.results) {
        const opId = res.eventId;
        if (res.status === "APPLIED") {
          await this.queueRepo.markSynced(opId, res.serverEntityId);
          pushResult.appliedCount++;
        } else if (res.status === "DUPLICATE") {
          await this.queueRepo.markSynced(opId, res.serverEntityId);
          pushResult.duplicateCount++;
        } else if (
          res.status === "REJECTED" &&
          (res.errorCode === "BATCH_EXPIRED" ||
            res.errorCode === "INSUFFICIENT_STOCK" ||
            res.errorCode === "CONFLICT" ||
            res.errorCode === "VERSION_CONFLICT")
        ) {
          await this.queueRepo.markConflict(
            opId,
            "SALE_CREATED",
            res.errorCode,
            res.errorMessage || "Domain conflict detected during sync"
          );
          pushResult.conflictCount++;
        } else {
          await this.queueRepo.markFailed(
            opId,
            res.errorCode || "REJECTED",
            res.errorMessage || "Operation rejected by server"
          );
          pushResult.failedCount++;
        }
      }

      return pushResult;
    } catch (err: any) {
      const status = err?.response?.status;
      const errorCode = err?.response?.data?.errorCode || err?.response?.data?.error?.code;

      if (status === 403 || errorCode === "DEVICE_REVOKED" || status === 422 && errorCode === "DEVICE_REVOKED") {
        if (this.config.onDeviceRevoked) {
          this.config.onDeviceRevoked();
        }
      }

      for (const id of opIds) {
        await this.queueRepo.markFailed(id, errorCode || "NETWORK_ERROR", err.message || "Sync upload failed");
      }

      throw err;
    }
  }

  public async pullDeltaChanges(limit = 100): Promise<number> {
    let cursor = await this.getCursor();
    let totalPulled = 0;
    let hasMore = true;

    while (hasMore) {
      const response = await this.config.apiClient.get<SyncDownloadResponse>(
        `/api/v1/sync/download?cursor=${cursor}&limit=${limit}`
      );

      const downloadData = response.data;
      if (!downloadData || !downloadData.changes) break;

      const changes = downloadData.changes;
      if (changes.length === 0) break;

      await this.driver.transaction(async (trx) => {
        const pCache = new ProductCacheRepository(trx);
        const cCache = new CustomerCacheRepository(trx);

        for (const entry of changes) {
          await this.applyChangeFeedEntry(entry, pCache, cCache);
        }

        cursor = downloadData.nextCursor;
        await trx.execute(
          `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES ('last_downloaded_cursor', ?, ?)`,
          [String(cursor), Date.now()]
        );
      });

      totalPulled += changes.length;
      hasMore = downloadData.hasMore;
    }

    return totalPulled;
  }

  private async applyChangeFeedEntry(
    entry: SyncChangeFeedItem,
    pCache: ProductCacheRepository,
    cCache: CustomerCacheRepository
  ): Promise<void> {
    const payload = entry.payload as Record<string, any>;
    if (!payload) return;

    if (entry.entityType === "PRODUCT") {
      await pCache.upsertProduct({
        id: entry.entityId,
        businessId: this.config.businessId,
        storeId: this.config.storeId,
        code: payload.sku || payload.code || "",
        name: payload.name || "Unknown Product",
        genericName: payload.genericName,
        dosageForm: payload.dosageForm,
        strength: payload.strength,
        baseUnit: payload.baseUnit || "UNIT",
        sellingUnit: payload.sellingUnit || "UNIT",
        unitsPerSellingUnit: payload.unitsPerSellingUnit || 1.0,
        taxRate: payload.taxRate || 0.0,
        isTaxInclusive: Boolean(payload.isTaxInclusive),
        prescriptionRequired: Boolean(payload.prescriptionRequired),
        sellingPrice: payload.sellingPrice || 0.0,
        mrp: payload.mrp || 0.0,
        currentStock: payload.currentStock || 0.0,
        updatedAt: Date.now(),
      });
    } else if (entry.entityType === "CUSTOMER") {
      await cCache.upsertCustomer({
        id: entry.entityId,
        businessId: this.config.businessId,
        customerCode: payload.customerCode || "CUST-000",
        fullName: payload.fullName || "Customer",
        phone: payload.phone,
        email: payload.email,
        gstin: payload.gstin,
        status: payload.status || "ACTIVE",
        updatedAt: Date.now(),
      });
    }
  }

  private async getCursor(): Promise<number> {
    const rows = await this.driver.query(
      `SELECT value FROM sync_metadata WHERE key = 'last_downloaded_cursor' LIMIT 1`
    );
    return rows.length > 0 && rows[0]?.value ? parseInt(rows[0].value, 10) : 0;
  }

  private async setMetadata(key: string, value: string): Promise<void> {
    await this.driver.execute(
      `INSERT OR REPLACE INTO sync_metadata (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, value, Date.now()]
    );
  }
}
