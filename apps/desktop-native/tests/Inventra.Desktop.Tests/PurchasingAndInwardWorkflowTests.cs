using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Core.Domain.Inventory;
using Inventra.Desktop.Core.Domain.Purchasing;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Logging;
using Xunit;

namespace Inventra.Desktop.Tests;

public class PurchasingAndInwardWorkflowTests : IDisposable
{
    private readonly string _testDbPath;
    private readonly DatabaseContext _dbContext;
    private readonly IPurchasingRepository _purchasingRepo;
    private readonly IProductRepository _productRepo;
    private readonly IOfflineQueueRepository _offlineQueueRepo;
    private readonly TestLogger _logger;

    private const string TestBusinessId = "biz_pharma_01";
    private const string OtherBusinessId = "biz_pharma_02";
    private const string TestStoreId = "store_main_01";
    private const string TestUserId = "user_pharmacist_01";
    private const string TestDeviceId = "dev_pos_01";

    public PurchasingAndInwardWorkflowTests()
    {
        _testDbPath = Path.Combine(Path.GetTempPath(), $"inventra_purch_test_{Guid.NewGuid():N}.db");
        _dbContext = new DatabaseContext(_testDbPath);
        _logger = new TestLogger();
        _offlineQueueRepo = new OfflineQueueRepository(_dbContext);
        _purchasingRepo = new PurchasingRepository(_dbContext);
        _productRepo = new ProductRepository(_dbContext);
    }

    public void Dispose()
    {
        try
        {
            if (File.Exists(_testDbPath)) File.Delete(_testDbPath);
            var wal = _testDbPath + "-wal";
            if (File.Exists(wal)) File.Delete(wal);
            var shm = _testDbPath + "-shm";
            if (File.Exists(shm)) File.Delete(shm);
        }
        catch { }
    }

    private async Task<ProductItem> SeedProductAsync(string id, string name, double stock = 0)
    {
        await _dbContext.InitializeAsync(); // ensure schema is created
        var p = new ProductItem
        {
            Id = id,
            BusinessId = TestBusinessId,
            StoreId = TestStoreId,
            Code = "MED-" + id,
            Name = name,
            GenericName = "Generic " + name,
            BaseUnit = "STRIP",
            SellingUnit = "STRIP",
            UnitsPerSellingUnit = 1.0,
            CurrentStock = stock,
            SellingPrice = 25m,
            Mrp = 30m,
            TaxRate = 12m,
            PrescriptionRequired = true,
            UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };
        await _productRepo.UpsertProductAsync(p);
        return p;
    }

    // =========================================================================
    // 1. SUPPLIER MANAGEMENT & BUSINESS ISOLATION
    // =========================================================================

    [Fact]
    public async Task CreateSupplier_PersistsAndEnforcesBusinessIsolation()
    {
        await _dbContext.InitializeAsync();
        await _purchasingRepo.UpsertSupplierAsync(new SupplierItem
        {
            Id = "sup_01", BusinessId = TestBusinessId,
            SupplierCode = "SUP-APEX", LegalName = "Apex Pharma Distributors Ltd",
            TradeName = "Apex Pharma", Gstin = "27AABCA1234F1Z5",
            PhoneNumber = "+919876543210", Email = "orders@apexpharma.com",
            PaymentTermsDays = 30, Status = "ACTIVE",
            UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });
        await _purchasingRepo.UpsertSupplierAsync(new SupplierItem
        {
            Id = "sup_02", BusinessId = OtherBusinessId,
            SupplierCode = "SUP-OTHER", LegalName = "Other Med Supply Co",
            Status = "ACTIVE", UpdatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });

        var biz1 = await _purchasingRepo.GetSuppliersAsync(TestBusinessId);
        Assert.Single(biz1);
        Assert.Equal("Apex Pharma Distributors Ltd", biz1[0].LegalName);
        Assert.Equal("27AABCA1234F1Z5", biz1[0].Gstin);

        var biz2 = await _purchasingRepo.GetSuppliersAsync(OtherBusinessId);
        Assert.Single(biz2);
        Assert.Equal("Other Med Supply Co", biz2[0].LegalName);
    }

