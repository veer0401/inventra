using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Purchasing;
using Inventra.Desktop.Core.Domain.Sync;
using Inventra.Desktop.Data;
using Inventra.Desktop.Data.Repositories;
using Inventra.Desktop.Infrastructure.Api;
using Inventra.Desktop.Infrastructure.Sync;
using Microsoft.Data.Sqlite;
using Xunit;

namespace Inventra.Desktop.Tests;

public class SupplierWorkflowTests : IDisposable
{
    private const string Biz = "BIZ-01";
    private const string OtherBiz = "BIZ-02";

    private readonly string _path = Path.Combine(Path.GetTempPath(), $"inventra_supplier_{Guid.NewGuid()}.db");
    private readonly DatabaseContext _db;
    private readonly PurchasingRepository _repo;
    private readonly OfflineQueueRepository _queue;
    private readonly SalesRepository _sales;
    private const string DeviceGuid = "8d9c1d2e-5b6a-4c3f-9a10-2f4b7c8d9e01";

    public SupplierWorkflowTests()
    {
        _db = new DatabaseContext(_path);
        _repo = new PurchasingRepository(_db);
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

    private static SupplierItem NewSupplier(string code = "SUP-001", string name = "Acme Distributors", string biz = Biz) => new()
    {
        Id = Guid.NewGuid().ToString(),
        BusinessId = biz,
        SupplierCode = code,
        LegalName = name,
        PaymentTermsDays = 30
    };

    private static string PayloadFor(SupplierItem s) => JsonSerializer.Serialize(new CreateSupplierApiRequest(
        s.SupplierCode, s.LegalName, s.TradeName, "DISTRIBUTOR", s.Gstin, null, null, s.Email, s.PhoneNumber,
        s.ContactPersonName, s.AddressLine1, s.City, s.State, s.PostalCode, s.PaymentTermsDays, "Created on Desktop"));

    private async Task<OfflineOperation> QueueSupplierAsync(SupplierItem s) =>
        await _repo.SaveSupplierWithQueuedCreateAsync(s, "STORE-01", "DEV-01", "USR-01", PayloadFor(s));

    private static SupplierApiDto ServerDto(string id, string code, string name) => new(
        id, code, name, null, null, null, null, null, null, null, null, null, 30, "ACTIVE");

    // ---------- Validation ----------

    [Fact]
    public void Validator_AcceptsMinimalValidSupplier()
    {
        Assert.Empty(SupplierValidator.Validate(NewSupplier()));
    }

    [Fact]
    public void Validator_AcceptsWellFormedGstinEmailAndPhone()
    {
        var s = NewSupplier();
        s.Gstin = "27AAAAA0000A1Z5";
        s.Email = "orders@acme.example";
        s.PhoneNumber = "+91 98765 43210";
        Assert.Empty(SupplierValidator.Validate(s));
    }

    [Theory]
    [InlineData("", "Acme", "Supplier code is required")]
    [InlineData("SUP-1", "  ", "Legal name is required")]
    public void Validator_RejectsMissingRequiredFields(string code, string name, string expected)
    {
        var errors = SupplierValidator.Validate(NewSupplier(code, name));
        Assert.Contains(errors, e => e.Contains(expected));
    }

    [Fact]
    public void Validator_RejectsBadGstinEmailTermsAndOverlongFields()
    {
        var s = NewSupplier(new string('X', 51), new string('N', 201));
        s.Gstin = "NOT-A-GSTIN";
        s.Email = "no-at-sign";
        s.PaymentTermsDays = 400;
        s.PostalCode = new string('9', 21);

        var errors = SupplierValidator.Validate(s);

        Assert.Contains(errors, e => e.Contains("Supplier code cannot exceed 50"));
        Assert.Contains(errors, e => e.Contains("Legal name cannot exceed 200"));
        Assert.Contains(errors, e => e.Contains("GSTIN"));
        Assert.Contains(errors, e => e.Contains("Email address is not valid"));
        Assert.Contains(errors, e => e.Contains("Payment terms"));
        Assert.Contains(errors, e => e.Contains("Postal code cannot exceed 20"));
    }

    // ---------- Local persistence, queueing and restart ----------

    [Fact]
    public async Task SaveWithQueuedCreate_StoresPendingSupplierAndCanonicalOperationTogether()
    {
        await _db.InitializeAsync();
        var s = NewSupplier();

        var op = await QueueSupplierAsync(s);

        var stored = await _repo.GetSupplierByIdAsync(Biz, s.Id);
        Assert.NotNull(stored);
        Assert.Equal(SupplierSyncState.Pending, stored!.SyncState);
        Assert.False(stored.IsSynced);

        var pending = await _queue.GetPendingOperationsAsync(Biz);
        var queued = Assert.Single(pending);
        Assert.Equal("SUPPLIER_CREATED", queued.EventType);
        Assert.Equal($"SUPPLIER-{s.Id}", queued.IdempotencyKey);
        Assert.Equal(op.OperationId, queued.OperationId);
        Assert.Equal(CanonicalJson.ComputeChecksum(queued.PayloadJson), queued.PayloadChecksum);
    }

    [Fact]
    public async Task PendingSupplierAndItsOperation_SurviveApplicationRestart()
    {
        await _db.InitializeAsync();
        var s = NewSupplier("SUP-RESTART", "Restart Pharma");
        await QueueSupplierAsync(s);

        // "Restart": a brand-new context and repositories over the same database file.
        var db2 = new DatabaseContext(_path);
        await db2.InitializeAsync();
        var repo2 = new PurchasingRepository(db2);
        var queue2 = new OfflineQueueRepository(db2);

        var suppliers = await repo2.GetSuppliersAsync(Biz);
        var loaded = Assert.Single(suppliers);
        Assert.Equal("Restart Pharma", loaded.LegalName);
        Assert.Equal(SupplierSyncState.Pending, loaded.SyncState);
        Assert.Equal(1, await queue2.GetPendingCountAsync(Biz));
    }

    [Fact]
    public async Task Migration_AddsSyncColumnsToLegacySupplierTable_AndKeepsExistingRows()
    {
        // A database created by an earlier build: cache_suppliers without sync_state / sync_error.
        await using (var legacy = new SqliteConnection($"Data Source={_path}"))
        {
            await legacy.OpenAsync();
            await using var cmd = legacy.CreateCommand();
            cmd.CommandText = @"
                CREATE TABLE cache_suppliers (
                    id TEXT PRIMARY KEY, business_id TEXT NOT NULL, supplier_code TEXT NOT NULL,
                    legal_name TEXT NOT NULL, trade_name TEXT, gstin TEXT, contact_person TEXT, phone TEXT,
                    email TEXT, address TEXT, city TEXT, state TEXT, postal_code TEXT,
                    payment_terms_days INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'ACTIVE',
                    updated_at INTEGER NOT NULL);
                INSERT INTO cache_suppliers (id, business_id, supplier_code, legal_name, updated_at)
                VALUES ('legacy-1', 'BIZ-01', 'OLD-1', 'Legacy Supplier', 1);";
            await cmd.ExecuteNonQueryAsync();
        }
        SqliteConnection.ClearAllPools();

        await _db.InitializeAsync();

        var row = Assert.Single(await _repo.GetSuppliersAsync(Biz));
        Assert.Equal("Legacy Supplier", row.LegalName);
        Assert.Equal(SupplierSyncState.Synced, row.SyncState);
        Assert.Null(row.SyncError);
    }

    [Fact]
    public async Task Suppliers_AreIsolatedByBusiness()
    {
        await _db.InitializeAsync();
        var mine = NewSupplier("SHARED-CODE", "Mine", Biz);
        var theirs = NewSupplier("SHARED-CODE", "Theirs", OtherBiz);
        await _repo.UpsertSupplierAsync(mine);
        await _repo.UpsertSupplierAsync(theirs);

        var list = await _repo.GetSuppliersAsync(Biz);

        Assert.Equal("Mine", Assert.Single(list).LegalName);
        Assert.Null(await _repo.GetSupplierByIdAsync(Biz, theirs.Id));
        Assert.Equal("Theirs", (await _repo.GetSupplierByCodeAsync(OtherBiz, "shared-code"))!.LegalName);
        Assert.Equal("Mine", (await _repo.GetSupplierByCodeAsync(Biz, "shared-code"))!.LegalName);
    }

    // ---------- Merging the server list ----------

    [Fact]
    public async Task MergeCloud_InsertsNewServerSuppliersAsSynced()
    {
        await _db.InitializeAsync();

        await _repo.MergeCloudSuppliersAsync(Biz, new List<SupplierItem>
        {
            new() { Id = "srv-1", SupplierCode = "SRV-1", LegalName = "Server Supplier" }
        });

        var row = Assert.Single(await _repo.GetSuppliersAsync(Biz));
        Assert.Equal("srv-1", row.Id);
        Assert.Equal(SupplierSyncState.Synced, row.SyncState);
    }

    [Fact]
    public async Task MergeCloud_DoesNotOverwriteAPendingLocalSupplierThatSharesACode()
    {
        await _db.InitializeAsync();
        var local = NewSupplier("DUP-1", "Local Pending Name");
        await QueueSupplierAsync(local);

        await _repo.MergeCloudSuppliersAsync(Biz, new List<SupplierItem>
        {
            new() { Id = "srv-9", SupplierCode = "dup-1", LegalName = "Someone Else's Supplier" }
        });

        var row = Assert.Single(await _repo.GetSuppliersAsync(Biz));
        Assert.Equal(local.Id, row.Id);
        Assert.Equal("Local Pending Name", row.LegalName);
        Assert.Equal(SupplierSyncState.Pending, row.SyncState);
    }

    [Fact]
    public async Task MergeCloud_FoldsALegacySyncedDuplicateIntoTheServerRecordAndRepointsPurchases()
    {
        await _db.InitializeAsync();
        var legacy = NewSupplier("LEG-1", "Legacy Copy");
        legacy.SyncState = SupplierSyncState.Synced;
        await _repo.UpsertSupplierAsync(legacy);
        await InsertPurchaseAsync("PO-1", legacy.Id);

        await _repo.MergeCloudSuppliersAsync(Biz, new List<SupplierItem>
        {
            new() { Id = "srv-1", SupplierCode = "LEG-1", LegalName = "Server Copy" }
        });

        var row = Assert.Single(await _repo.GetSuppliersAsync(Biz));
        Assert.Equal("srv-1", row.Id);
        Assert.Equal("Server Copy", row.LegalName);
        Assert.Equal("srv-1", await PurchaseSupplierIdAsync("PO-1"));
    }

    // ---------- Sync engine ----------

    [Fact]
    public async Task SyncEngine_AppliedSupplier_ReplacesLocalIdWithServerIdAndRepointsPurchases()
    {
        await _db.InitializeAsync();
        var s = NewSupplier("SUP-SYNC", "Sync Me");
        var op = await QueueSupplierAsync(s);
        await InsertPurchaseAsync("PO-9", s.Id);

        var api = new MockInventraApiClient
        {
            UploadHandler = (_, ops) => new SyncUploadApiResponse(ops.Count, ops.Select(o =>
                new SyncOperationResultApiDto(o.EventId, "APPLIED", "server-sup-1", null, null)).ToList())
        };
        var engine = new SyncEngineService(_queue, api, _repo, _sales);

        var status = await engine.RunSyncCycleAsync(Biz, DeviceGuid);

        var row = Assert.Single(await _repo.GetSuppliersAsync(Biz));
        Assert.Equal("server-sup-1", row.Id);
        Assert.Equal(SupplierSyncState.Synced, row.SyncState);
        Assert.Equal("server-sup-1", await PurchaseSupplierIdAsync("PO-9"));
        Assert.Equal(0, status.PendingCount);
        Assert.Equal(op.OperationId, api.UploadedBatches.Single().Single().EventId);
    }

    [Fact]
    public async Task SyncEngine_RejectedSupplier_IsMarkedFailedWithTheServerReason()
    {
        await _db.InitializeAsync();
        var s = NewSupplier("SUP-DUP", "Duplicate Code");
        await QueueSupplierAsync(s);

        var api = new MockInventraApiClient
        {
            UploadHandler = (_, ops) => new SyncUploadApiResponse(ops.Count, ops.Select(o =>
                new SyncOperationResultApiDto(o.EventId, "REJECTED", null, "DUPLICATE_SUPPLIER_CODE",
                    "Supplier code 'SUP-DUP' already exists in this business")).ToList())
        };
        var engine = new SyncEngineService(_queue, api, _repo, _sales);

        var status = await engine.RunSyncCycleAsync(Biz, DeviceGuid);

        var row = await _repo.GetSupplierByIdAsync(Biz, s.Id);
        Assert.Equal(SupplierSyncState.Failed, row!.SyncState);
        Assert.Contains("already exists", row.SyncError);
        Assert.Equal(1, status.FailedCount);
        Assert.Equal(0, status.PendingCount);
    }

    [Fact]
    public async Task SyncEngine_UnsupportedEventAheadInQueue_IsFailedVisiblyAndDoesNotBlockTheSupplier()
    {
        await _db.InitializeAsync();
        // Queued first, so it has the lowest sequence number and would lead every upload batch.
        var unsupported = await _queue.EnqueueOperationAsync(
            Biz, "STORE-01", "DEV-01", "USR-01", "PRODUCT_UPDATE", "{\"total\":100}", "PRODUCT-1");
        var s = NewSupplier("SUP-BEHIND", "Behind The Sale");
        await QueueSupplierAsync(s);

        var api = new MockInventraApiClient
        {
            UploadHandler = (_, ops) => new SyncUploadApiResponse(ops.Count, ops.Select(o =>
                new SyncOperationResultApiDto(o.EventId, "APPLIED", "server-sup-2", null, null)).ToList())
        };
        var status = await new SyncEngineService(_queue, api, _repo, _sales).RunSyncCycleAsync(Biz, DeviceGuid);

        var uploaded = Assert.Single(Assert.Single(api.UploadedBatches));
        Assert.Equal("SUPPLIER_CREATED", uploaded.EventType);
        var failed = Assert.Single(await _queue.GetFailedOperationsAsync(Biz));
        Assert.Equal(unsupported.OperationId, failed.OperationId);
        Assert.Equal("UNSUPPORTED_EVENT_TYPE", failed.ErrorCode);
        Assert.Equal(1, status.FailedCount);
        Assert.Equal(0, status.PendingCount);
        Assert.Equal(SupplierSyncState.Synced, (await _repo.GetSupplierByIdAsync(Biz, "server-sup-2"))!.SyncState);
    }

    [Fact]
    public async Task SyncEngine_ServerUnreachable_LeavesSupplierPendingAndOperationQueued()
    {
        await _db.InitializeAsync();
        var s = NewSupplier();
        await QueueSupplierAsync(s);

        var engine = new SyncEngineService(_queue, new MockInventraApiClient { PingResult = false }, _repo, _sales);
        var status = await engine.RunSyncCycleAsync(Biz, DeviceGuid);

        Assert.Equal(1, status.PendingCount);
        Assert.Equal(SupplierSyncState.Pending, (await _repo.GetSupplierByIdAsync(Biz, s.Id))!.SyncState);
    }

    [Fact]
    public async Task SyncEngine_SendsTheCanonicalChecksum_EvenForRowsQueuedWithTheOldRawHash()
    {
        await _db.InitializeAsync();
        // Keys deliberately unsorted: a raw-string SHA-256 can never equal the backend's canonical checksum.
        const string payload = "{\"supplierCode\":\"S1\",\"legalName\":\"Acme\",\"paymentTermsDays\":30}";
        var op = await _queue.EnqueueOperationAsync(Biz, "STORE-01", "DEV-01", "USR-01", "SUPPLIER_CREATED", payload, "SUPPLIER-x");

        await using (var conn = _db.CreateConnection())
        {
            await conn.OpenAsync();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "UPDATE offline_operations SET payload_checksum = @old WHERE operation_id = @id;";
            cmd.Parameters.AddWithValue("@old", DatabaseContext.ComputeSha256(payload));
            cmd.Parameters.AddWithValue("@id", op.OperationId);
            await cmd.ExecuteNonQueryAsync();
        }

        var api = new MockInventraApiClient();
        await new SyncEngineService(_queue, api, _repo, _sales).RunSyncCycleAsync(Biz, DeviceGuid);

        var sent = api.UploadedBatches.Single().Single();
        Assert.Equal(CanonicalJson.ComputeChecksum(payload), sent.PayloadChecksum);
        Assert.NotEqual(DatabaseContext.ComputeSha256(payload), sent.PayloadChecksum);
    }

    // ---------- API result mapping ----------

    [Fact]
    public async Task ApiClient_CreateSupplier_MapsServerRejectionTransientFailureAndSuccess()
    {
        var req = new CreateSupplierApiRequest("S1", "Acme", null, "DISTRIBUTOR", null, null, null, null, null, null, null, null, null, null, 30, null);

        var conflict = await ClientWith(_ => Respond(HttpStatusCode.Conflict,
            "{\"status\":409,\"detail\":\"Supplier code 'S1' already exists in this business\"}")).CreateSupplierAsync(req);
        Assert.True(conflict.IsRejected);
        Assert.False(conflict.IsTransient);
        Assert.Contains("already exists", conflict.Error);
        Assert.Equal(409, conflict.StatusCode);

        var unavailable = await ClientWith(_ => Respond(HttpStatusCode.ServiceUnavailable, "")).CreateSupplierAsync(req);
        Assert.True(unavailable.IsTransient);

        var unreachable = await ClientWith(_ => throw new HttpRequestException("no route")).CreateSupplierAsync(req);
        Assert.True(unreachable.IsTransient);
        Assert.False(unreachable.IsSuccess);

        var created = await ClientWith(_ => Respond(HttpStatusCode.Created,
            "{\"success\":true,\"data\":{\"id\":\"srv-1\",\"supplierCode\":\"S1\",\"legalName\":\"Acme\",\"paymentTermsDays\":30,\"status\":\"ACTIVE\"}}")).CreateSupplierAsync(req);
        Assert.True(created.IsSuccess);
        Assert.Equal("srv-1", created.Data!.Id);
    }

    // ---------- helpers ----------

    private static InventraApiClient ClientWith(Func<HttpRequestMessage, HttpResponseMessage> responder) =>
        new(new HttpClient(new StubHandler(responder))) { BaseUrl = "http://localhost:8081" };

    private static HttpResponseMessage Respond(HttpStatusCode code, string body) =>
        new(code) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    private sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(responder(request));
    }

    private async Task InsertPurchaseAsync(string id, string supplierId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO local_purchases (id, business_id, store_id, supplier_id, supplier_name, order_number, order_date, created_at, created_by)
            VALUES (@id, @biz, 'STORE-01', @sup, 'Supplier', @id, '2026-10-26', 1, 'USR-01');";
        cmd.Parameters.AddWithValue("@id", id);
        cmd.Parameters.AddWithValue("@biz", Biz);
        cmd.Parameters.AddWithValue("@sup", supplierId);
        await cmd.ExecuteNonQueryAsync();
    }

    private async Task<string?> PurchaseSupplierIdAsync(string id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT supplier_id FROM local_purchases WHERE id = @id;";
        cmd.Parameters.AddWithValue("@id", id);
        return (string?)await cmd.ExecuteScalarAsync();
    }
}
