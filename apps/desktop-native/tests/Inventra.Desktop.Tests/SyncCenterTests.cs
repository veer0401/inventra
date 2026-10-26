using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Catalog;
using Inventra.Desktop.Core.Domain.Identity;
using Inventra.Desktop.Core.Domain.Imports;
using Inventra.Desktop.Core.Domain.Inventory;
using Inventra.Desktop.Core.Domain.Purchasing;
using Inventra.Desktop.Core.Domain.Sales;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Connectivity;
using Inventra.Desktop.Infrastructure.Identity;
using Inventra.Desktop.Infrastructure.Imports;
using Inventra.Desktop.Infrastructure.Sync;
using Microsoft.Data.Sqlite;
using Xunit;

namespace Inventra.Desktop.Tests;

public class SyncCenterTests : IDisposable
{
    private const string Biz = "BIZ-01";
    private const string Store = "STORE-01";
    private const string Device = "8d9c1d2e-5b6a-4c3f-9a10-2f4b7c8d9e01";

    private readonly string _path = Path.Combine(Path.GetTempPath(), $"inventra_syncctr_{Guid.NewGuid()}.db");
    private readonly DatabaseContext _db;
    private readonly OfflineQueueRepository _queue;
    private readonly PurchasingRepository _purchasing;
    private readonly SalesRepository _sales;
    private readonly ImportQueueRepository _jobs;
    private readonly ProductRepository _products;
    private readonly MockInventraApiClient _api = new();
    private readonly FakeConnectivity _net = new() { Online = true };

    public SyncCenterTests()
    {
        _db = new DatabaseContext(_path);
        _queue = new OfflineQueueRepository(_db);
        _purchasing = new PurchasingRepository(_db);
        _sales = new SalesRepository(_db);
        _jobs = new ImportQueueRepository(_db);
        _products = new ProductRepository(_db);
    }

    public void Dispose()
    {
        SqliteConnection.ClearAllPools();
        foreach (var f in new[] { _path, _path + "-wal", _path + "-shm" })
        {
            try { if (File.Exists(f)) File.Delete(f); } catch { /* temp file */ }
        }
    }

    private ImportQueueService Imports() => new(_jobs, _products, _api, _net);
    private OperationResolutionService Resolver() => new(_queue, _purchasing, _sales);

    private static GlobalMedicineItem Med(string id, string name) => new() { Id = id, Name = name, GenericName = name + " generic" };

    private static ProductApiDto Server(string id, string name) =>
        new(Id: "srv-" + id, Name: name, SellingUnit: "STRIP", UnitsPerSellingUnit: 10);

    private static QuickImportResult Imported(string id, string name) => new(true, Server(id, name), null, 200, 1);

    private async Task<ImportJob> JobOf(string globalId) =>
        (await _jobs.ListAsync(Biz)).Single(j => j.GlobalMedicineId == globalId);

    // ------------------------------------------------------------ describer

    [Fact]
    public void Describer_SaleShowsInvoiceCustomerAmountAndItems()
    {
        var sale = SyncContractTests.SampleSale("Credit"); // "Credit" is noted in the payload; only the invoice should surface
        var d = OperationDescriber.Describe("SALE_CREATED", SaleSyncPayload.Build(sale));

        Assert.Equal("Sale", d.Title);
        Assert.Contains("STR-20261026-0001", d.Detail);
        Assert.Contains("Asha Rao", d.Detail);
        Assert.Contains("₹110.00", d.Detail);
        Assert.Contains("1 item", d.Detail);
        Assert.DoesNotContain("local payment method", d.Detail);
    }

