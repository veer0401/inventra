import { describe, it, expect, beforeEach } from "vitest";
import { MemorySqliteDriver } from "../driver/sqlite-memory";
import { initializeOfflineSchema } from "../schema/init";
import { ProductCacheRepository } from "../repositories/product-cache";
import { CustomerCacheRepository } from "../repositories/customer-cache";
import { OfflineQueueRepository } from "../repositories/offline-queue";
import { PrintJobRepository } from "../repositories/print-job";
import type { ReceiptDocument } from "@inventra/print";

describe("Local SQLite Offline Storage Engine (@inventra/offline-storage)", () => {
  let driver: MemorySqliteDriver;
  let productRepo: ProductCacheRepository;
  let customerRepo: CustomerCacheRepository;
  let queueRepo: OfflineQueueRepository;
  let printRepo: PrintJobRepository;

  const businessId = "BIZ-01";
  const storeId = "STORE-01";
  const deviceId = "DEV-01";
  const userId = "USER-01";

  beforeEach(async () => {
    driver = new MemorySqliteDriver();
    await driver.connect();
    await initializeOfflineSchema(driver);

    productRepo = new ProductCacheRepository(driver);
    customerRepo = new CustomerCacheRepository(driver);
    queueRepo = new OfflineQueueRepository(driver);
    printRepo = new PrintJobRepository(driver);
  });

  it("initializes SQLite schema without errors", async () => {
    const rows = await driver.query("SELECT * FROM cache_products WHERE business_id = ?", [businessId]);
    expect(rows).toEqual([]);
  });

  it("caches and retrieves customers by phone and name query", async () => {
    await customerRepo.upsertCustomer({
      id: "CUST-001",
      businessId,
      customerCode: "CUST-000001",
      fullName: "Ananya Roy",
      phone: "9876543210",
      email: "ananya@example.com",
      status: "ACTIVE",
    });

    const byPhone = await customerRepo.getByPhone(businessId, "9876543210");
    expect(byPhone).not.toBeNull();
    expect(byPhone?.fullName).toBe("Ananya Roy");

    const searchList = await customerRepo.searchCustomers(businessId, "Ananya");
    expect(searchList.length).toBe(1);
    expect(searchList[0].customerCode).toBe("CUST-000001");
  });

  it("caches products, identifiers, and FEFO batches for rapid offline lookup", async () => {
    const prodId = "PROD-AMOX-500";

    await productRepo.upsertProduct({
      id: prodId,
      businessId,
      storeId,
      code: "AMOX500",
      name: "Amoxicillin 500mg Capsules",
      genericName: "Amoxicillin",
      baseUnit: "CAPSULE",
      sellingUnit: "STRIP",
      unitsPerSellingUnit: 10,
      taxRate: 12.0,
      isTaxInclusive: true,
      prescriptionRequired: true,
      sellingPrice: 65.0,
      mrp: 70.0,
      currentStock: 40.0,
      updatedAt: Date.now(),
    });

    await productRepo.upsertIdentifier({
      id: "ID-AMOX-BARCODE",
      businessId,
      productId: prodId,
      identifierType: "BARCODE",
      identifierValue: "8901234567890",
      isPrimary: true,
    });

    await productRepo.upsertBatch({
      id: "BATCH-A1",
      businessId,
      storeId,
      productId: prodId,
      batchNumber: "AMX-001",
      expiryDate: "2027-04",
      availableQuantity: 20.0,
      sellingPrice: 65.0,
      mrp: 70.0,
    });

    await productRepo.upsertBatch({
      id: "BATCH-A2",
      businessId,
      storeId,
      productId: prodId,
      batchNumber: "AMX-002",
      expiryDate: "2026-11", // Earlier expiry
      availableQuantity: 20.0,
      sellingPrice: 65.0,
      mrp: 70.0,
    });

    // Barcode Lookup
    const matched = await productRepo.lookupByBarcode(businessId, "8901234567890");
    expect(matched).not.toBeNull();
    expect(matched?.id).toBe(prodId);
    expect(matched?.name).toBe("Amoxicillin 500mg Capsules");
    expect(matched?.fefoBatchNumber).toBe("AMX-002"); // Should pick earliest expiring batch AMX-002

    // FEFO list
    const fefoBatches = await productRepo.getFefoBatches(businessId, storeId, prodId);
    expect(fefoBatches.length).toBe(2);
    expect(fefoBatches[0].batchNumber).toBe("AMX-002");
    expect(fefoBatches[1].batchNumber).toBe("AMX-001");
  });

  it("decrements local stock atomically upon offline sale", async () => {
    const prodId = "PROD-PCM";
    const batchId = "BATCH-PCM-1";

    await productRepo.upsertProduct({
      id: prodId,
      businessId,
      name: "Paracetamol 650mg",
      baseUnit: "TABLET",
      sellingUnit: "STRIP",
      unitsPerSellingUnit: 15,
      taxRate: 5.0,
      isTaxInclusive: true,
      prescriptionRequired: false,
      sellingPrice: 32.0,
      mrp: 35.0,
      currentStock: 100.0,
      updatedAt: Date.now(),
    });

    await productRepo.upsertBatch({
      id: batchId,
      businessId,
      storeId,
      productId: prodId,
      batchNumber: "PCM-BATCH",
      expiryDate: "2028-01",
      availableQuantity: 50.0,
      sellingPrice: 32.0,
      mrp: 35.0,
    });

    // Execute atomic offline sale checkout
    await driver.transaction(async () => {
      await productRepo.decrementLocalBatchStock(batchId, 2.0);
      await productRepo.decrementLocalProductStock(prodId, 2.0);
    });

    const batches = await productRepo.getFefoBatches(businessId, storeId, prodId);
    expect(batches[0].availableQuantity).toBe(48.0);
  });

  it("enforces durable offline queue monotonic sequence numbers and SHA-256 checksums", async () => {
    const op1 = await queueRepo.enqueueOperation({
      operationId: "01918a22-op1",
      businessId,
      storeId,
      deviceId,
      userId,
      eventType: "SALE_CREATED",
      eventVersion: 1,
      payload: { saleAmount: 140.0, lines: [{ productId: "PROD-1", qty: 2 }] },
      idempotencyKey: "OFFLINE-IDEM-001",
    });

    expect(op1.deviceSequenceNumber).toBe(1);
    expect(op1.payloadChecksum).toHaveLength(64); // Valid SHA-256 hex string

    const op2 = await queueRepo.enqueueOperation({
      operationId: "01918a22-op2",
      businessId,
      storeId,
      deviceId,
      userId,
      eventType: "SALE_CREATED",
      eventVersion: 1,
      payload: { saleAmount: 220.0, lines: [{ productId: "PROD-2", qty: 1 }] },
      idempotencyKey: "OFFLINE-IDEM-002",
    });

    expect(op2.deviceSequenceNumber).toBe(2);

    const pending = await queueRepo.getPendingOperations(businessId);
    expect(pending.length).toBe(2);
    expect(pending[0].deviceSequenceNumber).toBe(1);
    expect(pending[1].deviceSequenceNumber).toBe(2);
  });

  it("rolls back all changes if an error occurs inside a transaction", async () => {
    const prodId = "PROD-TX-FAIL";

    await productRepo.upsertProduct({
      id: prodId,
      businessId,
      name: "Transaction Test Item",
      baseUnit: "UNIT",
      sellingUnit: "UNIT",
      unitsPerSellingUnit: 1,
      taxRate: 0,
      isTaxInclusive: true,
      prescriptionRequired: false,
      sellingPrice: 10,
      mrp: 10,
      currentStock: 50,
      updatedAt: Date.now(),
    });

    await expect(
      driver.transaction(async () => {
        await productRepo.decrementLocalProductStock(prodId, 10);
        throw new Error("Simulated SQLite failure midway through checkout");
      })
    ).rejects.toThrow("Simulated SQLite failure");

    // Verify stock remains unmodified (50, not 40)
    const searchRes = await productRepo.searchProducts(businessId, "Transaction Test Item");
    expect(searchRes[0].currentStock).toBe(50);
  });

  it("queues print jobs durably and tracks printing status", async () => {
    const dummyReceipt: ReceiptDocument = {
      header: { pharmacyName: "Inventra Care", storeName: "Main Store" },
      metadata: { saleNumber: "S-1", invoiceNumber: "INV-1", date: "2026-08-28", cashierName: "John" },
      lines: [{ name: "Medicine A", quantity: 1, sellingUnit: "STRIP", unitPrice: 50, totalAmount: 50 }],
      financials: { subtotal: 50, discountAmount: 0, taxAmount: 0, roundOffAmount: 0, totalAmount: 50, paidAmount: 50, changeAmount: 0, paymentMethod: "CASH" },
      footer: { returnPolicyNotice: "No returns" },
    };

    const job = await printRepo.enqueuePrintJob({
      businessId,
      storeId,
      deviceId,
      documentType: "RECEIPT_80MM",
      sourceEntityId: "SALE-01",
      receiptData: dummyReceipt,
      printerName: "Counter Thermal",
    });

    expect(job.status).toBe("QUEUED");
    expect(job.jobId).toMatch(/^PJ-/);

    await printRepo.markPrinted(job.jobId);

    const pending = await printRepo.getPendingPrintJobs(businessId);
    expect(pending.length).toBe(0);
  });
});
