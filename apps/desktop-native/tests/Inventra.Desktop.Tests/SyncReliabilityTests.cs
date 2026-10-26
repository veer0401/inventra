using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Purchasing;
using Inventra.Desktop.Core.Domain.Sales;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Sync;
using Microsoft.Data.Sqlite;
using Xunit;

namespace Inventra.Desktop.Tests;

public class SyncReliabilityTests : IDisposable
{
    private const string Biz = "BIZ-01";
    private const string OtherBiz = "BIZ-02";
    private const string Device = "8d9c1d2e-5b6a-4c3f-9a10-2f4b7c8d9e01";

    private readonly string _path = Path.Combine(Path.GetTempPath(), $"inventra_reliability_{Guid.NewGuid()}.db");
    private readonly DatabaseContext _db;
    private readonly PurchasingRepository _purchasing;
    private readonly OfflineQueueRepository _queue;
    private readonly SalesRepository _sales;
    private readonly MockInventraApiClient _api = new();

    public SyncReliabilityTests()
    {
        _db = new DatabaseContext(_path);
        _purchasing = new PurchasingRepository(_db);
        _queue = new OfflineQueueRepository(_db);
        _sales = new SalesRepository(_db);
    }

    public void Dispose()
    {
        SqliteConnection.ClearAllPools();
        foreach (var f in new[] { _path, _path + "-wal", _path + "-shm" })
        {
            try { if (File.Exists(f)) File.Delete(f); } catch { /* temp file, best effort */ }
        }
    }

    private SyncEngineService Engine() => new(_queue, _api, _purchasing, _sales);

    // ------------------------------------------------------------- helpers

    private static SyncOperationResultApiDto Res(string eventId, string status, string? serverId = null,
        string? code = null, string? message = null, bool retryable = false) =>
        new(eventId, status, serverId, code, message, retryable);

    private static SyncUploadApiResponse Reply(params SyncOperationResultApiDto[] results) =>
        new(results.Length, results.ToList());

    private async Task<OfflineOperation> QueueSupplierAsync(string code, string name = "Acme")
    {
        var supplier = new SupplierItem { Id = Guid.NewGuid().ToString(), BusinessId = Biz, SupplierCode = code, LegalName = name, PaymentTermsDays = 30 };
        var payload = JsonSerializer.Serialize(new CreateSupplierApiRequest(
            code, name, null, "DISTRIBUTOR", null, null, null, null, null, null, null, null, null, null, 30, null));
        return await _purchasing.SaveSupplierWithQueuedCreateAsync(supplier, "STORE-01", Device, "USR-01", payload);
    }

    private async Task<(string Status, int Retries, string? Code, string? Message, string EventType, string Key, string? ServerId)> OpAsync(string operationId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"SELECT status, retry_count, error_code, error_message, event_type, idempotency_key, server_entity_id
                            FROM offline_operations WHERE operation_id = @id;";
        cmd.Parameters.AddWithValue("@id", operationId);
        await using var r = await cmd.ExecuteReaderAsync();
        Assert.True(await r.ReadAsync(), $"operation {operationId} not found");
        return (r.GetString(0), r.GetInt32(1), r.IsDBNull(2) ? null : r.GetString(2), r.IsDBNull(3) ? null : r.GetString(3),
            r.GetString(4), r.GetString(5), r.IsDBNull(6) ? null : r.GetString(6));
    }