    [Fact]
    public void Describer_CoversSupplierOrderAndReceipt_AndNeverThrowsOnBadJson()
    {
        var supplier = OperationDescriber.Describe("SUPPLIER_CREATED", "{\"legalName\":\"Acme\",\"supplierCode\":\"S-1\"}");
        Assert.Equal("New supplier", supplier.Title);
        Assert.Equal("Acme · (S-1)", supplier.Detail);

        var po = OperationDescriber.Describe("PURCHASE_ORDER_CREATED", PurchaseOrderSyncPayload.Build(SyncContractTests.SamplePurchaseOrder()));
        Assert.Equal("Purchase order", po.Title);
        Assert.Contains("PO-261026-1001", po.Detail);
        Assert.Contains("1 line", po.Detail);

        var receipt = OperationDescriber.Describe("GOODS_RECEIPT_POSTED", "{\"receiptNumber\":\"GRN-9\",\"lines\":[{},{}]}");
        Assert.Equal("Goods receipt", receipt.Title);
        Assert.Equal("GRN-9 · 2 lines", receipt.Detail);

        var broken = OperationDescriber.Describe("SALE_CREATED", "not json");
        Assert.Equal("SALE_CREATED", broken.Title);
        Assert.Equal(string.Empty, broken.Detail);
    }

    // ------------------------------------------------- review, retry, dismiss

    private async Task<(OfflineOperation Op, SaleRecord Sale)> FailedSaleAsync(string code = "PRICE_SNAPSHOT_INVALID")
    {
        await _db.InitializeAsync();
        var sale = SyncContractTests.SampleSale();
        sale.Id = Guid.NewGuid().ToString();
        sale.BusinessId = Biz;
        sale.DeviceId = Device;
        sale.UserId = "USR-01";
        await _sales.CompleteSaleWithOutboxAsync(sale);
        var op = Assert.Single(await _queue.GetPendingOperationsAsync(Biz));
        await _queue.MarkFailedAsync(op.OperationId, code, "Submitted unit price does not match");
        await _sales.MarkSaleSyncResultAsync(sale.Id, "FAILED", null, code);
        return (op, sale);
    }

    private async Task<string> SaleStatusAsync(string saleId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT sync_status || '|' || COALESCE(sync_error, '') FROM local_sales WHERE id = @i;";
        cmd.Parameters.AddWithValue("@i", saleId);
        return (string)(await cmd.ExecuteScalarAsync())!;
    }

    [Fact]
    public async Task NeedsAttention_ListsFailedAndRetryingOperations_ButNotSyncedOrDismissedOnes()
    {
        var (failed, _) = await FailedSaleAsync();
        var retrying = await _queue.EnqueueOperationAsync(Biz, Store, Device, "USR-01", "SUPPLIER_CREATED", "{}", "SUPPLIER-r");
        await _queue.MarkRetryAsync(retrying.OperationId, "PROCESSING_ERROR", "busy");
        var synced = await _queue.EnqueueOperationAsync(Biz, Store, Device, "USR-01", "SUPPLIER_CREATED", "{}", "SUPPLIER-s");
        await _queue.MarkSyncedAsync(synced.OperationId, "srv");
        var dismissed = await _queue.EnqueueOperationAsync(Biz, Store, Device, "USR-01", "SUPPLIER_CREATED", "{}", "SUPPLIER-d");
        await _queue.MarkFailedAsync(dismissed.OperationId, "X", "x");
        await _queue.DismissAsync(dismissed.OperationId, "handled by phone");
        var fresh = await _queue.EnqueueOperationAsync(Biz, Store, Device, "USR-01", "SUPPLIER_CREATED", "{}", "SUPPLIER-f"); // never tried

        var ids = (await _queue.GetOperationsNeedingAttentionAsync(Biz)).Select(o => o.OperationId).ToHashSet();

        Assert.Contains(failed.OperationId, ids);
        Assert.Contains(retrying.OperationId, ids);
        Assert.DoesNotContain(synced.OperationId, ids);
        Assert.DoesNotContain(dismissed.OperationId, ids);
        Assert.DoesNotContain(fresh.OperationId, ids);
    }