    // =========================================================================
    // 2. DRAFT PURCHASE ORDER — MUST NOT TOUCH INVENTORY
    // =========================================================================

    [Fact]
    public async Task CreatePurchaseDraft_DoesNotIncreaseStockOrBatches()
    {
        var product = await SeedProductAsync("prod_pcm_500", "Paracetamol 500mg");

        var po = new PurchaseOrderItem
        {
            Id = "po_101", BusinessId = TestBusinessId, StoreId = TestStoreId,
            OrderNumber = "PO-2610-0001", SupplierId = "sup_01", SupplierName = "Apex Pharma",
            SupplierInvoiceNumber = "INV-APEX-9988", OrderDate = "2026-10-06",
            PaymentTermsDays = 30, Status = "DRAFT",
            Subtotal = 1800m, TaxAmount = 216m, TotalAmount = 2016m,
            Lines = new List<PurchaseOrderLineItem>
            {
                new() {
                    Id = "line_101_1", PurchaseOrderId = "po_101",
                    ProductId = product.Id, ProductName = product.Name,
                    OrderedQuantity = 100m, UnitPrice = 18.00m,
                    TaxRate = 12.0m, TaxAmount = 216m, LineTotal = 2016m
                }
            }
        };
        await _purchasingRepo.SavePurchaseAsync(po);

        var loaded = await _purchasingRepo.GetPurchaseByIdAsync("po_101");
        Assert.NotNull(loaded);
        Assert.Equal("DRAFT", loaded.Status);
        Assert.Equal(2016m, loaded.TotalAmount);

        // Stock and batches must be untouched
        var productAfter = await _productRepo.GetProductByIdAsync(product.Id);
        Assert.Equal(0, productAfter!.CurrentStock);

        var batches = await _productRepo.GetBatchesForProductAsync(product.Id);
        Assert.Empty(batches);
    }

    // =========================================================================
    // 3. GRN INWARD — ATOMIC STOCK + BATCH CREATION + SYNC QUEUE
    // =========================================================================

