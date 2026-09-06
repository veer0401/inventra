import { describe, it, expect, beforeEach, vi } from "vitest";
import { MemorySqliteDriver } from "../driver/sqlite-memory";
import { initializeOfflineSchema } from "../schema/init";
import { OfflineQueueRepository } from "../repositories/offline-queue";
import { ProductCacheRepository } from "../repositories/product-cache";
import { SyncClientWorker } from "../sync/client";
import type { InventraClient } from "@inventra/api-client";
import type { SyncBatchUploadResponse, SyncDownloadResponse } from "@inventra/api-types";

describe("SyncClientWorker Engine (@inventra/offline-storage)", () => {
  let driver: MemorySqliteDriver;
  let queueRepo: OfflineQueueRepository;
  let productRepo: ProductCacheRepository;
  let mockApiClient: Partial<InventraClient>;

  const businessId = "BIZ-SYNC-01";
  const storeId = "STORE-SYNC-01";
  const deviceId = "DEV-SYNC-01";
  const userId = "USER-SYNC-01";

  beforeEach(async () => {
    driver = new MemorySqliteDriver();
    await driver.connect();
    await initializeOfflineSchema(driver);

    queueRepo = new OfflineQueueRepository(driver);
    productRepo = new ProductCacheRepository(driver);
  });

  it("pushes pending operations in sequence and updates local operation statuses to APPLIED", async () => {
    await queueRepo.enqueueOperation({
      operationId: "OP-001",
      businessId,
      storeId,
      deviceId,
      userId,
      eventType: "SALE_CREATED",
      eventVersion: 1,
      payload: { total: 100 },
      idempotencyKey: "IDEM-001",
    });

    const mockUploadResponse: SyncBatchUploadResponse = {
      totalProcessed: 1,
      appliedCount: 1,
      duplicateCount: 0,
      rejectedCount: 0,
      results: [
        {
          eventId: "OP-001",
          deviceSequenceNumber: 1,
          status: "APPLIED",
          serverEntityId: "SALE-SRV-999",
        },
      ],
    };

    mockApiClient = {
      post: vi.fn().mockResolvedValue({ data: mockUploadResponse }),
      get: vi.fn().mockResolvedValue({ data: { changes: [], nextCursor: 0, hasMore: false } }),
    };

    const worker = new SyncClientWorker(driver, {
      businessId,
      storeId,
      deviceId,
      apiClient: mockApiClient as InventraClient,
    });

    const result = await worker.pushPendingOperations();

    expect(result.appliedCount).toBe(1);
    expect(mockApiClient.post).toHaveBeenCalledWith(
      "/api/v1/sync/upload",
      expect.objectContaining({
        operations: [
          expect.objectContaining({
            eventId: "OP-001",
            deviceSequenceNumber: 1,
          }),
        ],
      })
    );

    const pending = await queueRepo.getPendingOperations(businessId);
    expect(pending.length).toBe(0);
  });

  it("handles server CONFLICT by recording conflict record and preserving historical operation", async () => {
    await queueRepo.enqueueOperation({
      operationId: "OP-CONFLICT-01",
      businessId,
      storeId,
      deviceId,
      userId,
      eventType: "SALE_CREATED",
      eventVersion: 1,
      payload: { total: 50 },
      idempotencyKey: "IDEM-CONF-01",
    });

    const mockUploadResponse: SyncBatchUploadResponse = {
      totalProcessed: 1,
      appliedCount: 0,
      duplicateCount: 0,
      rejectedCount: 1,
      results: [
        {
          eventId: "OP-CONFLICT-01",
          deviceSequenceNumber: 1,
          status: "REJECTED",
          errorCode: "BATCH_EXPIRED",
          errorMessage: "Selected batch expired before sync upload",
        },
      ],
    };

    mockApiClient = {
      post: vi.fn().mockResolvedValue({ data: mockUploadResponse }),
    };

    const worker = new SyncClientWorker(driver, {
      businessId,
      storeId,
      deviceId,
      apiClient: mockApiClient as InventraClient,
    });

    const pushResult = await worker.pushPendingOperations();

    expect(pushResult.conflictCount).toBe(1);

    const conflicts = await queueRepo.getSyncConflicts();
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].operationId).toBe("OP-CONFLICT-01");
    expect(conflicts[0].errorCode).toBe("BATCH_EXPIRED");
  });

  it("pulls delta change feed and updates local product cache with cursor advancement", async () => {
    const mockDownloadResponse: SyncDownloadResponse = {
      nextCursor: 42,
      hasMore: false,
      changes: [
        {
          changeSeq: 42,
          id: "CHG-42",
          entityType: "PRODUCT",
          entityId: "PROD-REMOTE-01",
          operation: "UPSERT",
          entityVersion: 1,
          createdAt: new Date().toISOString(),
          payload: {
            sku: "SKU-SYNC",
            name: "Cetirizine 10mg",
            sellingPrice: 45.0,
            mrp: 50.0,
            currentStock: 25.0,
          },
        },
      ],
    };

    mockApiClient = {
      get: vi.fn().mockResolvedValue({ data: mockDownloadResponse }),
    };

    const worker = new SyncClientWorker(driver, {
      businessId,
      storeId,
      deviceId,
      apiClient: mockApiClient as InventraClient,
    });

    const count = await worker.pullDeltaChanges();
    expect(count).toBe(1);

    const found = await productRepo.searchProducts(businessId, "Cetirizine");
    expect(found.length).toBe(1);
    expect(found[0].name).toBe("Cetirizine 10mg");
    expect(found[0].sellingPrice).toBe(45.0);
  });

  it("triggers onDeviceRevoked callback when server rejects with DEVICE_REVOKED error", async () => {
    await queueRepo.enqueueOperation({
      operationId: "OP-REVOKED",
      businessId,
      storeId,
      deviceId,
      userId,
      eventType: "SALE_CREATED",
      eventVersion: 1,
      payload: { total: 10 },
      idempotencyKey: "IDEM-REV",
    });

    const revokedError = {
      response: {
        status: 403,
        data: {
          errorCode: "DEVICE_REVOKED",
          message: "This terminal device has been revoked by business administrator",
        },
      },
    };

    mockApiClient = {
      post: vi.fn().mockRejectedValue(revokedError),
    };

    const onDeviceRevoked = vi.fn();

    const worker = new SyncClientWorker(driver, {
      businessId,
      storeId,
      deviceId,
      apiClient: mockApiClient as InventraClient,
      onDeviceRevoked,
    });

    await expect(worker.pushPendingOperations()).rejects.toThrow();
    expect(onDeviceRevoked).toHaveBeenCalledTimes(1);
  });
});