    [Fact]
    public async Task Retry_PutsTheOperationAndItsSaleBackInTheQueue_AndTheNextSyncSendsIt()
    {
        var (op, sale) = await FailedSaleAsync();
        Assert.StartsWith("FAILED", await SaleStatusAsync(sale.Id));

        var result = await Resolver().RetryAsync(Biz, op.OperationId);

        Assert.True(result.Success, result.Message);
        var back = await _queue.GetOperationAsync(op.OperationId);
        Assert.Equal("PENDING", back!.RawStatus);
        Assert.Equal(0, back.RetryCount);
        Assert.Null(back.ErrorCode);
        Assert.StartsWith("PENDING", await SaleStatusAsync(sale.Id));

        _api.UploadHandler = (_, ops) => new SyncUploadApiResponse(ops.Count, ops.Select(o => new SyncOperationResultApiDto(o.EventId, "APPLIED", "srv-sale", null, "ok")).ToList());
        await new SyncEngineService(_queue, _api, _purchasing, _sales).RunSyncCycleAsync(Biz, Device);

        Assert.StartsWith("SYNCED", await SaleStatusAsync(sale.Id));
        Assert.Equal("SYNCED", (await _queue.GetOperationAsync(op.OperationId))!.RawStatus);
    }

    [Theory]
    [InlineData("UNSUPPORTED_EVENT_TYPE")]
    [InlineData("MALFORMED_PAYLOAD")]
    public async Task Retry_IsRefusedWhenSendingAgainCouldNeverWork(string errorCode)
    {
        var (op, _) = await FailedSaleAsync(errorCode);

        var result = await Resolver().RetryAsync(Biz, op.OperationId);

        Assert.False(result.Success);
        Assert.Equal("FAILED", (await _queue.GetOperationAsync(op.OperationId))!.RawStatus); // unchanged
        Assert.False(Resolver().CanRetry((await _queue.GetOperationAsync(op.OperationId))!));
    }

    [Fact]
    public async Task Retry_RefusesOperationsThatAreNotFailed_OrBelongToAnotherBusiness()
    {
        var (op, _) = await FailedSaleAsync();
        var resolver = Resolver();

        Assert.False((await resolver.RetryAsync("OTHER-BIZ", op.OperationId)).Success);
        Assert.False((await resolver.RetryAsync(Biz, "no-such-op")).Success);

        Assert.True((await resolver.RetryAsync(Biz, op.OperationId)).Success);
        Assert.False((await resolver.RetryAsync(Biz, op.OperationId)).Success); // now PENDING, not FAILED
    }

    [Fact]
    public async Task RetryAll_QueuesOnlyTheOperationsThatCanSucceed()
    {
        var (retryable, _) = await FailedSaleAsync();
        var unsupported = await _queue.EnqueueOperationAsync(Biz, Store, Device, "USR-01", "PRODUCT_UPDATE", "{}", "P-1");
        await _queue.MarkFailedAsync(unsupported.OperationId, "UNSUPPORTED_EVENT_TYPE", "no route");

        var count = await Resolver().RetryAllAsync(Biz);

        Assert.Equal(1, count);
        Assert.Equal("PENDING", (await _queue.GetOperationAsync(retryable.OperationId))!.RawStatus);
        Assert.Equal("FAILED", (await _queue.GetOperationAsync(unsupported.OperationId))!.RawStatus);
    }

    [Theory]
    [InlineData("")]
    [InlineData("no")]
    [InlineData("    ")]
    public async Task Dismiss_RequiresARealReason(string reason)
    {
        var (op, _) = await FailedSaleAsync();

        var result = await Resolver().DismissAsync(Biz, op.OperationId, reason, "USR-01");

        Assert.False(result.Success);
        Assert.Equal("FAILED", (await _queue.GetOperationAsync(op.OperationId))!.RawStatus);
    }