    [Fact]
    public async Task PostGoodsReceipt_IncreasesStockCreatesBatchAndQueuesSync()
    {
        var product = await SeedProductAsync("prod_amox_500", "Amoxicillin 500mg");

        var po = new PurchaseOrderItem
        {
            Id = "po_201", BusinessId = TestBusinessId, StoreId = TestStoreId,
            OrderNumber = "PO-2610-0002", SupplierId = "sup_01", SupplierName = "Apex Pharma",
            OrderDate = "2026-10-06", Status = "CONFIRMED", TotalAmount = 2500m,
            Lines = new List<PurchaseOrderLineItem>
            {
                new() {
                    Id = "line_201_1", PurchaseOrderId = "po_201",
                    ProductId = product.Id, ProductName = product.Name,
                    OrderedQuantity = 100m, UnitPrice = 25.00m, LineTotal = 2500m
                }
            }
        };
        await _purchasingRepo.SavePurchaseAsync(po);

        var grn = new GoodsReceiptItem
        {
            Id = "grn_301", BusinessId = TestBusinessId, StoreId = TestStoreId,
            ReceiptNumber = "GRN-2610-0001", PurchaseOrderId = "po_201",
            SupplierId = "sup_01", SupplierName = "Apex Pharma",
            ReceivedDate = "2026-10-06", Status = "DRAFT", TotalAmount = 2500m,
            ReceivedBy = "Test Pharmacist",
            Lines = new List<GoodsReceiptLineItem>
            {
                new() {
                    Id = "grn_line_301_1", GoodsReceiptId = "grn_301",
                    PurchaseOrderLineId = "line_201_1",
                    ProductId = product.Id, ProductName = product.Name,
                    ReceivedQuantity = 100m, FreeQuantity = 0m,
                    BatchNumber = "AMX-2026-A1", ManufacturingDate = "2026-01",
                    ExpiryDate = "2028-06", UnitCost = 25.00m, Mrp = 35.00m,
                    TaxRate = 12.0m, LineTotal = 2800m
                }
            }
        };

        var posted = await _purchasingRepo.PostGoodsReceiptTransactionAsync(grn, TestUserId, TestDeviceId);

        // GRN status POSTED
        Assert.Equal("POSTED", posted.Status);
        var loadedGrn = await _purchasingRepo.GetGoodsReceiptByIdAsync("grn_301");
        Assert.NotNull(loadedGrn);
        Assert.Equal("POSTED", loadedGrn.Status);

        // PO advanced to COMPLETED
        var updatedPo = await _purchasingRepo.GetPurchaseByIdAsync("po_201");
        Assert.NotNull(updatedPo);
        Assert.Equal("COMPLETED", updatedPo.Status);

        // Stock = 100
        var updatedProduct = await _productRepo.GetProductByIdAsync(product.Id);
        Assert.Equal(100, updatedProduct!.CurrentStock);

        // Batch created with correct data
        var batches = await _productRepo.GetBatchesForProductAsync(product.Id);
        Assert.Single(batches);
        var batch = batches[0];
        Assert.Equal("AMX-2026-A1", batch.BatchNumber);
        Assert.Equal(100, batch.AvailableQuantity);
        Assert.Equal(25.00m, batch.PurchasePrice);
        Assert.Equal(35.00m, batch.Mrp);
        Assert.Equal("2028-06", batch.ExpiryDate);
        Assert.Equal("2026-01", batch.ManufacturingDate);

        // Offline operation queued for cloud sync
        var pending = await _offlineQueueRepo.GetPendingOperationsAsync(TestBusinessId);
        Assert.Contains(pending, op => op.EventType == "GOODS_RECEIPT_POSTED" && op.ServerEntityId == null);
    }

    // =========================================================================
    // 4. FEFO BATCH ORDERING
    // =========================================================================

    [Fact]
    public async Task MultipleBatches_OrderedStrictlyByFefoExpiryDateAsc()
    {
        var product = await SeedProductAsync("prod_fefo_test", "Azithromycin 500mg");

        await _purchasingRepo.PostGoodsReceiptTransactionAsync(
            new GoodsReceiptItem
            {
                Id = "grn_fefo_1", BusinessId = TestBusinessId, StoreId = TestStoreId,
                ReceiptNumber = "GRN-FEFO-01", ReceivedDate = "2026-10-06", Status = "DRAFT",
                Lines = new List<GoodsReceiptLineItem>
                {
                    new() { Id = "gl_1", GoodsReceiptId = "grn_fefo_1", ProductId = product.Id, ProductName = product.Name,
                        ReceivedQuantity = 50m, BatchNumber = "BATCH-LATER-2029",
                        ManufacturingDate = "2026-02", ExpiryDate = "2029-12", UnitCost = 40m, Mrp = 60m }
                }
            }, TestUserId, TestDeviceId);

        await _purchasingRepo.PostGoodsReceiptTransactionAsync(
            new GoodsReceiptItem
            {
                Id = "grn_fefo_2", BusinessId = TestBusinessId, StoreId = TestStoreId,
                ReceiptNumber = "GRN-FEFO-02", ReceivedDate = "2026-10-06", Status = "DRAFT",
                Lines = new List<GoodsReceiptLineItem>
                {
                    new() { Id = "gl_2", GoodsReceiptId = "grn_fefo_2", ProductId = product.Id, ProductName = product.Name,
                        ReceivedQuantity = 30m, BatchNumber = "BATCH-EARLIER-2027",
                        ManufacturingDate = "2025-05", ExpiryDate = "2027-04", UnitCost = 38m, Mrp = 60m }
                }
            }, TestUserId, TestDeviceId);

        await _purchasingRepo.PostGoodsReceiptTransactionAsync(
            new GoodsReceiptItem
            {
                Id = "grn_fefo_3", BusinessId = TestBusinessId, StoreId = TestStoreId,
                ReceiptNumber = "GRN-FEFO-03", ReceivedDate = "2026-10-06", Status = "DRAFT",
                Lines = new List<GoodsReceiptLineItem>
                {
                    new() { Id = "gl_3", GoodsReceiptId = "grn_fefo_3", ProductId = product.Id, ProductName = product.Name,
                        ReceivedQuantity = 20m, BatchNumber = "BATCH-MID-2028",
                        ManufacturingDate = "2025-09", ExpiryDate = "2028-08", UnitCost = 39m, Mrp = 60m }
                }
            }, TestUserId, TestDeviceId);

        // Total stock: 50+30+20 = 100
        var updatedProduct = await _productRepo.GetProductByIdAsync(product.Id);
        Assert.Equal(100, updatedProduct!.CurrentStock);

        // FEFO order: earliest expiry first
        var batches = await _productRepo.GetBatchesForProductAsync(product.Id);
        Assert.Equal(3, batches.Count);
        Assert.Equal("BATCH-EARLIER-2027", batches[0].BatchNumber); // 2027-04
        Assert.Equal("BATCH-MID-2028",     batches[1].BatchNumber); // 2028-08
        Assert.Equal("BATCH-LATER-2029",   batches[2].BatchNumber); // 2029-12
    }