    private async Task ExecAsync(string sql, params (string Name, object Value)[] ps)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<object?> ScalarAsync(string sql, params (string Name, object Value)[] ps)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        foreach (var (n, v) in ps) cmd.Parameters.AddWithValue(n, v);
        return await cmd.ExecuteScalarAsync();
    }

    private async Task SeedStockAsync(double stock)
    {
        await ExecAsync(@"INSERT INTO cache_products (id, business_id, name, base_unit, selling_unit, units_per_selling_unit,
                              tax_rate, selling_price, mrp, current_stock, updated_at)
                          VALUES (@p, @b, 'Amoxicillin', 'CAPSULE', 'STRIP', 10, 0, 55, 60, @s, 1);",
            ("@p", SyncContractTests.ProductId), ("@b", Biz), ("@s", stock));
        await ExecAsync(@"INSERT INTO cache_batches (id, business_id, store_id, product_id, batch_number, expiry_date,
                              available_quantity, selling_price, mrp)
                          VALUES (@id, @b, 'STORE-01', @p, 'AMOX-B1', '2027-12-31', @s, 55, 60);",
            ("@id", SyncContractTests.BatchId), ("@b", Biz), ("@p", SyncContractTests.ProductId), ("@s", stock));
    }

    private async Task<double> ProductStockAsync() =>
        Convert.ToDouble(await ScalarAsync("SELECT current_stock FROM cache_products WHERE id = @p;", ("@p", SyncContractTests.ProductId)));

    private async Task<double> BatchStockAsync() =>
        Convert.ToDouble(await ScalarAsync("SELECT available_quantity FROM cache_batches WHERE id = @b;", ("@b", SyncContractTests.BatchId)));

    private static SaleRecord NewSale(double quantity = 2.0)
    {
        var sale = SyncContractTests.SampleSale();
        sale.Id = Guid.NewGuid().ToString();
        sale.BusinessId = Biz;
        sale.DeviceId = Device;
        sale.UserId = "USR-01";
        sale.Items[0].Id = Guid.NewGuid().ToString();
        sale.Items[0].SaleId = sale.Id;
        sale.Items[0].Quantity = quantity;
        return sale;
    }

    private async Task<(string Status, string? ServerId, string? Error)> SaleSyncAsync(string saleId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT sync_status, server_sale_id, sync_error FROM local_sales WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", saleId);
        await using var r = await cmd.ExecuteReaderAsync();
        Assert.True(await r.ReadAsync());
        return (r.GetString(0), r.IsDBNull(1) ? null : r.GetString(1), r.IsDBNull(2) ? null : r.GetString(2));
    }

    private static ApiResult<SyncUploadApiResponse> RealUploadReply(string fixtureName, string eventId)
    {
        var text = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", fixtureName));
        var wrapper = JsonSerializer.Deserialize<ApiResponseWrapper<SyncUploadApiResponse>>(text)!;
        var data = wrapper.Data! with { Results = wrapper.Data!.Results.Select(r => r with { EventId = eventId }).ToList() };
        return ApiResult<SyncUploadApiResponse>.Ok(data, 200);
    }

    private static SyncChangeApiDto SupplierChange(long seq, string id, string code, string name) =>
        new(seq, "SUPPLIER", id, "UPSERT", 1,
            JsonSerializer.SerializeToElement(new { id, supplierCode = code, legalName = name, paymentTermsDays = 30, status = "ACTIVE" }));

    private static SyncChangeApiDto OtherChange(long seq, string entityType) =>
        new(seq, entityType, Guid.NewGuid().ToString(), "UPSERT", 1, JsonSerializer.SerializeToElement(new { }));

    private static ApiResult<SyncDownloadApiResponse> Page(long current, long next, bool hasMore, params SyncChangeApiDto[] changes) =>
        ApiResult<SyncDownloadApiResponse>.Ok(new SyncDownloadApiResponse(current, next, hasMore, changes.ToList()), 200);

    private static string CursorKey(string business) => $"download_cursor:{business}:{Device}";

    // ------------------------------------------------- atomic sale + outbox

    [Fact]
    public async Task CompleteSale_WritesSaleStockAndSyncOperationInOneTransaction()
    {
        await _db.InitializeAsync();
        await SeedStockAsync(10);
        var sale = NewSale(quantity: 2);

        await _sales.CompleteSaleWithOutboxAsync(sale);

        Assert.Equal("PENDING", (await SaleSyncAsync(sale.Id)).Status);
        Assert.Equal(8, await ProductStockAsync());
        Assert.Equal(8, await BatchStockAsync());

        var op = Assert.Single(await _queue.GetPendingOperationsAsync(Biz));
        Assert.Equal("SALE_CREATED", op.EventType);
        Assert.Equal(SaleSyncPayload.IdempotencyKey(sale.Id), op.IdempotencyKey);
        Assert.Equal(CanonicalJson.ComputeChecksum(op.PayloadJson), op.PayloadChecksum);
        using var doc = JsonDocument.Parse(op.PayloadJson);
        Assert.Equal(SyncContractTests.BatchId, doc.RootElement.GetProperty("lines")[0].GetProperty("batchId").GetString());
    }

    [Fact]
    public async Task CompleteSale_WhenTheWriteFails_RollsBackStockSaleAndOperationTogether()
    {
        await _db.InitializeAsync();
        await SeedStockAsync(10);
        var sale = NewSale(quantity: 2);
        await _sales.CompleteSaleWithOutboxAsync(sale);

        // Same sale id again: the header insert violates the primary key AFTER nothing else may have changed.
        var duplicate = NewSale(quantity: 2);
        duplicate.Id = sale.Id;
        await Assert.ThrowsAnyAsync<Exception>(() => _sales.CompleteSaleWithOutboxAsync(duplicate));

        Assert.Equal(8, await ProductStockAsync()); // deducted once, not twice
        Assert.Equal(8, await BatchStockAsync());
        Assert.Equal(1, await _queue.GetPendingCountAsync(Biz));
        Assert.Equal(1L, await ScalarAsync("SELECT COUNT(*) FROM local_sales;"));
    }

    [Fact]
    public async Task CompletedSale_SurvivesRestartWithItsPendingOperation()
    {
        await _db.InitializeAsync();
        await SeedStockAsync(10);
        var sale = NewSale();
        await _sales.CompleteSaleWithOutboxAsync(sale);

        var db2 = new DatabaseContext(_path);
        await db2.InitializeAsync();

        Assert.Equal(1, await new OfflineQueueRepository(db2).GetPendingCountAsync(Biz));
        Assert.NotNull(await new SalesRepository(db2).GetSaleByIdAsync(sale.Id));
    }

    // ------------------------------------------------------- goods receipts

    [Fact]
    public async Task GoodsReceipt_QueuedOperationUsesTheReceiptId_AndItsPayloadMatchesTheBackendFixture()
    {
        await _db.InitializeAsync();
        await ExecAsync(@"INSERT INTO cache_products (id, business_id, name, base_unit, selling_unit, units_per_selling_unit,
                              tax_rate, selling_price, mrp, current_stock, updated_at)
                          VALUES (@p, @b, 'Amoxicillin', 'CAPSULE', 'STRIP', 10, 0, 55, 60, 0, 1);",
            ("@p", SyncContractTests.ProductId), ("@b", Biz));

        var grn = new GoodsReceiptItem
        {
            Id = "77777777-7777-7777-7777-777777777777",
            BusinessId = Biz,
            StoreId = SyncContractTests.StoreId,
            SupplierId = SyncContractTests.SupplierId,
            SupplierName = "Acme Distributors",
            ReceiptNumber = "GRN-20261026-0001",
            VendorDeliveryNote = "DN-778",
            ReceivedDate = "2026-10-26",
            Notes = "Cartons intact",
            TotalAmount = 180m,
            Lines =
            {
                new GoodsReceiptLineItem
                {
                    ProductId = SyncContractTests.ProductId, ProductName = "Amoxicillin", ReceivedQuantity = 6m,
                    BatchNumber = "GRN-B1", ManufacturingDate = "2026-05", ExpiryDate = "2028-04",
                    UnitCost = 30m, Mrp = 60m, SellingPrice = 55m, TaxRate = 0m
                }
            }
        };

        await _purchasing.PostGoodsReceiptTransactionAsync(grn, "USR-01", Device);

        var op = Assert.Single(await _queue.GetPendingOperationsAsync(Biz));
        Assert.Equal("GOODS_RECEIPT_POSTED", op.EventType);
        Assert.Equal(grn.Id, op.OperationId); // same id as the receipt: the REST post and this operation dedupe on the server
        Assert.Equal($"GRN-{grn.Id}", op.IdempotencyKey);
        Assert.Equal(CanonicalJson.ComputeChecksum(op.PayloadJson), op.PayloadChecksum);

        using var doc = JsonDocument.Parse(op.PayloadJson);
        var line = doc.RootElement.GetProperty("lines")[0];
        Assert.Equal("2026-05-01", line.GetProperty("manufacturingDate").GetString()); // YYYY-MM widened to a full date
        Assert.Equal("2028-04-01", line.GetProperty("expiryDate").GetString());

        SyncContractTests.AssertMatchesFixture("grn-posted-payload.json", op.PayloadJson);
    }

    [Fact]
    public async Task GoodsReceiptResults_UpdateTheLocalReceipt_AcceptedAndRejected()
    {
        await _db.InitializeAsync();
        await ExecAsync(@"INSERT INTO cache_products (id, business_id, name, base_unit, selling_unit, units_per_selling_unit,
                              tax_rate, selling_price, mrp, current_stock, updated_at)
                          VALUES (@p, @b, 'Amoxicillin', 'CAPSULE', 'STRIP', 10, 0, 55, 60, 0, 1);",
            ("@p", SyncContractTests.ProductId), ("@b", Biz));

        GoodsReceiptItem Receipt(string batchNumber) => new()
        {
            BusinessId = Biz, StoreId = SyncContractTests.StoreId, SupplierId = SyncContractTests.SupplierId,
            SupplierName = "Acme", ReceiptNumber = "GRN-" + batchNumber, ReceivedDate = "2026-10-26", TotalAmount = 180m,
            Lines =
            {
                new GoodsReceiptLineItem
                {
                    ProductId = SyncContractTests.ProductId, ProductName = "Amoxicillin", ReceivedQuantity = 6m,
                    BatchNumber = batchNumber, ExpiryDate = "2028-04", UnitCost = 30m, Mrp = 60m, SellingPrice = 55m, TaxRate = 0m
                }
            }
        };

        var accepted = Receipt("OK-1");
        var refused = Receipt("BAD-1");
        await _purchasing.PostGoodsReceiptTransactionAsync(accepted, "USR-01", Device);
        await _purchasing.PostGoodsReceiptTransactionAsync(refused, "USR-01", Device);

        _api.UploadResultHandler = (_, ops) =>
        {
            var okOp = ops.Single(o => o.EventId == accepted.Id);
            var badOp = ops.Single(o => o.EventId == refused.Id);
            var real = RealUploadReply("server-upload-response-grn-applied.json", okOp.EventId).Data!;
            return ApiResult<SyncUploadApiResponse>.Ok(new SyncUploadApiResponse(2, new List<SyncOperationResultApiDto>
            {
                real.Results.Single(),
                Res(badOp.EventId, "REJECTED", null, "INVALID_PO_STATUS_FOR_RECEIPT", "Cannot receive goods against purchase order in status CANCELLED")
            }), 200);
        };

        var status = await Engine().RunSyncCycleAsync(Biz, Device);

        Assert.Equal("SYNCED", await ScalarAsync("SELECT sync_status FROM local_goods_receipts WHERE id = @i;", ("@i", accepted.Id)));
        Assert.Equal("FAILED", await ScalarAsync("SELECT sync_status FROM local_goods_receipts WHERE id = @i;", ("@i", refused.Id)));
        Assert.Equal("SYNCED", (await OpAsync(accepted.Id)).Status);
        var failed = await OpAsync(refused.Id);
        Assert.Equal("FAILED", failed.Status);
        Assert.Equal("INVALID_PO_STATUS_FOR_RECEIPT", failed.Code);
        Assert.Equal(0, status.PendingCount);
    }

    // ------------------------------------------------------- sale sync results

    [Fact]
    public async Task AppliedSale_IsMarkedSyncedWithTheServerSaleId_UsingARealServerResponse()
    {
        await _db.InitializeAsync();
        await SeedStockAsync(10);
        var sale = NewSale();
        await _sales.CompleteSaleWithOutboxAsync(sale);
        var queued = Assert.Single(await _queue.GetPendingOperationsAsync(Biz));
        _api.UploadResultHandler = (_, _) => RealUploadReply("server-upload-response-applied.json", queued.OperationId);
        var serverSaleId = RealUploadReply("server-upload-response-applied.json", queued.OperationId).Data!.Results.Single().ServerEntityId;

        var status = await Engine().RunSyncCycleAsync(Biz, Device);

        var synced = await SaleSyncAsync(sale.Id);
        Assert.Equal("SYNCED", synced.Status);
        Assert.False(string.IsNullOrEmpty(serverSaleId));
        Assert.Equal(serverSaleId, synced.ServerId); // the id the real server returned
        Assert.Equal("SYNCED", (await OpAsync(queued.OperationId)).Status);
        Assert.Equal(0, status.PendingCount);
    }

    [Fact]
    public async Task RejectedSale_IsMarkedFailedWithTheServersReason_UsingARealServerResponse()
    {
        await _db.InitializeAsync();
        await SeedStockAsync(10);
        var sale = NewSale();
        await _sales.CompleteSaleWithOutboxAsync(sale);
        var queued = Assert.Single(await _queue.GetPendingOperationsAsync(Biz));
        _api.UploadResultHandler = (_, _) => RealUploadReply("server-upload-response-rejected.json", queued.OperationId);

        var status = await Engine().RunSyncCycleAsync(Biz, Device);

        var failed = await SaleSyncAsync(sale.Id);
        Assert.Equal("FAILED", failed.Status);
        Assert.Contains("PRICE_SNAPSHOT_INVALID", failed.Error);
        Assert.Contains("does not match authorized price snapshot", failed.Error);
        var op = await OpAsync(queued.OperationId);
        Assert.Equal("FAILED", op.Status);
        Assert.Equal("PRICE_SNAPSHOT_INVALID", op.Code);
        Assert.Equal(1, status.FailedCount);
    }

    [Fact]
    public async Task LegacySaleCompletedOperations_AreRebuiltFromTheLocalSale_AndUploaded()
    {
        await _db.InitializeAsync();
        await SeedStockAsync(10);

        // Exactly what earlier builds did: save the sale, then queue a summary-only SALE_COMPLETED event.
        var sale = NewSale();
        await _sales.CreateSaleAsync(sale);
        var legacy = await _queue.EnqueueOperationAsync(Biz, "STORE-01", Device, "USR-01", "SALE_COMPLETED",
            JsonSerializer.Serialize(new { saleId = sale.Id, invoiceNumber = sale.InvoiceNumber, totalAmount = sale.TotalAmount }),
            Guid.NewGuid().ToString());
        // ...and a second sale whose operation a previous run of the new engine already failed as unsupported.
        var sale2 = NewSale();
        await _sales.CreateSaleAsync(sale2);
        var alreadyFailed = await _queue.EnqueueOperationAsync(Biz, "STORE-01", Device, "USR-01", "SALE_COMPLETED",
            JsonSerializer.Serialize(new { saleId = sale2.Id }), Guid.NewGuid().ToString());
        await _queue.MarkFailedAsync(alreadyFailed.OperationId, "UNSUPPORTED_EVENT_TYPE", "was unsupported");
        var orphan = await _queue.EnqueueOperationAsync(Biz, "STORE-01", Device, "USR-01", "SALE_COMPLETED",
            JsonSerializer.Serialize(new { saleId = "no-such-sale" }), Guid.NewGuid().ToString());

        _api.UploadHandler = (_, ops) => Reply(ops.Select(o => Res(o.EventId, "APPLIED", "srv-" + o.EventId)).ToArray());
        await Engine().RunSyncCycleAsync(Biz, Device);

        var rebuilt = await OpAsync(legacy.OperationId);
        Assert.Equal("SALE_CREATED", rebuilt.EventType);
        Assert.Equal(SaleSyncPayload.IdempotencyKey(sale.Id), rebuilt.Key);
        Assert.Equal("SYNCED", rebuilt.Status);

        var uploaded = _api.UploadedBatches.Single().Single(o => o.EventId == legacy.OperationId);
        Assert.Equal("SALE_CREATED", uploaded.EventType);
        Assert.Equal(SyncContractTests.ProductId, uploaded.Payload.GetProperty("lines")[0].GetProperty("productId").GetString());
        Assert.Equal(110.00m, uploaded.Payload.GetProperty("payments")[0].GetProperty("amount").GetDecimal());
        Assert.Equal(CanonicalJson.ComputeChecksum(uploaded.Payload.GetRawText()), uploaded.PayloadChecksum);
        Assert.Equal("SYNCED", (await SaleSyncAsync(sale.Id)).Status);

        // The previously failed row is rebuilt too; the orphan (no local sale) can never be rebuilt.
        var rebuiltFailed = await OpAsync(alreadyFailed.OperationId);
        Assert.Equal("SALE_CREATED", rebuiltFailed.EventType);
        Assert.Equal(SaleSyncPayload.IdempotencyKey(sale2.Id), rebuiltFailed.Key);
        var orphaned = await OpAsync(orphan.OperationId);
        Assert.Equal("FAILED", orphaned.Status);
        Assert.Equal("LOCAL_SALE_MISSING", orphaned.Code);
    }

    // ------------------------------------------------ retries and classification

    [Fact]
    public async Task RetryableRejection_StaysPending_ThenFailsVisiblyAfterTheRetryLimit()
    {
        await _db.InitializeAsync();
        var op = await QueueSupplierAsync("SUP-RETRY");
        _api.UploadHandler = (_, ops) => Reply(ops.Select(o => Res(o.EventId, "REJECTED", null, "PROCESSING_ERROR", "database busy", retryable: true)).ToArray());
        var engine = Engine();

        await engine.RunSyncCycleAsync(Biz, Device);
        var afterFirst = await OpAsync(op.OperationId);
        Assert.Equal("PENDING", afterFirst.Status);
        Assert.Equal(1, afterFirst.Retries);
        Assert.Equal("PROCESSING_ERROR", afterFirst.Code);

        for (var i = 1; i < SyncEngineService.MaxRetries; i++) await engine.RunSyncCycleAsync(Biz, Device);

        var final = await OpAsync(op.OperationId);
        Assert.Equal("FAILED", final.Status);
        Assert.Equal("RETRY_LIMIT_EXCEEDED", final.Code);
        Assert.Contains("database busy", final.Message);
        Assert.Equal(SyncEngineService.MaxRetries, _api.UploadedBatches.Count);
        Assert.Equal(SupplierSyncState.Failed, (await _purchasing.GetSuppliersAsync(Biz)).Single().SyncState);
    }

    [Fact]
    public async Task TransientBatchFailure_LeavesEverythingPending_AndFailsNothing()
    {
        await _db.InitializeAsync();
        await QueueSupplierAsync("SUP-T1");
        await QueueSupplierAsync("SUP-T2");
        _api.UploadResultHandler = (_, _) => ApiResult<SyncUploadApiResponse>.Transient("timeout");

        var status = await Engine().RunSyncCycleAsync(Biz, Device);

        Assert.Equal(2, status.PendingCount);
        Assert.Equal(0, status.FailedCount);
        Assert.Single(_api.UploadedBatches); // no isolation attempts for a transient fault
    }

    [Fact]
    public async Task OneInvalidOperation_DoesNotBlockTheValidOnesBehindIt()
    {
        await _db.InitializeAsync();
        var first = await QueueSupplierAsync("SUP-OK-1");
        var poison = await QueueSupplierAsync("SUP-BAD", "BAD");
        var last = await QueueSupplierAsync("SUP-OK-2");

        _api.UploadResultHandler = (_, ops) =>
        {
            // The server refuses the whole request when any one operation is invalid, and says nothing more.
            var hasPoison = ops.Any(o => o.Payload.GetProperty("legalName").GetString() == "BAD");
            return hasPoison
                ? ApiResult<SyncUploadApiResponse>.Rejected("Failed to read request", 400)
                : ApiResult<SyncUploadApiResponse>.Ok(Reply(ops.Select(o => Res(o.EventId, "APPLIED", "srv-" + o.EventId)).ToArray()), 200);
        };

        var status = await Engine().RunSyncCycleAsync(Biz, Device);

        Assert.Equal("SYNCED", (await OpAsync(first.OperationId)).Status);
        Assert.Equal("SYNCED", (await OpAsync(last.OperationId)).Status);
        var failed = await OpAsync(poison.OperationId);
        Assert.Equal("FAILED", failed.Status);
        Assert.Equal("HTTP_400", failed.Code);
        Assert.Contains("Failed to read request", failed.Message);
        Assert.Equal(0, status.PendingCount);
        Assert.Equal(1, status.FailedCount);
        Assert.Equal(4, _api.UploadedBatches.Count); // the full batch, then each operation on its own
    }

    [Theory]
    [InlineData(403, null)]
    [InlineData(401, null)]
    [InlineData(422, "DEVICE_REVOKED")]
    [InlineData(404, "DEVICE_NOT_FOUND")]
    public async Task RequestLevelAuthorizationFailures_KeepOperationsPending_AndStopTheCycle(int httpStatus, string? errorCode)
    {
        await _db.InitializeAsync();
        await QueueSupplierAsync("SUP-A1");
        await QueueSupplierAsync("SUP-A2");
        _api.UploadResultHandler = (_, _) => ApiResult<SyncUploadApiResponse>.Rejected("not allowed", httpStatus, errorCode);

        var status = await Engine().RunSyncCycleAsync(Biz, Device);

        Assert.Equal(2, status.PendingCount);
        Assert.Equal(0, status.FailedCount);
        Assert.Single(_api.UploadedBatches); // no one-by-one isolation: the fault is not any operation's
        Assert.Empty(_api.DownloadCursors);  // and nothing is pulled while the device is refused
    }

    [Fact]
    public async Task MalformedQueuedPayload_IsFailedWithoutBlockingValidOperations()
    {
        await _db.InitializeAsync();
        var broken = await QueueSupplierAsync("SUP-BROKEN");
        var healthy = await QueueSupplierAsync("SUP-FINE");
        await ExecAsync("UPDATE offline_operations SET payload_json = 'not json {' WHERE operation_id = @id;", ("@id", broken.OperationId));
        _api.UploadHandler = (_, ops) => Reply(ops.Select(o => Res(o.EventId, "APPLIED", "srv-" + o.EventId)).ToArray());

        await Engine().RunSyncCycleAsync(Biz, Device);

        var failed = await OpAsync(broken.OperationId);
        Assert.Equal("FAILED", failed.Status);
        Assert.Equal("MALFORMED_PAYLOAD", failed.Code);
        Assert.Equal("SYNCED", (await OpAsync(healthy.OperationId)).Status);
        Assert.Equal(healthy.OperationId, _api.UploadedBatches.Single().Single().EventId);
    }

    [Fact]
    public async Task UnrecognisedOrMissingResults_NeverMarkAnOperationSynchronised()
    {
        await _db.InitializeAsync();
        var odd = await QueueSupplierAsync("SUP-ODD");
        var silent = await QueueSupplierAsync("SUP-SILENT");
        // The server answers "MAYBE" for one and says nothing at all about the other.
        _api.UploadHandler = (_, ops) => Reply(Res(odd.OperationId, "MAYBE", "srv-x"));

        var status = await Engine().RunSyncCycleAsync(Biz, Device);

        Assert.Equal("PENDING", (await OpAsync(odd.OperationId)).Status);
        Assert.Equal("PENDING", (await OpAsync(silent.OperationId)).Status);
        Assert.Equal(2, status.PendingCount);
        Assert.Equal(SupplierSyncState.Pending, (await _purchasing.GetSuppliersAsync(Biz)).First().SyncState);
    }

    [Fact]
    public async Task ConflictResult_IsFailedWithTheServersReason()
    {
        await _db.InitializeAsync();
        var op = await QueueSupplierAsync("SUP-CONFLICT");
        _api.UploadHandler = (_, ops) => Reply(Res(op.OperationId, "CONFLICT", null, "VERSION_CONFLICT", "changed on the server"));

        await Engine().RunSyncCycleAsync(Biz, Device);

        var failed = await OpAsync(op.OperationId);
        Assert.Equal("FAILED", failed.Status);
        Assert.Equal("VERSION_CONFLICT", failed.Code);
    }

    [Fact]
    public async Task ResendingAfterALostResponse_IsDuplicateAndLeavesOneSyncedSupplier()
    {
        await _db.InitializeAsync();
        var op = await QueueSupplierAsync("SUP-LOST");
        _api.UploadHandler = (_, ops) => Reply(Res(op.OperationId, "APPLIED", "srv-1"));
        var engine = Engine();
        await engine.RunSyncCycleAsync(Biz, Device);

        // The response was lost on the way back, so the app never recorded success: put the operation back.
        await ExecAsync("UPDATE offline_operations SET status = 'PENDING' WHERE operation_id = @id;", ("@id", op.OperationId));
        _api.UploadHandler = (_, ops) => Reply(Res(op.OperationId, "DUPLICATE", "srv-1"));
        await engine.RunSyncCycleAsync(Biz, Device);

        var supplier = Assert.Single(await _purchasing.GetSuppliersAsync(Biz));
        Assert.Equal("srv-1", supplier.Id);
        Assert.Equal(SupplierSyncState.Synced, supplier.SyncState);
        Assert.Equal("SYNCED", (await OpAsync(op.OperationId)).Status);
    }

    [Fact]
    public async Task OnlyOneSyncCycleRunsAtATime()
    {
        await _db.InitializeAsync();
        await QueueSupplierAsync("SUP-CONCURRENT");
        using var entered = new ManualResetEventSlim();
        using var release = new ManualResetEventSlim();
        _api.UploadHandler = (_, ops) =>
        {
            entered.Set();
            release.Wait(TimeSpan.FromSeconds(10));
            return Reply(ops.Select(o => Res(o.EventId, "APPLIED", "srv-" + o.EventId)).ToArray());
        };
        var engine = Engine();

        var first = Task.Run(() => engine.RunSyncCycleAsync(Biz, Device));
        Assert.True(entered.Wait(TimeSpan.FromSeconds(10)));
        var second = await engine.RunSyncCycleAsync(Biz, Device); // returns at once instead of double-sending
        Assert.True(second.IsSyncing);
        release.Set();
        var finished = await first;

        Assert.Single(_api.UploadedBatches);
        Assert.False(finished.IsSyncing);
        Assert.Equal(0, finished.PendingCount);
    }

    [Fact]
    public async Task UnpairedWorkstation_DoesNotUploadAnything()
    {
        await _db.InitializeAsync();
        await QueueSupplierAsync("SUP-UNPAIRED");

        var status = await Engine().RunSyncCycleAsync(Biz, "POS-LOCAL-123");

        Assert.Empty(_api.UploadedBatches);
        Assert.Equal(1, status.PendingCount);
    }

    // -------------------------------------------------------------- download

    [Fact]
    public async Task Download_AppliesSupplierPages_SkipsOtherEntities_AndPersistsTheCursorAcrossRestart()
    {
        await _db.InitializeAsync();
        _api.DownloadHandler = cursor => cursor switch
        {
            0 => Page(0, 4, true, SupplierChange(3, "srv-a", "SUP-A", "Alpha Pharma"), OtherChange(4, "PRODUCT")),
            4 => Page(4, 7, false, SupplierChange(7, "srv-b", "SUP-B", "Beta Pharma")),
            _ => Page(cursor, cursor, false)
        };

        await Engine().RunSyncCycleAsync(Biz, Device);

        var suppliers = await _purchasing.GetSuppliersAsync(Biz);
        Assert.Equal(new[] { "Alpha Pharma", "Beta Pharma" }, suppliers.Select(s => s.LegalName).OrderBy(n => n));
        Assert.All(suppliers, s => Assert.Equal(SupplierSyncState.Synced, s.SyncState));
        Assert.Equal(new long[] { 0, 4 }, _api.DownloadCursors);
        Assert.Equal(7, await _purchasing.GetDownloadCursorAsync(CursorKey(Biz)));

        // "Restart": a new context over the same file resumes from the stored checkpoint.
        var db2 = new DatabaseContext(_path);
        await db2.InitializeAsync();
        var api2 = new MockInventraApiClient { DownloadHandler = c => Page(c, c, false) };
        await new SyncEngineService(new OfflineQueueRepository(db2), api2, new PurchasingRepository(db2), new SalesRepository(db2))
            .RunSyncCycleAsync(Biz, Device);
        Assert.Equal(new long[] { 7 }, api2.DownloadCursors);
    }

    [Fact]
    public async Task InterruptedDownload_KeepsWhatWasAppliedAndResumesFromTheCheckpoint()
    {
        await _db.InitializeAsync();
        _api.DownloadHandler = cursor => cursor == 0
            ? Page(0, 4, true, SupplierChange(4, "srv-a", "SUP-A", "Alpha Pharma"))
            : ApiResult<SyncDownloadApiResponse>.Transient("connection dropped"); // dies on page two
        var engine = Engine();

        await engine.RunSyncCycleAsync(Biz, Device);

        Assert.Equal("Alpha Pharma", Assert.Single(await _purchasing.GetSuppliersAsync(Biz)).LegalName);
        Assert.Equal(4, await _purchasing.GetDownloadCursorAsync(CursorKey(Biz)));

        _api.DownloadCursors.Clear();
        _api.DownloadHandler = cursor => cursor == 4
            ? Page(4, 9, false, SupplierChange(9, "srv-b", "SUP-B", "Beta Pharma"))
            : Page(cursor, cursor, false);
        await engine.RunSyncCycleAsync(Biz, Device);

        Assert.Equal(new long[] { 4 }, _api.DownloadCursors); // page one is not downloaded again
        Assert.Equal(2, (await _purchasing.GetSuppliersAsync(Biz)).Count);
        Assert.Equal(9, await _purchasing.GetDownloadCursorAsync(CursorKey(Biz)));
    }

    [Fact]
    public async Task Download_NeverOverwritesALocalSupplierThatHasNotReachedTheServer_ButStillAdvances()
    {
        await _db.InitializeAsync();
        await QueueSupplierAsync("SUP-DUP", "My Pending Supplier");
        _api.PingResult = true;
        _api.UploadHandler = (_, _) => null; // server unreachable for uploads: the supplier stays pending
        _api.DownloadHandler = cursor => cursor == 0
            ? Page(0, 5, false, SupplierChange(5, "srv-other", "sup-dup", "Someone Else's Supplier"))
            : Page(cursor, cursor, false);

        await Engine().RunSyncCycleAsync(Biz, Device);

        var supplier = Assert.Single(await _purchasing.GetSuppliersAsync(Biz));
        Assert.Equal("My Pending Supplier", supplier.LegalName);
        Assert.Equal(SupplierSyncState.Pending, supplier.SyncState);
        Assert.Equal(5, await _purchasing.GetDownloadCursorAsync(CursorKey(Biz)));
    }

    [Fact]
    public async Task Download_SkipsAMalformedEntryWithoutStallingTheCheckpoint()
    {
        await _db.InitializeAsync();
        var malformed = new SyncChangeApiDto(2, "SUPPLIER", "srv-bad", "UPSERT", 1,
            JsonSerializer.SerializeToElement(new { id = 12345, supplierCode = "X", legalName = "Bad" })); // id is a number
        _api.DownloadHandler = cursor => cursor == 0
            ? Page(0, 3, false, malformed, SupplierChange(3, "srv-good", "SUP-G", "Good Pharma"))
            : Page(cursor, cursor, false);

        await Engine().RunSyncCycleAsync(Biz, Device);

        Assert.Equal("Good Pharma", Assert.Single(await _purchasing.GetSuppliersAsync(Biz)).LegalName);
        Assert.Equal(3, await _purchasing.GetDownloadCursorAsync(CursorKey(Biz)));
    }

    [Fact]
    public async Task Download_IgnoresACursorThatMovesBackwards()
    {
        await _db.InitializeAsync();
        await _purchasing.ApplyDownloadedSuppliersAsync(Biz, new List<SupplierItem>(), CursorKey(Biz), 50);
        _api.DownloadHandler = _ => Page(50, 10, false, SupplierChange(10, "srv-old", "SUP-OLD", "Stale Data"));

        await Engine().RunSyncCycleAsync(Biz, Device);

        Assert.Empty(await _purchasing.GetSuppliersAsync(Biz));
        Assert.Equal(50, await _purchasing.GetDownloadCursorAsync(CursorKey(Biz)));
    }

    [Fact]
    public async Task Download_IsScopedPerBusiness_EachWithItsOwnCursorAndOwnRows()
    {
        await _db.InitializeAsync();
        _api.DownloadHandler = cursor => cursor == 0
            ? Page(0, 6, false, SupplierChange(6, "srv-1", "SUP-1", "Shared Name"))
            : Page(cursor, cursor, false);
        var engine = Engine();

        await engine.RunSyncCycleAsync(Biz, Device);
        await engine.RunSyncCycleAsync(OtherBiz, Device);

        Assert.Equal(6, await _purchasing.GetDownloadCursorAsync(CursorKey(Biz)));
        Assert.Equal(6, await _purchasing.GetDownloadCursorAsync(CursorKey(OtherBiz)));
        // The second business started again from 0 rather than inheriting the first one's cursor.
        Assert.Equal(new long[] { 0, 0 }, _api.DownloadCursors);
        Assert.Single(await _purchasing.GetSuppliersAsync(Biz));
        Assert.Empty(await _purchasing.GetSuppliersAsync("BIZ-NEVER-SYNCED"));
    }

    [Fact]
    public async Task Download_UnderstandsARealServerResponse()
    {
        await _db.InitializeAsync();
        var text = File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", "server-download-response-supplier.json"));
        var real = JsonSerializer.Deserialize<ApiResponseWrapper<SyncDownloadApiResponse>>(text)!.Data!;
        _api.DownloadHandler = cursor => cursor == 0
            ? ApiResult<SyncDownloadApiResponse>.Ok(real, 200)
            : Page(cursor, cursor, false);

        await Engine().RunSyncCycleAsync(Biz, Device);

        var supplier = Assert.Single(await _purchasing.GetSuppliersAsync(Biz));
        Assert.Equal("Acme Distributors", supplier.LegalName);
        Assert.Equal("SUP-2610-123", supplier.SupplierCode);
        Assert.Equal("27AAAAA0000A1Z5", supplier.Gstin);
        Assert.Equal(real.NextCursor, await _purchasing.GetDownloadCursorAsync(CursorKey(Biz)));
    }

    // ------------------------------------------------------ server responses

    [Fact]
    public void RealServerResponses_DeserializeIntoTheDesktopDtos()
    {
        T Read<T>(string name) where T : class =>
            JsonSerializer.Deserialize<ApiResponseWrapper<T>>(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", name)))!.Data!;

        var applied = Read<SyncUploadApiResponse>("server-upload-response-applied.json").Results.Single();
        Assert.Equal("APPLIED", applied.Status);
        Assert.False(string.IsNullOrEmpty(applied.ServerEntityId));
        Assert.Equal("Sale created successfully", applied.Message);
        Assert.False(applied.Retryable);

        var duplicate = Read<SyncUploadApiResponse>("server-upload-response-duplicate.json").Results.Single();
        Assert.Equal("DUPLICATE", duplicate.Status);
        Assert.False(string.IsNullOrEmpty(duplicate.ServerEntityId));

        var rejected = Read<SyncUploadApiResponse>("server-upload-response-rejected.json").Results.Single();
        Assert.Equal("REJECTED", rejected.Status);
        Assert.Equal("PRICE_SNAPSHOT_INVALID", rejected.ErrorCode);
        Assert.False(rejected.Retryable);
        Assert.Null(rejected.ServerEntityId);

        var supplier = Read<SyncUploadApiResponse>("server-upload-response-supplier-applied.json");
        Assert.Equal(1, supplier.ProcessedCount);
        Assert.Equal("APPLIED", supplier.Results.Single().Status);
    }
}