    [Fact]
    public async Task Dismiss_ClosesTheSaleKeepsTheReason_AndTheOperationIsNeverSent()
    {
        var (op, sale) = await FailedSaleAsync();

        var result = await Resolver().DismissAsync(Biz, op.OperationId, "Customer paid again at the counter", "USR-01");

        Assert.True(result.Success, result.Message);
        var stored = await _queue.GetOperationAsync(op.OperationId);
        Assert.Equal("DISMISSED", stored!.RawStatus);
        Assert.Equal("Customer paid again at the counter", stored.ErrorMessage);
        var saleState = await SaleStatusAsync(sale.Id);
        Assert.StartsWith("DISMISSED", saleState);
        Assert.Contains("Customer paid again", saleState);

        await new SyncEngineService(_queue, _api, _purchasing, _sales).RunSyncCycleAsync(Biz, Device);
        Assert.Empty(_api.UploadedBatches);

        // Dismissed operations no longer count as failed, and cannot be dismissed again or retried.
        Assert.Equal(0, await _queue.GetFailedCountAsync(Biz));
        Assert.False((await Resolver().DismissAsync(Biz, op.OperationId, "again please", "USR-01")).Success);
        Assert.False((await Resolver().RetryAsync(Biz, op.OperationId)).Success);
    }

    [Fact]
    public async Task Dismiss_RemovesAFailedSupplier_SoItsCodeCanBeUsedAgain_ButKeepsOneThatIsStillReferenced()
    {
        await _db.InitializeAsync();
        var free = new SupplierItem { Id = Guid.NewGuid().ToString(), BusinessId = Biz, SupplierCode = "S-FREE", LegalName = "Free" };
        var used = new SupplierItem { Id = Guid.NewGuid().ToString(), BusinessId = Biz, SupplierCode = "S-USED", LegalName = "Used" };
        var freeOp = await _purchasing.SaveSupplierWithQueuedCreateAsync(free, Store, Device, "USR-01", "{}");
        var usedOp = await _purchasing.SaveSupplierWithQueuedCreateAsync(used, Store, Device, "USR-01", "{}");
        await _queue.MarkFailedAsync(freeOp.OperationId, "DUPLICATE_SUPPLIER_CODE", "exists");
        await _queue.MarkFailedAsync(usedOp.OperationId, "DUPLICATE_SUPPLIER_CODE", "exists");
        await _purchasing.MarkSupplierSyncStateAsync(Biz, free.Id, SupplierSyncState.Failed, "exists");
        await _purchasing.MarkSupplierSyncStateAsync(Biz, used.Id, SupplierSyncState.Failed, "exists");
        await _purchasing.SavePurchaseAsync(new PurchaseOrderItem
        {
            Id = Guid.NewGuid().ToString(), BusinessId = Biz, StoreId = Store, SupplierId = used.Id, SupplierName = "Used",
            OrderNumber = "PO-1", Status = "DRAFT", CreatedBy = "u"
        });

        await Resolver().DismissAsync(Biz, freeOp.OperationId, "wrong supplier entered", "USR-01");
        await Resolver().DismissAsync(Biz, usedOp.OperationId, "wrong supplier entered", "USR-01");

        Assert.Null(await _purchasing.GetSupplierByCodeAsync(Biz, "S-FREE")); // gone: the code is free again
        var kept = await _purchasing.GetSupplierByCodeAsync(Biz, "S-USED");   // an order still refers to it
        Assert.NotNull(kept);
        Assert.Contains("Dismissed", kept!.SyncError);
    }

    [Fact]
    public async Task Dismiss_CancelsAFailedPurchaseOrder()
    {
        await _db.InitializeAsync();
        var po = new PurchaseOrderItem
        {
            Id = Guid.NewGuid().ToString(), BusinessId = Biz, StoreId = Store, SupplierId = "s", SupplierName = "S",
            OrderNumber = "PO-9", CreatedBy = "u", Lines = { new PurchaseOrderLineItem { ProductId = "p", OrderedQuantity = 1, UnitPrice = 1 } }
        };
        var poOp = await _purchasing.SavePurchaseWithQueuedCreateAsync(po, Device, "USR-01");
        await _queue.MarkFailedAsync(poOp.OperationId, "SUPPLIER_INACTIVE", "inactive");
        await _purchasing.MarkPurchaseSyncStateAsync(po.Id, "FAILED");

        await Resolver().DismissAsync(Biz, poOp.OperationId, "supplier was closed down", "USR-01");

        var stored = await _purchasing.GetPurchaseByIdAsync(po.Id);
        Assert.Equal("CANCELLED", stored!.Status);
        Assert.Equal("DISMISSED", stored.SyncStatus);
    }