    // =========================================================================
    // 5. PARTIAL RECEIVING
    // =========================================================================

    [Fact]
    public async Task PartialReceiving_UpdatesPoStatusToPartiallyReceivedThenCompleted()
    {
        var product = await SeedProductAsync("prod_partial_test", "Cetirizine 10mg");

        var po = new PurchaseOrderItem
        {
            Id = "po_partial_100", BusinessId = TestBusinessId, StoreId = TestStoreId,
            OrderNumber = "PO-PARTIAL-100", OrderDate = "2026-10-06", Status = "CONFIRMED",
            Lines = new List<PurchaseOrderLineItem>
            {
                new() { Id = "line_p_1", PurchaseOrderId = "po_partial_100",
                    ProductId = product.Id, ProductName = product.Name,
                    OrderedQuantity = 100m, UnitPrice = 10.00m }
            }
        };
        await _purchasingRepo.SavePurchaseAsync(po);

        // GRN 1: 60 units
        await _purchasingRepo.PostGoodsReceiptTransactionAsync(
            new GoodsReceiptItem
            {
                Id = "grn_p_1", BusinessId = TestBusinessId, StoreId = TestStoreId,
                PurchaseOrderId = "po_partial_100", ReceiptNumber = "GRN-P-1",
                ReceivedDate = "2026-10-06",
                Lines = new List<GoodsReceiptLineItem>
                {
                    new() { Id = "gl_p_1", GoodsReceiptId = "grn_p_1", PurchaseOrderLineId = "line_p_1",
                        ProductId = product.Id, ProductName = product.Name,
                        ReceivedQuantity = 60m, BatchNumber = "CTZ-B1", ExpiryDate = "2028-01", UnitCost = 10m, Mrp = 15m }
                }
            }, TestUserId, TestDeviceId);

        var poAfter1 = await _purchasingRepo.GetPurchaseByIdAsync("po_partial_100");
        Assert.Equal("PARTIALLY_RECEIVED", poAfter1!.Status);
        Assert.Equal(60, (await _productRepo.GetProductByIdAsync(product.Id))!.CurrentStock);

        // GRN 2: remaining 40 units
        await _purchasingRepo.PostGoodsReceiptTransactionAsync(
            new GoodsReceiptItem
            {
                Id = "grn_p_2", BusinessId = TestBusinessId, StoreId = TestStoreId,
                PurchaseOrderId = "po_partial_100", ReceiptNumber = "GRN-P-2",
                ReceivedDate = "2026-10-06",
                Lines = new List<GoodsReceiptLineItem>
                {
                    new() { Id = "gl_p_2", GoodsReceiptId = "grn_p_2", PurchaseOrderLineId = "line_p_1",
                        ProductId = product.Id, ProductName = product.Name,
                        ReceivedQuantity = 40m, BatchNumber = "CTZ-B2", ExpiryDate = "2028-02", UnitCost = 10m, Mrp = 15m }
                }
            }, TestUserId, TestDeviceId);

        var poAfter2 = await _purchasingRepo.GetPurchaseByIdAsync("po_partial_100");
        Assert.Equal("COMPLETED", poAfter2!.Status);
        Assert.Equal(100, (await _productRepo.GetProductByIdAsync(product.Id))!.CurrentStock);
    }