    // --------------------------------------------------------- import queue

    [Fact]
    public async Task Enqueue_WhileOffline_WaitsForTheConnection_AndCallsTheServerForNothing()
    {
        await _db.InitializeAsync();
        _net.Online = false;
        var imports = Imports();

        var added = await imports.EnqueueAsync(Biz, new[] { Med("g1", "Paracetamol 500mg"), Med("g2", "Cetirizine 10mg") });
        await imports.ProcessAsync(Biz, Store);

        Assert.Equal(2, added);
        Assert.Equal(ImportQueueState.WaitingForConnection, imports.State);
        Assert.Empty(_api.QuickImportCalls);
        Assert.Empty(await _products.GetProductsByBusinessAsync(Biz, Store)); // nothing invented locally
        Assert.Equal(2, (await _jobs.CountsAsync(Biz)).Queued);
    }

    [Fact]
    public async Task Enqueue_IgnoresMedicinesThatAreAlreadyWaiting()
    {
        await _db.InitializeAsync();
        var imports = Imports();
        var batch = new[] { Med("g1", "Paracetamol 500mg"), Med("g2", "Cetirizine 10mg") };

        Assert.Equal(2, await imports.EnqueueAsync(Biz, batch));
        Assert.Equal(0, await imports.EnqueueAsync(Biz, batch)); // "queue all" pressed twice
        Assert.Equal(1, await imports.EnqueueAsync(Biz, new[] { Med("g2", "Cetirizine 10mg"), Med("g3", "Ibuprofen 400mg") }));

        Assert.Equal(3, (await _jobs.ListAsync(Biz)).Count);
    }

    [Fact]
    public async Task Process_Online_ImportsEachMedicineUnderTheServersId_WithNoStock()
    {
        await _db.InitializeAsync();
        var names = new Dictionary<string, string> { ["g1"] = "Paracetamol 500mg", ["g2"] = "Cetirizine 10mg" };
        _api.QuickImportHandler = id => Imported(id, names[id]);
        var imports = Imports();
        await imports.EnqueueAsync(Biz, names.Select(n => Med(n.Key, n.Value)));

        await imports.ProcessAsync(Biz, Store);

        var products = await _products.GetProductsByBusinessAsync(Biz, Store);
        Assert.Equal(new[] { "srv-g1", "srv-g2" }, products.Select(p => p.Id).OrderBy(x => x));
        Assert.All(products, p => Assert.Equal(0.0, p.CurrentStock));
        Assert.Equal(10, products.First().UnitsPerSellingUnit);
        Assert.All(await _jobs.ListAsync(Biz), j => Assert.Equal(ImportJobStatus.Done, j.Status));
        Assert.Equal(ImportQueueState.Idle, imports.State);
    }

    [Fact]
    public async Task Process_SkipsAMedicineAlreadyInTheCatalog_WithoutCallingTheServer()
    {
        await _db.InitializeAsync();
        await _products.UpsertProductAsync(new ProductItem { Id = "p-existing", BusinessId = Biz, StoreId = Store, Code = "X", Name = "Paracetamol 500mg" });
        var imports = Imports();
        await imports.EnqueueAsync(Biz, new[] { Med("g1", "paracetamol 500MG") });

        await imports.ProcessAsync(Biz, Store);

        var job = await JobOf("g1");
        Assert.Equal(ImportJobStatus.Skipped, job.Status);
        Assert.Equal("p-existing", job.ProductId);
        Assert.Empty(_api.QuickImportCalls);
    }

    [Fact]
    public async Task Process_TreatsAServerConflictAsSkipped_AndAPermanentRejectionAsFailedButKeepsGoing()
    {
        await _db.InitializeAsync();
        _api.QuickImportHandler = id => id switch
        {
            "g1" => new QuickImportResult(false, null, "This medicine has already been imported into your catalog.", 409, 1),
            "g2" => new QuickImportResult(false, null, "Global medicine not found on server.", 404, 1),
            _ => Imported(id, "Ibuprofen 400mg")
        };
        var imports = Imports();
        await imports.EnqueueAsync(Biz, new[] { Med("g1", "A"), Med("g2", "B"), Med("g3", "Ibuprofen 400mg") });

        await imports.ProcessAsync(Biz, Store);

        Assert.Equal(ImportJobStatus.Skipped, (await JobOf("g1")).Status);
        var failed = await JobOf("g2");
        Assert.Equal(ImportJobStatus.Failed, failed.Status);
        Assert.Contains("not found", failed.Message);
        Assert.Equal(ImportJobStatus.Done, (await JobOf("g3")).Status); // not blocked by the failure before it
    }

    [Fact]
    public async Task Process_WhenTheServerIsDown_RequeuesAndStops_ThenFailsAfterTheAttemptLimit()
    {
        await _db.InitializeAsync();
        _api.QuickImportHandler = _ => new QuickImportResult(false, null, "Cloud service unreachable", 0, 1);
        var imports = Imports();
        await imports.EnqueueAsync(Biz, new[] { Med("g1", "A"), Med("g2", "B") });

        await imports.ProcessAsync(Biz, Store);

        Assert.Single(_api.QuickImportCalls); // it did not hammer the server for the second medicine
        var first = await JobOf("g1");
        Assert.Equal(ImportJobStatus.Queued, first.Status);
        Assert.Equal(1, first.Attempts);
        Assert.Contains("unreachable", first.Message);
        Assert.Equal(ImportJobStatus.Queued, (await JobOf("g2")).Status);

        for (var i = 1; i < ImportQueueService.MaxAttempts; i++) await imports.ProcessAsync(Biz, Store);

        var final = await JobOf("g1");
        Assert.Equal(ImportJobStatus.Failed, final.Status);
        Assert.Equal(ImportQueueService.MaxAttempts, final.Attempts);
    }

    [Fact]
    public async Task Pause_FinishesTheMedicineInProgress_ThenStops_AndResumeImportsTheRest()
    {
        await _db.InitializeAsync();
        var imports = Imports();
        var statesWhilePausing = new List<ImportQueueState>();
        _api.QuickImportHandler = id =>
        {
            if (id == "g1")
            {
                imports.PauseAsync(Biz).GetAwaiter().GetResult(); // the user presses Pause during the first import
                statesWhilePausing.Add(imports.State);
            }
            return Imported(id, "Med " + id);
        };
        await imports.EnqueueAsync(Biz, new[] { Med("g1", "Med g1"), Med("g2", "Med g2"), Med("g3", "Med g3") });

        await imports.ProcessAsync(Biz, Store);

        Assert.Equal(new[] { ImportQueueState.Pausing }, statesWhilePausing);   // in-flight work is allowed to finish
        Assert.Equal(ImportJobStatus.Done, (await JobOf("g1")).Status);
        Assert.Equal(ImportJobStatus.Queued, (await JobOf("g2")).Status);       // nothing new started
        Assert.Equal(ImportJobStatus.Queued, (await JobOf("g3")).Status);
        Assert.Equal(ImportQueueState.Paused, imports.State);
        Assert.Single(_api.QuickImportCalls);

        // A later trigger while paused still does nothing.
        await imports.ProcessAsync(Biz, Store);
        Assert.Single(_api.QuickImportCalls);

        await imports.ResumeAsync(Biz, Store);

        Assert.All(await _jobs.ListAsync(Biz), j => Assert.Equal(ImportJobStatus.Done, j.Status));
        Assert.Equal(3, _api.QuickImportCalls.Count);
        Assert.Equal(ImportQueueState.Idle, imports.State);
    }