    // =========================================================================
    // 6. FREE QUANTITY
    // =========================================================================

    [Fact]
    public async Task FreeQuantity_IncrementsInventoryStock()
    {
        var product = await SeedProductAsync("prod_free_qty", "Pantoprazole 40mg");

        await _purchasingRepo.PostGoodsReceiptTransactionAsync(
            new GoodsReceiptItem
            {
                Id = "grn_free_1", BusinessId = TestBusinessId, StoreId = TestStoreId,
                ReceiptNumber = "GRN-FREE-01", ReceivedDate = "2026-10-06",
                Lines = new List<GoodsReceiptLineItem>
                {
                    new() { Id = "gl_free_1", GoodsReceiptId = "grn_free_1",
                        ProductId = product.Id, ProductName = product.Name,
                        ReceivedQuantity = 100m, FreeQuantity = 10m,
                        BatchNumber = "PANTO-F1", ExpiryDate = "2028-05", UnitCost = 50m, Mrp = 80m }
                }
            }, TestUserId, TestDeviceId);

        // Total = 100 purchased + 10 free = 110
        var updatedProduct = await _productRepo.GetProductByIdAsync(product.Id);
        Assert.Equal(110, updatedProduct!.CurrentStock);

        var batches = await _productRepo.GetBatchesForProductAsync(product.Id);
        Assert.Single(batches);
        Assert.Equal(110, batches[0].AvailableQuantity);
        Assert.Equal(50.00m, batches[0].PurchasePrice);
    }

    // =========================================================================
    // 7a. SAME BATCH SAME EXPIRY — MERGE INTO EXISTING
    // =========================================================================

    [Fact]
    public async Task SameBatchSameExpiry_IncrementsExistingBatch()
    {
        var product = await SeedProductAsync("prod_dup_merge", "Ibuprofen 400mg");

        await _purchasingRepo.PostGoodsReceiptTransactionAsync(
            new GoodsReceiptItem
            {
                Id = "grn_dup_1", BusinessId = TestBusinessId, StoreId = TestStoreId,
                ReceiptNumber = "GRN-DUP-01", ReceivedDate = "2026-10-06",
                Lines = new List<GoodsReceiptLineItem>
                {
                    new() { Id = "gl_dup_1", GoodsReceiptId = "grn_dup_1",
                        ProductId = product.Id, ProductName = product.Name,
                        ReceivedQuantity = 50m, BatchNumber = "BATCH-SAME-01",
                        ExpiryDate = "2028-10", UnitCost = 12m, Mrp = 20m }
                }
            }, TestUserId, TestDeviceId);

        await _purchasingRepo.PostGoodsReceiptTransactionAsync(
            new GoodsReceiptItem
            {
                Id = "grn_dup_2", BusinessId = TestBusinessId, StoreId = TestStoreId,
                ReceiptNumber = "GRN-DUP-02", ReceivedDate = "2026-10-06",
                Lines = new List<GoodsReceiptLineItem>
                {
                    new() { Id = "gl_dup_2", GoodsReceiptId = "grn_dup_2",
                        ProductId = product.Id, ProductName = product.Name,
                        ReceivedQuantity = 30m, BatchNumber = "BATCH-SAME-01",
                        ExpiryDate = "2028-10", UnitCost = 12m, Mrp = 20m }
                }
            }, TestUserId, TestDeviceId);

        // 1 batch with qty 80, total stock 80
        var batches = await _productRepo.GetBatchesForProductAsync(product.Id);
        Assert.Single(batches);
        Assert.Equal(80, batches[0].AvailableQuantity);
        Assert.Equal(80, (await _productRepo.GetProductByIdAsync(product.Id))!.CurrentStock);
    }