    [Fact]
    public async Task PausedQueue_IsStillPausedAfterARestart_AndStartsOnlyWhenResumed()
    {
        await _db.InitializeAsync();
        _api.QuickImportHandler = id => Imported(id, "Med " + id);
        var before = Imports();
        await before.EnqueueAsync(Biz, new[] { Med("g1", "Med g1") });
        await before.PauseAsync(Biz);

        // New process: a new service over the same database file.
        var db2 = new DatabaseContext(_path);
        await db2.InitializeAsync();
        var after = new ImportQueueService(new ImportQueueRepository(db2), new ProductRepository(db2), _api, _net);

        Assert.Equal(ImportQueueState.Paused, await after.RefreshStateAsync(Biz));
        await after.ProcessAsync(Biz, Store);
        Assert.Empty(_api.QuickImportCalls);
        Assert.Equal(ImportJobStatus.Queued, (await JobOf("g1")).Status);

        await after.ResumeAsync(Biz, Store);
        Assert.Equal(ImportJobStatus.Done, (await JobOf("g1")).Status);
    }

    [Fact]
    public async Task AnImportInterruptedByACrash_IsPutBackAndFinished()
    {
        await _db.InitializeAsync();
        _api.QuickImportHandler = id => Imported(id, "Med " + id);
        var imports = Imports();
        await imports.EnqueueAsync(Biz, new[] { Med("g1", "Med g1") });
        await _jobs.ClaimNextAsync(Biz); // claimed (RUNNING) and then the app died

        await imports.ProcessAsync(Biz, Store);

        Assert.Equal(ImportJobStatus.Done, (await JobOf("g1")).Status);
    }

    [Fact]
    public async Task GoingOfflineMidRun_StopsCleanly_AndKeepsTheRestQueued()
    {
        await _db.InitializeAsync();
        var imports = Imports();
        _api.QuickImportHandler = id =>
        {
            _net.Online = false; // the connection drops after the first request
            return Imported(id, "Med " + id);
        };
        await imports.EnqueueAsync(Biz, new[] { Med("g1", "Med g1"), Med("g2", "Med g2") });

        await imports.ProcessAsync(Biz, Store);

        Assert.Equal(ImportJobStatus.Done, (await JobOf("g1")).Status);
        Assert.Equal(ImportJobStatus.Queued, (await JobOf("g2")).Status);
        Assert.Equal(ImportQueueState.WaitingForConnection, imports.State);

        _net.Online = true;
        _api.QuickImportHandler = id => Imported(id, "Med " + id);
        await imports.ProcessAsync(Biz, Store);
        Assert.Equal(ImportJobStatus.Done, (await JobOf("g2")).Status);
    }

    [Fact]
    public async Task QueueManagement_RemovesWaitingJobs_RetriesFailedOnes_AndClearsFinishedOnes()
    {
        await _db.InitializeAsync();
        _api.QuickImportHandler = id => id == "g1"
            ? new QuickImportResult(false, null, "not found", 404, 1)
            : Imported(id, "Med " + id);
        var imports = Imports();
        await imports.EnqueueAsync(Biz, new[] { Med("g1", "Med g1"), Med("g2", "Med g2") });
        await imports.ProcessAsync(Biz, Store);
        Assert.Equal(new ImportQueueCounts(0, 0, 1, 0, 1), await _jobs.CountsAsync(Biz));

        Assert.Equal(1, await _jobs.ClearFinishedAsync(Biz));   // the imported one disappears from the list
        Assert.Equal(1, await _jobs.RetryFailedAsync(Biz));     // the failed one is queued again
        Assert.Equal(ImportJobStatus.Queued, (await JobOf("g1")).Status);
        Assert.True(await _jobs.RemoveAsync((await JobOf("g1")).Id)); // or taken off the list
        Assert.Empty(await _jobs.ListAsync(Biz));
    }

    // ---------------------------------------------------------- coordinator

    [Fact]
    public async Task Coordinator_DoesNothingOffline_AndRunsSyncAndImportsWhenOnline()
    {
        var sync = new CountingSync();
        var imports = new CountingImports();
        using var coordinator = new SyncCoordinator(sync, imports, new FakeIdentity(), _net);

        _net.Online = false;
        await coordinator.TriggerAsync();
        Assert.Equal(0, sync.Runs);
        Assert.Equal(0, imports.Runs);

        _net.Online = true;
        await coordinator.TriggerAsync();
        Assert.Equal((1, 1), (sync.Runs, imports.Runs));
        Assert.Equal((Biz, Device), (sync.LastBusiness, sync.LastDevice));
        Assert.Equal(Store, imports.LastStore);
    }

    [Fact]
    public async Task Coordinator_StartsTheQueuesAgain_WhenTheConnectionReturns()
    {
        var sync = new CountingSync();
        var imports = new CountingImports();
        using var coordinator = new SyncCoordinator(sync, imports, new FakeIdentity(), _net);
        _net.Online = false;
        coordinator.Start();

        _net.Online = true;
        _net.Raise(ConnectivityState.Online);

        for (var i = 0; i < 100 && (sync.Runs == 0 || imports.Runs == 0); i++) await Task.Delay(20);
        Assert.Equal(1, sync.Runs);
        Assert.Equal(1, imports.Runs);
    }

    // ----------------------------------------------------------------- fakes

    private sealed class FakeConnectivity : ICloudConnectivityService
    {
        public bool Online { get; set; }
        public ConnectivityState CurrentState => Online ? ConnectivityState.Online : ConnectivityState.Offline;
        public bool IsOnline => Online;
        public string StatusDisplay => Online ? "Online" : "Offline";
        public event EventHandler<ConnectivityState>? StateChanged;
        public void Raise(ConnectivityState s) => StateChanged?.Invoke(this, s);
        public Task<bool> CheckConnectivityNowAsync() => Task.FromResult(Online);
        public void StartMonitoring(TimeSpan interval) { }
        public void StopMonitoring() { }
        public void Dispose() { }
    }

    private sealed class FakeIdentity : IIdentitySessionService
    {
        public UserSession? CurrentSession => null;
        public DeviceRegistration? CurrentDevice => null;
        public Task<bool> HasPairedIdentityAsync() => Task.FromResult(true);
        public Task<UserSession?> GetSessionAsync() => Task.FromResult<UserSession?>(new UserSession { BusinessId = Biz, StoreId = Store, UserId = "USR-01" });
        public Task<UserSession?> RefreshSessionAsync() => GetSessionAsync();
        public Task<DeviceRegistration> GetDeviceAsync() => Task.FromResult(new DeviceRegistration { DeviceId = Device });
        public Task<(bool Success, string? Error)> PairWithCloudAsync(string email, string password, string? targetStoreId = null) => throw new NotSupportedException();
        public Task<StartupValidationResult> ValidateStartupSessionAsync(bool isOnline) => throw new NotSupportedException();
        public Task ClearSessionAsync() => Task.CompletedTask;
        public Task LogoutAsync() => Task.CompletedTask;
    }

    private sealed class CountingSync : ISyncEngineService
    {
        public int Runs { get; private set; }
        public string? LastBusiness { get; private set; }
        public string? LastDevice { get; private set; }
        public bool IsSyncing => false;
        public Task<SyncStatus> GetStatusAsync(string businessId) => Task.FromResult(new SyncStatus(0, 0, null, false));
        public Task<SyncStatus> RunSyncCycleAsync(string businessId, string deviceId)
        {
            Runs++;
            (LastBusiness, LastDevice) = (businessId, deviceId);
            return GetStatusAsync(businessId);
        }
    }

    private sealed class CountingImports : IImportQueueService
    {
        public int Runs { get; private set; }
        public string? LastStore { get; private set; }
        public ImportQueueState State => ImportQueueState.Idle;
        public event EventHandler? Changed { add { } remove { } }
        public Task<int> EnqueueAsync(string businessId, IEnumerable<GlobalMedicineItem> medicines) => Task.FromResult(0);
        public Task PauseAsync(string businessId) => Task.CompletedTask;
        public Task ResumeAsync(string businessId, string? storeId) => Task.CompletedTask;
        public Task ProcessAsync(string businessId, string? storeId) { Runs++; LastStore = storeId; return Task.CompletedTask; }
        public Task<ImportQueueState> RefreshStateAsync(string businessId) => Task.FromResult(ImportQueueState.Idle);
    }
}