    // =========================================================================
    // 7b. SAME BATCH CONFLICTING EXPIRY — ROLLBACK
    // =========================================================================

    [Fact]
    public async Task SameBatchConflictingExpiry_ThrowsAndRollsBack()
    {
        var product = await SeedProductAsync("prod_dup_conflict", "Dolo 650", stock: 50);

        await _productRepo.UpsertBatchAsync(new BatchItem
        {
            Id = "batch_dolo_01", ProductId = product.Id,
            BusinessId = TestBusinessId, StoreId = TestStoreId,
            BatchNumber = "DOLO-CONFLICT-B1", ExpiryDate = "2028-05",
            AvailableQuantity = 50, PurchasePrice = 15m, Mrp = 30m
        });

        var grn = new GoodsReceiptItem
        {
            Id = "grn_conflict_1", BusinessId = TestBusinessId, StoreId = TestStoreId,
            ReceiptNumber = "GRN-CONF-01", ReceivedDate = "2026-10-06",
            Lines = new List<GoodsReceiptLineItem>
            {
                new() { Id = "gl_conf_1", GoodsReceiptId = "grn_conflict_1",
                    ProductId = product.Id, ProductName = product.Name,
                    ReceivedQuantity = 20m, BatchNumber = "DOLO-CONFLICT-B1",
                    ExpiryDate = "2027-11", // Conflict with existing 2028-05
                    UnitCost = 15m, Mrp = 30m }
            }
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _purchasingRepo.PostGoodsReceiptTransactionAsync(grn, TestUserId, TestDeviceId));

        Assert.Contains("already exists", ex.Message);

        // Stock must be unchanged, GRN must not persist
        Assert.Equal(50, (await _productRepo.GetProductByIdAsync(product.Id))!.CurrentStock);
        Assert.Null(await _purchasingRepo.GetGoodsReceiptByIdAsync("grn_conflict_1"));
    }

    // =========================================================================
    // 8. INPUT VALIDATION — ARGUMENT EXCEPTIONS
    // =========================================================================

    [Fact]
    public async Task PostGoodsReceipt_InvalidInputs_ThrowArgumentExceptions()
    {
        var product = await SeedProductAsync("prod_val_test", "Metformin 500mg");

        // Negative received quantity
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _purchasingRepo.PostGoodsReceiptTransactionAsync(
                new GoodsReceiptItem
                {
                    Id = "grn_v1", BusinessId = TestBusinessId, StoreId = TestStoreId,
                    ReceiptNumber = "GRN-V1", ReceivedDate = "2026-10-06",
                    Lines = new List<GoodsReceiptLineItem>
                    {
                        new() { Id = "gl_v1", GoodsReceiptId = "grn_v1", ProductId = product.Id,
                            ProductName = product.Name, ReceivedQuantity = -10m,
                            BatchNumber = "MET-B1", ExpiryDate = "2028-01" }
                    }
                }, TestUserId, TestDeviceId));

        // Empty batch number
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _purchasingRepo.PostGoodsReceiptTransactionAsync(
                new GoodsReceiptItem
                {
                    Id = "grn_v2", BusinessId = TestBusinessId, StoreId = TestStoreId,
                    ReceiptNumber = "GRN-V2", ReceivedDate = "2026-10-06",
                    Lines = new List<GoodsReceiptLineItem>
                    {
                        new() { Id = "gl_v2", GoodsReceiptId = "grn_v2", ProductId = product.Id,
                            ProductName = product.Name, ReceivedQuantity = 10m,
                            BatchNumber = "", ExpiryDate = "2028-01" }
                    }
                }, TestUserId, TestDeviceId));

        // Expiry before manufacturing date
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _purchasingRepo.PostGoodsReceiptTransactionAsync(
                new GoodsReceiptItem
                {
                    Id = "grn_v3", BusinessId = TestBusinessId, StoreId = TestStoreId,
                    ReceiptNumber = "GRN-V3", ReceivedDate = "2026-10-06",
                    Lines = new List<GoodsReceiptLineItem>
                    {
                        new() { Id = "gl_v3", GoodsReceiptId = "grn_v3", ProductId = product.Id,
                            ProductName = product.Name, ReceivedQuantity = 10m,
                            BatchNumber = "MET-B2", ManufacturingDate = "2028-01",
                            ExpiryDate = "2026-01" } // Expiry < Mfg
                    }
                }, TestUserId, TestDeviceId));

        // Negative MRP
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _purchasingRepo.PostGoodsReceiptTransactionAsync(
                new GoodsReceiptItem
                {
                    Id = "grn_v4", BusinessId = TestBusinessId, StoreId = TestStoreId,
                    ReceiptNumber = "GRN-V4", ReceivedDate = "2026-10-06",
                    Lines = new List<GoodsReceiptLineItem>
                    {
                        new() { Id = "gl_v4", GoodsReceiptId = "grn_v4", ProductId = product.Id,
                            ProductName = product.Name, ReceivedQuantity = 10m,
                            BatchNumber = "MET-B3", ExpiryDate = "2028-01", Mrp = -50m }
                    }
                }, TestUserId, TestDeviceId));
    }

    // =========================================================================
    // 9. AUTHORIZATION — PURCHASE CREATE PERMISSION
    // =========================================================================

    [Fact]
    public void AuthorizationService_EnforcesPurchaseCreatePermission()
    {
        // no DB needed — purely in-memory session & permission check
        UserSession? current = null;
        var auth = new AuthorizationService(() => current, _logger);

        // Pharmacist: has PurchaseCreate
        current = new UserSession
        {
            UserId = "u01", Email = "pharmacist@inv.com", FullName = "Lead Pharmacist",
            Role = "PHARMACIST", BusinessId = TestBusinessId, BusinessName = "Inventra Pharmacy",
            StoreId = TestStoreId, StoreName = "Main Store", Gstin = "27AABCA1234F1Z5",
            AccessToken = "tok_pharma", OfflinePolicyMaxDays = 14,
            Permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { AppPermissions.PurchaseCreate, AppPermissions.InventoryView }
        };
        Assert.True(auth.CanCreatePurchase());
        auth.RequirePermission(AppPermissions.PurchaseCreate); // must not throw

        // Cashier: no PurchaseCreate
        current = new UserSession
        {
            UserId = "u02", Email = "cashier@inv.com", FullName = "Cashier",
            Role = "CASHIER", BusinessId = TestBusinessId, BusinessName = "Inventra Pharmacy",
            StoreId = TestStoreId, StoreName = "Main Store", Gstin = "27AABCA1234F1Z5",
            AccessToken = "tok_cashier", OfflinePolicyMaxDays = 14,
            Permissions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { AppPermissions.SaleCreate, AppPermissions.SaleView }
        };
        Assert.False(auth.CanCreatePurchase());
        Assert.Throws<UnauthorizedAccessException>(() =>
            auth.RequirePermission(AppPermissions.PurchaseCreate));
    }
}
