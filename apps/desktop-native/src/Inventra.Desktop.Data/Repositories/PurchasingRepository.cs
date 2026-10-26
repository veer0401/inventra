using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Purchasing;
using Inventra.Desktop.Core.Domain.Sync;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Data.Repositories;

public interface IPurchasingRepository
{
    // Supplier Management
    Task<IReadOnlyList<SupplierItem>> GetSuppliersAsync(string businessId);
    Task<SupplierItem?> GetSupplierByIdAsync(string businessId, string id);
    Task UpsertSupplierAsync(SupplierItem supplier);
    Task<SupplierItem?> GetSupplierByCodeAsync(string businessId, string supplierCode);

    /// <summary>
    /// Saves the supplier as PENDING and queues its SUPPLIER_CREATED operation in one transaction, so a
    /// supplier is never stored locally without the operation that will deliver it to the server.
    /// </summary>
    Task<OfflineOperation> SaveSupplierWithQueuedCreateAsync(
        SupplierItem supplier, string storeId, string deviceId, string userId, string payloadJson);

    /// <summary>Merges the server's supplier list without overwriting rows that have not reached the server.</summary>
    Task MergeCloudSuppliersAsync(string businessId, IReadOnlyList<SupplierItem> cloudSuppliers);

    /// <summary>Last server change-feed sequence applied for the given key (0 when never downloaded).</summary>
    Task<long> GetDownloadCursorAsync(string cursorKey);

    /// <summary>Merges a downloaded page of suppliers and advances the cursor in one transaction.</summary>
    Task ApplyDownloadedSuppliersAsync(string businessId, IReadOnlyList<SupplierItem> suppliers, string cursorKey, long newCursor);

    /// <summary>Swaps the client-generated id for the server-assigned id and repoints purchase documents.</summary>
    Task ReconcileSupplierCreatedAsync(string businessId, string localSupplierId, string serverSupplierId);
    Task MarkSupplierSyncStateAsync(string businessId, string supplierId, string syncState, string? syncError);

    /// <summary>Records the outcome of syncing a goods receipt (SYNCED or FAILED).</summary>
    Task MarkGoodsReceiptSyncStateAsync(string goodsReceiptId, string syncStatus);

    // Purchase Order Management
    Task<IReadOnlyList<PurchaseOrderItem>> GetPurchasesAsync(string businessId, string? storeId = null);
    Task<PurchaseOrderItem?> GetPurchaseByIdAsync(string id);
    Task SavePurchaseAsync(PurchaseOrderItem purchase);
    Task UpdatePurchaseStatusAsync(string id, string status);
    Task<decimal?> GetPreviousPurchasePriceAsync(string businessId, string productId);

    // Goods Receipt (GRN) Management
    Task<IReadOnlyList<GoodsReceiptItem>> GetGoodsReceiptsAsync(string businessId, string? storeId = null);
    Task<GoodsReceiptItem?> GetGoodsReceiptByIdAsync(string id);
    Task SaveGoodsReceiptAsync(GoodsReceiptItem grn);
    Task<GoodsReceiptItem> PostGoodsReceiptTransactionAsync(GoodsReceiptItem grn, string userId, string deviceId);
}

public sealed class PurchasingRepository : IPurchasingRepository
{
    private readonly DatabaseContext _dbContext;

    public PurchasingRepository(DatabaseContext dbContext)
    {
        _dbContext = dbContext;
    }

    #region Suppliers

    private const string SupplierColumns = @"
        id, business_id, supplier_code, legal_name, trade_name, gstin,
        contact_person, phone, email, address, city, state, postal_code,
        payment_terms_days, status, updated_at, sync_state, sync_error";

    private static SupplierItem ReadSupplier(SqliteDataReader reader) => new()
    {
        Id = reader.GetString(0),
        BusinessId = reader.GetString(1),
        SupplierCode = reader.GetString(2),
        LegalName = reader.GetString(3),
        TradeName = reader.IsDBNull(4) ? null : reader.GetString(4),
        Gstin = reader.IsDBNull(5) ? null : reader.GetString(5),
        ContactPersonName = reader.IsDBNull(6) ? null : reader.GetString(6),
        PhoneNumber = reader.IsDBNull(7) ? null : reader.GetString(7),
        Email = reader.IsDBNull(8) ? null : reader.GetString(8),
        AddressLine1 = reader.IsDBNull(9) ? null : reader.GetString(9),
        City = reader.IsDBNull(10) ? null : reader.GetString(10),
        State = reader.IsDBNull(11) ? null : reader.GetString(11),
        PostalCode = reader.IsDBNull(12) ? null : reader.GetString(12),
        PaymentTermsDays = reader.GetInt32(13),
        Status = reader.GetString(14),
        UpdatedAt = reader.GetInt64(15),
        SyncState = reader.IsDBNull(16) ? SupplierSyncState.Synced : reader.GetString(16),
        SyncError = reader.IsDBNull(17) ? null : reader.GetString(17)
    };

    public async Task<IReadOnlyList<SupplierItem>> GetSuppliersAsync(string businessId)
    {
        var list = new List<SupplierItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"SELECT {SupplierColumns} FROM cache_suppliers WHERE business_id = @biz ORDER BY legal_name ASC;";
        cmd.Parameters.AddWithValue("@biz", businessId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(ReadSupplier(reader));
        }

        return list;
    }

    public async Task<SupplierItem?> GetSupplierByIdAsync(string businessId, string id)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"SELECT {SupplierColumns} FROM cache_suppliers WHERE business_id = @biz AND id = @id LIMIT 1;";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadSupplier(reader) : null;
    }

    public async Task<SupplierItem?> GetSupplierByCodeAsync(string businessId, string supplierCode)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"SELECT {SupplierColumns} FROM cache_suppliers WHERE business_id = @biz AND supplier_code = @code COLLATE NOCASE LIMIT 1;";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@code", supplierCode.Trim());

        await using var reader = await cmd.ExecuteReaderAsync();
        return await reader.ReadAsync() ? ReadSupplier(reader) : null;
    }

    public async Task UpsertSupplierAsync(SupplierItem supplier)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await UpsertSupplierCoreAsync(connection, null, supplier);
    }

    private static async Task UpsertSupplierCoreAsync(SqliteConnection connection, SqliteTransaction? tx, SupplierItem supplier)
    {
        await using var cmd = connection.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = @"
            INSERT INTO cache_suppliers (
                id, business_id, supplier_code, legal_name, trade_name, gstin,
                contact_person, phone, email, address, city, state, postal_code,
                payment_terms_days, status, updated_at, sync_state, sync_error
            ) VALUES (
                @id, @biz, @code, @name, @trade, @gstin,
                @contact, @phone, @email, @addr, @city, @state, @zip,
                @terms, @status, @upd, @syncState, @syncError
            )
            ON CONFLICT(id) DO UPDATE SET
                supplier_code = excluded.supplier_code,
                legal_name = excluded.legal_name,
                trade_name = excluded.trade_name,
                gstin = excluded.gstin,
                contact_person = excluded.contact_person,
                phone = excluded.phone,
                email = excluded.email,
                address = excluded.address,
                city = excluded.city,
                state = excluded.state,
                postal_code = excluded.postal_code,
                payment_terms_days = excluded.payment_terms_days,
                status = excluded.status,
                updated_at = excluded.updated_at,
                sync_state = excluded.sync_state,
                sync_error = excluded.sync_error;
        ";

        cmd.Parameters.AddWithValue("@id", supplier.Id);
        cmd.Parameters.AddWithValue("@biz", supplier.BusinessId);
        cmd.Parameters.AddWithValue("@code", supplier.SupplierCode);
        cmd.Parameters.AddWithValue("@name", supplier.LegalName);
        cmd.Parameters.AddWithValue("@trade", (object?)supplier.TradeName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@gstin", (object?)supplier.Gstin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@contact", (object?)supplier.ContactPersonName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@phone", (object?)supplier.PhoneNumber ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@email", (object?)supplier.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@addr", (object?)supplier.AddressLine1 ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@city", (object?)supplier.City ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@state", (object?)supplier.State ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@zip", (object?)supplier.PostalCode ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@terms", supplier.PaymentTermsDays);
        cmd.Parameters.AddWithValue("@status", supplier.Status);
        cmd.Parameters.AddWithValue("@upd", supplier.UpdatedAt);
        cmd.Parameters.AddWithValue("@syncState", supplier.SyncState);
        cmd.Parameters.AddWithValue("@syncError", (object?)supplier.SyncError ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<OfflineOperation> SaveSupplierWithQueuedCreateAsync(
        SupplierItem supplier, string storeId, string deviceId, string userId, string payloadJson)
    {
        supplier.SyncState = SupplierSyncState.Pending;
        supplier.SyncError = null;

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        await UpsertSupplierCoreAsync(connection, tx, supplier);

        long nextSeq;
        await using (var seqCmd = connection.CreateCommand())
        {
            seqCmd.Transaction = tx;
            seqCmd.CommandText = @"
                SELECT COALESCE(MAX(device_sequence_number), 0) + 1
                FROM offline_operations
                WHERE business_id = @biz AND device_id = @dev;
            ";
            seqCmd.Parameters.AddWithValue("@biz", supplier.BusinessId);
            seqCmd.Parameters.AddWithValue("@dev", deviceId);
            nextSeq = Convert.ToInt64(await seqCmd.ExecuteScalarAsync());
        }

        var op = new OfflineOperation
        {
            OperationId = Guid.NewGuid().ToString(),
            BusinessId = supplier.BusinessId,
            StoreId = storeId,
            DeviceId = deviceId,
            UserId = userId,
            DeviceSequenceNumber = nextSeq,
            EventType = "SUPPLIER_CREATED",
            PayloadJson = payloadJson,
            PayloadChecksum = CanonicalJson.ComputeChecksum(payloadJson),
            IdempotencyKey = $"SUPPLIER-{supplier.Id}",
            Status = SyncOperationStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        };

        await using (var insertCmd = connection.CreateCommand())
        {
            insertCmd.Transaction = tx;
            insertCmd.CommandText = @"
                INSERT INTO offline_operations (
                    operation_id, business_id, store_id, device_id, user_id,
                    device_sequence_number, event_type, event_version, payload_json,
                    payload_checksum, idempotency_key, status, retry_count, created_at
                ) VALUES (
                    @opId, @biz, @store, @dev, @usr,
                    @seq, @evt, 1, @json,
                    @csum, @idem, 'PENDING', 0, @created
                );
            ";
            insertCmd.Parameters.AddWithValue("@opId", op.OperationId);
            insertCmd.Parameters.AddWithValue("@biz", op.BusinessId);
            insertCmd.Parameters.AddWithValue("@store", op.StoreId);
            insertCmd.Parameters.AddWithValue("@dev", op.DeviceId);
            insertCmd.Parameters.AddWithValue("@usr", op.UserId);
            insertCmd.Parameters.AddWithValue("@seq", op.DeviceSequenceNumber);
            insertCmd.Parameters.AddWithValue("@evt", op.EventType);
            insertCmd.Parameters.AddWithValue("@json", op.PayloadJson);
            insertCmd.Parameters.AddWithValue("@csum", op.PayloadChecksum);
            insertCmd.Parameters.AddWithValue("@idem", op.IdempotencyKey);
            insertCmd.Parameters.AddWithValue("@created", op.CreatedAt);
            await insertCmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
        return op;
    }

    public async Task MergeCloudSuppliersAsync(string businessId, IReadOnlyList<SupplierItem> cloudSuppliers)
    {
        if (cloudSuppliers.Count == 0) return;

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        await MergeSuppliersCoreAsync(connection, tx, businessId, cloudSuppliers);

        await tx.CommitAsync();
    }

    public async Task<long> GetDownloadCursorAsync(string cursorKey)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT value FROM sync_metadata WHERE key = @k;";
        cmd.Parameters.AddWithValue("@k", cursorKey);
        var raw = await cmd.ExecuteScalarAsync() as string;
        return long.TryParse(raw, out var cursor) && cursor >= 0 ? cursor : 0;
    }

    public async Task ApplyDownloadedSuppliersAsync(
        string businessId, IReadOnlyList<SupplierItem> suppliers, string cursorKey, long newCursor)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        await MergeSuppliersCoreAsync(connection, tx, businessId, suppliers);

        // The checkpoint moves in the same transaction as the data it covers: an interruption either
        // keeps both or neither, and replaying a page is harmless because the merge is idempotent.
        await using (var cursorCmd = connection.CreateCommand())
        {
            cursorCmd.Transaction = tx;
            cursorCmd.CommandText = @"
                INSERT INTO sync_metadata (key, value, updated_at) VALUES (@k, @v, @now)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
            ";
            cursorCmd.Parameters.AddWithValue("@k", cursorKey);
            cursorCmd.Parameters.AddWithValue("@v", newCursor.ToString(System.Globalization.CultureInfo.InvariantCulture));
            cursorCmd.Parameters.AddWithValue("@now", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
            await cursorCmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
    }

    private static async Task MergeSuppliersCoreAsync(
        SqliteConnection connection, SqliteTransaction tx, string businessId, IReadOnlyList<SupplierItem> cloudSuppliers)
    {
        foreach (var cloud in cloudSuppliers)
        {
            cloud.BusinessId = businessId;
            cloud.SyncState = SupplierSyncState.Synced;
            cloud.SyncError = null;

            // Another local row already uses this supplier code under a different id.
            string? otherId = null;
            string? otherState = null;
            await using (var findCmd = connection.CreateCommand())
            {
                findCmd.Transaction = tx;
                findCmd.CommandText = @"
                    SELECT id, sync_state FROM cache_suppliers
                    WHERE business_id = @biz AND supplier_code = @code COLLATE NOCASE AND id <> @id
                    LIMIT 1;
                ";
                findCmd.Parameters.AddWithValue("@biz", businessId);
                findCmd.Parameters.AddWithValue("@code", cloud.SupplierCode);
                findCmd.Parameters.AddWithValue("@id", cloud.Id);
                await using var r = await findCmd.ExecuteReaderAsync();
                if (await r.ReadAsync())
                {
                    otherId = r.GetString(0);
                    otherState = r.IsDBNull(1) ? SupplierSyncState.Synced : r.GetString(1);
                }
            }

            if (otherId != null)
            {
                // A PENDING/FAILED local supplier owns the code: keep it so the user's data is not lost
                // silently. Its queued create will be accepted or rejected (and shown) by the sync engine.
                if (otherState != SupplierSyncState.Synced) continue;

                // A SYNCED row with a client-generated id is a leftover duplicate of the server record
                // (created by an earlier client that kept its own id); fold it into the server row.
                await RepointSupplierReferencesAsync(connection, tx, otherId, cloud.Id);
                await using var delCmd = connection.CreateCommand();
                delCmd.Transaction = tx;
                delCmd.CommandText = "DELETE FROM cache_suppliers WHERE business_id = @biz AND id = @id;";
                delCmd.Parameters.AddWithValue("@biz", businessId);
                delCmd.Parameters.AddWithValue("@id", otherId);
                await delCmd.ExecuteNonQueryAsync();
            }

            await UpsertSupplierCoreAsync(connection, tx, cloud);
        }
    }

    public async Task ReconcileSupplierCreatedAsync(string businessId, string localSupplierId, string serverSupplierId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        if (!string.Equals(localSupplierId, serverSupplierId, StringComparison.OrdinalIgnoreCase))
        {
            bool serverRowExists;
            await using (var existsCmd = connection.CreateCommand())
            {
                existsCmd.Transaction = tx;
                existsCmd.CommandText = "SELECT 1 FROM cache_suppliers WHERE business_id = @biz AND id = @id LIMIT 1;";
                existsCmd.Parameters.AddWithValue("@biz", businessId);
                existsCmd.Parameters.AddWithValue("@id", serverSupplierId);
                serverRowExists = await existsCmd.ExecuteScalarAsync() != null;
            }

            await RepointSupplierReferencesAsync(connection, tx, localSupplierId, serverSupplierId);

            await using var cmd = connection.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = serverRowExists
                ? "DELETE FROM cache_suppliers WHERE business_id = @biz AND id = @local;"
                : "UPDATE cache_suppliers SET id = @server WHERE business_id = @biz AND id = @local;";
            cmd.Parameters.AddWithValue("@biz", businessId);
            cmd.Parameters.AddWithValue("@local", localSupplierId);
            cmd.Parameters.AddWithValue("@server", serverSupplierId);
            await cmd.ExecuteNonQueryAsync();
        }

        await using (var stateCmd = connection.CreateCommand())
        {
            stateCmd.Transaction = tx;
            stateCmd.CommandText = @"
                UPDATE cache_suppliers SET sync_state = 'SYNCED', sync_error = NULL
                WHERE business_id = @biz AND id = @id;
            ";
            stateCmd.Parameters.AddWithValue("@biz", businessId);
            stateCmd.Parameters.AddWithValue("@id", serverSupplierId);
            await stateCmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
    }

    public async Task MarkSupplierSyncStateAsync(string businessId, string supplierId, string syncState, string? syncError)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE cache_suppliers SET sync_state = @state, sync_error = @err
            WHERE business_id = @biz AND id = @id;
        ";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@id", supplierId);
        cmd.Parameters.AddWithValue("@state", syncState);
        cmd.Parameters.AddWithValue("@err", (object?)syncError ?? DBNull.Value);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task MarkGoodsReceiptSyncStateAsync(string goodsReceiptId, string syncStatus)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE local_goods_receipts SET sync_status = @s WHERE id = @id;";
        cmd.Parameters.AddWithValue("@s", syncStatus);
        cmd.Parameters.AddWithValue("@id", goodsReceiptId);
        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task RepointSupplierReferencesAsync(
        SqliteConnection connection, SqliteTransaction tx, string oldSupplierId, string newSupplierId)
    {
        foreach (var table in new[] { "local_purchases", "local_goods_receipts" })
        {
            await using var cmd = connection.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = $"UPDATE {table} SET supplier_id = @new WHERE supplier_id = @old;";
            cmd.Parameters.AddWithValue("@old", oldSupplierId);
            cmd.Parameters.AddWithValue("@new", newSupplierId);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    #endregion

    #region Purchases

    public async Task<IReadOnlyList<PurchaseOrderItem>> GetPurchasesAsync(string businessId, string? storeId = null)
    {
        var list = new List<PurchaseOrderItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        if (string.IsNullOrEmpty(storeId))
        {
            cmd.CommandText = @"
                SELECT id, business_id, store_id, supplier_id, supplier_name,
                       order_number, supplier_invoice_no, order_date, expected_delivery_date,
                       status, payment_terms_days, notes, subtotal, discount_amount,
                       tax_amount, total_amount, sync_status, created_at, created_by
                FROM local_purchases
                WHERE business_id = @biz
                ORDER BY created_at DESC;
            ";
            cmd.Parameters.AddWithValue("@biz", businessId);
        }
        else
        {
            cmd.CommandText = @"
                SELECT id, business_id, store_id, supplier_id, supplier_name,
                       order_number, supplier_invoice_no, order_date, expected_delivery_date,
                       status, payment_terms_days, notes, subtotal, discount_amount,
                       tax_amount, total_amount, sync_status, created_at, created_by
                FROM local_purchases
                WHERE business_id = @biz AND store_id = @store
                ORDER BY created_at DESC;
            ";
            cmd.Parameters.AddWithValue("@biz", businessId);
            cmd.Parameters.AddWithValue("@store", storeId);
        }

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new PurchaseOrderItem
            {
                Id = reader.GetString(0),
                BusinessId = reader.GetString(1),
                StoreId = reader.GetString(2),
                SupplierId = reader.GetString(3),
                SupplierName = reader.GetString(4),
                OrderNumber = reader.GetString(5),
                SupplierInvoiceNumber = reader.IsDBNull(6) ? null : reader.GetString(6),
                OrderDate = reader.GetString(7),
                ExpectedDeliveryDate = reader.IsDBNull(8) ? null : reader.GetString(8),
                Status = reader.GetString(9),
                PaymentTermsDays = reader.GetInt32(10),
                Notes = reader.IsDBNull(11) ? null : reader.GetString(11),
                Subtotal = Convert.ToDecimal(reader.GetDouble(12)),
                DiscountAmount = Convert.ToDecimal(reader.GetDouble(13)),
                TaxAmount = Convert.ToDecimal(reader.GetDouble(14)),
                TotalAmount = Convert.ToDecimal(reader.GetDouble(15)),
                SyncStatus = reader.GetString(16),
                CreatedAt = reader.GetInt64(17),
                CreatedBy = reader.GetString(18)
            });
        }

        // Load lines for each purchase
        foreach (var p in list)
        {
            p.Lines = await GetPurchaseLinesAsync(connection, p.Id);
        }

        return list;
    }

    public async Task<PurchaseOrderItem?> GetPurchaseByIdAsync(string id)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, store_id, supplier_id, supplier_name,
                   order_number, supplier_invoice_no, order_date, expected_delivery_date,
                   status, payment_terms_days, notes, subtotal, discount_amount,
                   tax_amount, total_amount, sync_status, created_at, created_by
            FROM local_purchases
            WHERE id = @id LIMIT 1;
        ";
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var p = new PurchaseOrderItem
            {
                Id = reader.GetString(0),
                BusinessId = reader.GetString(1),
                StoreId = reader.GetString(2),
                SupplierId = reader.GetString(3),
                SupplierName = reader.GetString(4),
                OrderNumber = reader.GetString(5),
                SupplierInvoiceNumber = reader.IsDBNull(6) ? null : reader.GetString(6),
                OrderDate = reader.GetString(7),
                ExpectedDeliveryDate = reader.IsDBNull(8) ? null : reader.GetString(8),
                Status = reader.GetString(9),
                PaymentTermsDays = reader.GetInt32(10),
                Notes = reader.IsDBNull(11) ? null : reader.GetString(11),
                Subtotal = Convert.ToDecimal(reader.GetDouble(12)),
                DiscountAmount = Convert.ToDecimal(reader.GetDouble(13)),
                TaxAmount = Convert.ToDecimal(reader.GetDouble(14)),
                TotalAmount = Convert.ToDecimal(reader.GetDouble(15)),
                SyncStatus = reader.GetString(16),
                CreatedAt = reader.GetInt64(17),
                CreatedBy = reader.GetString(18)
            };
            await reader.CloseAsync();
            p.Lines = await GetPurchaseLinesAsync(connection, p.Id);
            return p;
        }

        return null;
    }

    private static async Task<List<PurchaseOrderLineItem>> GetPurchaseLinesAsync(SqliteConnection connection, string purchaseId)
    {
        var lines = new List<PurchaseOrderLineItem>();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, purchase_id, product_id, product_name, ordered_qty, free_qty,
                   received_qty, purchase_unit, unit_price, discount_amount,
                   tax_rate, tax_amount, total_amount
            FROM local_purchase_lines
            WHERE purchase_id = @pid;
        ";
        cmd.Parameters.AddWithValue("@pid", purchaseId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            lines.Add(new PurchaseOrderLineItem
            {
                Id = reader.GetString(0),
                PurchaseOrderId = reader.GetString(1),
                ProductId = reader.GetString(2),
                ProductName = reader.GetString(3),
                OrderedQuantity = Convert.ToDecimal(reader.GetDouble(4)),
                FreeQuantity = Convert.ToDecimal(reader.GetDouble(5)),
                ReceivedQuantity = Convert.ToDecimal(reader.GetDouble(6)),
                PurchaseUnit = reader.GetString(7),
                UnitPrice = Convert.ToDecimal(reader.GetDouble(8)),
                DiscountAmount = Convert.ToDecimal(reader.GetDouble(9)),
                TaxRate = Convert.ToDecimal(reader.GetDouble(10)),
                TaxAmount = Convert.ToDecimal(reader.GetDouble(11)),
                LineTotal = Convert.ToDecimal(reader.GetDouble(12))
            });
        }

        return lines;
    }

    public async Task SavePurchaseAsync(PurchaseOrderItem purchase)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        await using (var cmd = connection.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = @"
                INSERT INTO local_purchases (
                    id, business_id, store_id, supplier_id, supplier_name,
                    order_number, supplier_invoice_no, order_date, expected_delivery_date,
                    status, payment_terms_days, notes, subtotal, discount_amount,
                    tax_amount, total_amount, sync_status, created_at, created_by
                ) VALUES (
                    @id, @biz, @store, @supp, @sname,
                    @num, @inv, @odate, @edate,
                    @status, @terms, @notes, @sub, @disc,
                    @tax, @tot, @sync, @c_at, @c_by
                )
                ON CONFLICT(id) DO UPDATE SET
                    supplier_id = excluded.supplier_id,
                    supplier_name = excluded.supplier_name,
                    supplier_invoice_no = excluded.supplier_invoice_no,
                    order_date = excluded.order_date,
                    expected_delivery_date = excluded.expected_delivery_date,
                    status = excluded.status,
                    payment_terms_days = excluded.payment_terms_days,
                    notes = excluded.notes,
                    subtotal = excluded.subtotal,
                    discount_amount = excluded.discount_amount,
                    tax_amount = excluded.tax_amount,
                    total_amount = excluded.total_amount,
                    sync_status = excluded.sync_status;
            ";

            cmd.Parameters.AddWithValue("@id", purchase.Id);
            cmd.Parameters.AddWithValue("@biz", purchase.BusinessId);
            cmd.Parameters.AddWithValue("@store", purchase.StoreId);
            cmd.Parameters.AddWithValue("@supp", purchase.SupplierId);
            cmd.Parameters.AddWithValue("@sname", purchase.SupplierName);
            cmd.Parameters.AddWithValue("@num", purchase.OrderNumber);
            cmd.Parameters.AddWithValue("@inv", (object?)purchase.SupplierInvoiceNumber ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@odate", purchase.OrderDate);
            cmd.Parameters.AddWithValue("@edate", (object?)purchase.ExpectedDeliveryDate ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@status", purchase.Status);
            cmd.Parameters.AddWithValue("@terms", purchase.PaymentTermsDays);
            cmd.Parameters.AddWithValue("@notes", (object?)purchase.Notes ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@sub", (double)purchase.Subtotal);
            cmd.Parameters.AddWithValue("@disc", (double)purchase.DiscountAmount);
            cmd.Parameters.AddWithValue("@tax", (double)purchase.TaxAmount);
            cmd.Parameters.AddWithValue("@tot", (double)purchase.TotalAmount);
            cmd.Parameters.AddWithValue("@sync", purchase.SyncStatus);
            cmd.Parameters.AddWithValue("@c_at", purchase.CreatedAt);
            cmd.Parameters.AddWithValue("@c_by", purchase.CreatedBy);

            await cmd.ExecuteNonQueryAsync();
        }

        // Delete existing lines and re-insert
        await using (var delCmd = connection.CreateCommand())
        {
            delCmd.Transaction = tx;
            delCmd.CommandText = "DELETE FROM local_purchase_lines WHERE purchase_id = @pid;";
            delCmd.Parameters.AddWithValue("@pid", purchase.Id);
            await delCmd.ExecuteNonQueryAsync();
        }

        foreach (var line in purchase.Lines)
        {
            await using var lCmd = connection.CreateCommand();
            lCmd.Transaction = tx;
            lCmd.CommandText = @"
                INSERT INTO local_purchase_lines (
                    id, purchase_id, product_id, product_name, ordered_qty, free_qty,
                    received_qty, purchase_unit, unit_price, discount_amount,
                    tax_rate, tax_amount, total_amount
                ) VALUES (
                    @id, @pid, @prid, @pname, @oqty, @fqty,
                    @rqty, @unit, @price, @disc,
                    @trate, @tax, @tot
                );
            ";

            lCmd.Parameters.AddWithValue("@id", line.Id);
            lCmd.Parameters.AddWithValue("@pid", purchase.Id);
            lCmd.Parameters.AddWithValue("@prid", line.ProductId);
            lCmd.Parameters.AddWithValue("@pname", line.ProductName);
            lCmd.Parameters.AddWithValue("@oqty", (double)line.OrderedQuantity);
            lCmd.Parameters.AddWithValue("@fqty", (double)line.FreeQuantity);
            lCmd.Parameters.AddWithValue("@rqty", (double)line.ReceivedQuantity);
            lCmd.Parameters.AddWithValue("@unit", line.PurchaseUnit);
            lCmd.Parameters.AddWithValue("@price", (double)line.UnitPrice);
            lCmd.Parameters.AddWithValue("@disc", (double)line.DiscountAmount);
            lCmd.Parameters.AddWithValue("@trate", (double)line.TaxRate);
            lCmd.Parameters.AddWithValue("@tax", (double)line.TaxAmount);
            lCmd.Parameters.AddWithValue("@tot", (double)line.LineTotal);

            await lCmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
    }

    public async Task UpdatePurchaseStatusAsync(string id, string status)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE local_purchases SET status = @st WHERE id = @id;";
        cmd.Parameters.AddWithValue("@st", status);
        cmd.Parameters.AddWithValue("@id", id);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<decimal?> GetPreviousPurchasePriceAsync(string businessId, string productId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT lpl.unit_price
            FROM local_purchase_lines lpl
            JOIN local_purchases lp ON lpl.purchase_id = lp.id
            WHERE lp.business_id = @biz AND lpl.product_id = @pid
            ORDER BY lp.created_at DESC LIMIT 1;
        ";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@pid", productId);

        var val = await cmd.ExecuteScalarAsync();
        if (val != null && val != DBNull.Value)
        {
            return Convert.ToDecimal(Convert.ToDouble(val));
        }

        return null;
    }

    #endregion

    #region Goods Receipts

    public async Task<IReadOnlyList<GoodsReceiptItem>> GetGoodsReceiptsAsync(string businessId, string? storeId = null)
    {
        var list = new List<GoodsReceiptItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        if (string.IsNullOrEmpty(storeId))
        {
            cmd.CommandText = @"
                SELECT id, business_id, store_id, supplier_id, supplier_name,
                       purchase_id, receipt_number, vendor_delivery_note, received_date,
                       status, notes, total_amount, received_by, sync_status, created_at
                FROM local_goods_receipts
                WHERE business_id = @biz
                ORDER BY created_at DESC;
            ";
            cmd.Parameters.AddWithValue("@biz", businessId);
        }
        else
        {
            cmd.CommandText = @"
                SELECT id, business_id, store_id, supplier_id, supplier_name,
                       purchase_id, receipt_number, vendor_delivery_note, received_date,
                       status, notes, total_amount, received_by, sync_status, created_at
                FROM local_goods_receipts
                WHERE business_id = @biz AND store_id = @store
                ORDER BY created_at DESC;
            ";
            cmd.Parameters.AddWithValue("@biz", businessId);
            cmd.Parameters.AddWithValue("@store", storeId);
        }

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new GoodsReceiptItem
            {
                Id = reader.GetString(0),
                BusinessId = reader.GetString(1),
                StoreId = reader.GetString(2),
                SupplierId = reader.GetString(3),
                SupplierName = reader.GetString(4),
                PurchaseOrderId = reader.IsDBNull(5) ? null : reader.GetString(5),
                ReceiptNumber = reader.GetString(6),
                VendorDeliveryNote = reader.IsDBNull(7) ? null : reader.GetString(7),
                ReceivedDate = reader.GetString(8),
                Status = reader.GetString(9),
                Notes = reader.IsDBNull(10) ? null : reader.GetString(10),
                TotalAmount = Convert.ToDecimal(reader.GetDouble(11)),
                ReceivedBy = reader.GetString(12),
                SyncStatus = reader.GetString(13),
                CreatedAt = reader.GetInt64(14)
            });
        }

        foreach (var grn in list)
        {
            grn.Lines = await GetGoodsReceiptLinesAsync(connection, grn.Id);
        }

        return list;
    }

    public async Task<GoodsReceiptItem?> GetGoodsReceiptByIdAsync(string id)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, store_id, supplier_id, supplier_name,
                   purchase_id, receipt_number, vendor_delivery_note, received_date,
                   status, notes, total_amount, received_by, sync_status, created_at
            FROM local_goods_receipts
            WHERE id = @id LIMIT 1;
        ";
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var grn = new GoodsReceiptItem
            {
                Id = reader.GetString(0),
                BusinessId = reader.GetString(1),
                StoreId = reader.GetString(2),
                SupplierId = reader.GetString(3),
                SupplierName = reader.GetString(4),
                PurchaseOrderId = reader.IsDBNull(5) ? null : reader.GetString(5),
                ReceiptNumber = reader.GetString(6),
                VendorDeliveryNote = reader.IsDBNull(7) ? null : reader.GetString(7),
                ReceivedDate = reader.GetString(8),
                Status = reader.GetString(9),
                Notes = reader.IsDBNull(10) ? null : reader.GetString(10),
                TotalAmount = Convert.ToDecimal(reader.GetDouble(11)),
                ReceivedBy = reader.GetString(12),
                SyncStatus = reader.GetString(13),
                CreatedAt = reader.GetInt64(14)
            };
            await reader.CloseAsync();
            grn.Lines = await GetGoodsReceiptLinesAsync(connection, grn.Id);
            return grn;
        }

        return null;
    }

    private static async Task<List<GoodsReceiptLineItem>> GetGoodsReceiptLinesAsync(SqliteConnection connection, string grnId)
    {
        var lines = new List<GoodsReceiptLineItem>();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, grn_id, purchase_line_id, product_id, product_name,
                   received_qty, rejected_qty, free_qty, batch_number, mfg_date,
                   expiry_date, unit_cost, mrp, selling_price, tax_rate,
                   tax_amount, total_amount, assigned_batch_id
            FROM local_goods_receipt_lines
            WHERE grn_id = @gid;
        ";
        cmd.Parameters.AddWithValue("@gid", grnId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            lines.Add(new GoodsReceiptLineItem
            {
                Id = reader.GetString(0),
                GoodsReceiptId = reader.GetString(1),
                PurchaseOrderLineId = reader.IsDBNull(2) ? null : reader.GetString(2),
                ProductId = reader.GetString(3),
                ProductName = reader.GetString(4),
                ReceivedQuantity = Convert.ToDecimal(reader.GetDouble(5)),
                RejectedQuantity = Convert.ToDecimal(reader.GetDouble(6)),
                FreeQuantity = Convert.ToDecimal(reader.GetDouble(7)),
                BatchNumber = reader.GetString(8),
                ManufacturingDate = reader.IsDBNull(9) ? null : reader.GetString(9),
                ExpiryDate = reader.GetString(10),
                UnitCost = Convert.ToDecimal(reader.GetDouble(11)),
                Mrp = Convert.ToDecimal(reader.GetDouble(12)),
                SellingPrice = Convert.ToDecimal(reader.GetDouble(13)),
                TaxRate = Convert.ToDecimal(reader.GetDouble(14)),
                TaxAmount = Convert.ToDecimal(reader.GetDouble(15)),
                LineTotal = Convert.ToDecimal(reader.GetDouble(16)),
                AssignedBatchId = reader.IsDBNull(17) ? null : reader.GetString(17)
            });
        }

        return lines;
    }

    public async Task SaveGoodsReceiptAsync(GoodsReceiptItem grn)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        await using (var cmd = connection.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = @"
                INSERT INTO local_goods_receipts (
                    id, business_id, store_id, supplier_id, supplier_name,
                    purchase_id, receipt_number, vendor_delivery_note, received_date,
                    status, notes, total_amount, received_by, sync_status, created_at
                ) VALUES (
                    @id, @biz, @store, @supp, @sname,
                    @pid, @num, @note, @rdate,
                    @status, @notes, @tot, @rec_by, @sync, @c_at
                )
                ON CONFLICT(id) DO UPDATE SET
                    supplier_id = excluded.supplier_id,
                    supplier_name = excluded.supplier_name,
                    vendor_delivery_note = excluded.vendor_delivery_note,
                    received_date = excluded.received_date,
                    status = excluded.status,
                    notes = excluded.notes,
                    total_amount = excluded.total_amount,
                    sync_status = excluded.sync_status;
            ";

            cmd.Parameters.AddWithValue("@id", grn.Id);
            cmd.Parameters.AddWithValue("@biz", grn.BusinessId);
            cmd.Parameters.AddWithValue("@store", grn.StoreId);
            cmd.Parameters.AddWithValue("@supp", grn.SupplierId);
            cmd.Parameters.AddWithValue("@sname", grn.SupplierName);
            cmd.Parameters.AddWithValue("@pid", (object?)grn.PurchaseOrderId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@num", grn.ReceiptNumber);
            cmd.Parameters.AddWithValue("@note", (object?)grn.VendorDeliveryNote ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@rdate", grn.ReceivedDate);
            cmd.Parameters.AddWithValue("@status", grn.Status);
            cmd.Parameters.AddWithValue("@notes", (object?)grn.Notes ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@tot", (double)grn.TotalAmount);
            cmd.Parameters.AddWithValue("@rec_by", grn.ReceivedBy);
            cmd.Parameters.AddWithValue("@sync", grn.SyncStatus);
            cmd.Parameters.AddWithValue("@c_at", grn.CreatedAt);

            await cmd.ExecuteNonQueryAsync();
        }

        // Delete existing lines and re-insert
        await using (var delCmd = connection.CreateCommand())
        {
            delCmd.Transaction = tx;
            delCmd.CommandText = "DELETE FROM local_goods_receipt_lines WHERE grn_id = @gid;";
            delCmd.Parameters.AddWithValue("@gid", grn.Id);
            await delCmd.ExecuteNonQueryAsync();
        }

        foreach (var line in grn.Lines)
        {
            await using var lCmd = connection.CreateCommand();
            lCmd.Transaction = tx;
            lCmd.CommandText = @"
                INSERT INTO local_goods_receipt_lines (
                    id, grn_id, purchase_line_id, product_id, product_name,
                    received_qty, rejected_qty, free_qty, batch_number, mfg_date,
                    expiry_date, unit_cost, mrp, selling_price, tax_rate,
                    tax_amount, total_amount, assigned_batch_id
                ) VALUES (
                    @id, @gid, @plid, @pid, @pname,
                    @rqty, @rejqty, @fqty, @bnum, @mfg,
                    @exp, @cost, @mrp, @sprice, @trate,
                    @tax, @tot, @bid
                );
            ";

            lCmd.Parameters.AddWithValue("@id", line.Id);
            lCmd.Parameters.AddWithValue("@gid", grn.Id);
            lCmd.Parameters.AddWithValue("@plid", (object?)line.PurchaseOrderLineId ?? DBNull.Value);
            lCmd.Parameters.AddWithValue("@pid", line.ProductId);
            lCmd.Parameters.AddWithValue("@pname", line.ProductName);
            lCmd.Parameters.AddWithValue("@rqty", (double)line.ReceivedQuantity);
            lCmd.Parameters.AddWithValue("@rejqty", (double)line.RejectedQuantity);
            lCmd.Parameters.AddWithValue("@fqty", (double)line.FreeQuantity);
            lCmd.Parameters.AddWithValue("@bnum", line.BatchNumber);
            lCmd.Parameters.AddWithValue("@mfg", (object?)line.ManufacturingDate ?? DBNull.Value);
            lCmd.Parameters.AddWithValue("@exp", line.ExpiryDate);
            lCmd.Parameters.AddWithValue("@cost", (double)line.UnitCost);
            lCmd.Parameters.AddWithValue("@mrp", (double)line.Mrp);
            lCmd.Parameters.AddWithValue("@sprice", (double)line.SellingPrice);
            lCmd.Parameters.AddWithValue("@trate", (double)line.TaxRate);
            lCmd.Parameters.AddWithValue("@tax", (double)line.TaxAmount);
            lCmd.Parameters.AddWithValue("@tot", (double)line.LineTotal);
            lCmd.Parameters.AddWithValue("@bid", (object?)line.AssignedBatchId ?? DBNull.Value);

            await lCmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
    }

    /// <summary>
    /// Transactionally posts a Goods Receipt:
    /// 1. Validates batch number, expiry date (must be in future, not expired), and quantities.
    /// 2. Creates or updates InventoryBatch in cache_batches (checking duplicate batch; if expiry mismatch, rejects).
    /// 3. Updates Product stock in cache_products.
    /// 4. Updates linked Purchase Order line received quantities and updates status (PARTIALLY_RECEIVED or COMPLETED).
    /// 5. Marks GRN as POSTED.
    /// 6. Enqueues GOODS_RECEIPT_POSTED operation into offline_operations table for cloud synchronization.
    /// </summary>
    public async Task<GoodsReceiptItem> PostGoodsReceiptTransactionAsync(GoodsReceiptItem grn, string userId, string deviceId)
    {
        if (grn.Lines.Count == 0)
        {
            throw new InvalidOperationException("Goods receipt must contain at least one line item.");
        }

        // Validate all lines prior to database transaction
        var today = DateTime.UtcNow.Date;
        foreach (var line in grn.Lines)
        {
            if (string.IsNullOrWhiteSpace(line.ProductId))
                throw new InvalidOperationException("Product is required for each received line.");

            if (line.ReceivedQuantity <= 0)
                throw new InvalidOperationException($"Received quantity must be positive for product '{line.ProductName}'.");

            if (line.UnitCost < 0)
                throw new InvalidOperationException($"Purchase rate cannot be negative for product '{line.ProductName}'.");

            if (line.Mrp < 0)
                throw new InvalidOperationException($"MRP cannot be negative for product '{line.ProductName}'.");

            if (line.Mrp > 0 && line.UnitCost > line.Mrp)
                throw new InvalidOperationException($"MRP (₹{line.Mrp:F2}) cannot be less than purchase cost (₹{line.UnitCost:F2}) for product '{line.ProductName}'.");

            if (string.IsNullOrWhiteSpace(line.BatchNumber))
                throw new InvalidOperationException($"Batch number is required for product '{line.ProductName}'.");

            if (string.IsNullOrWhiteSpace(line.ExpiryDate))
                throw new InvalidOperationException($"Expiry date is required for batch '{line.BatchNumber}'.");

            // Validate Expiry Date format and date
            var expClean = line.ExpiryDate.Trim();
            DateTime parsedExp;
            if (expClean.Length == 7 && DateTime.TryParse(expClean + "-01", out var dateMonth))
            {
                parsedExp = dateMonth.AddMonths(1).AddDays(-1);
            }
            else if (DateTime.TryParse(expClean, out var dateFull))
            {
                parsedExp = dateFull;
            }
            else
            {
                throw new InvalidOperationException($"Invalid expiry date format '{line.ExpiryDate}'. Use YYYY-MM.");
            }

            if (parsedExp < today)
            {
                throw new InvalidOperationException($"Cannot receive already expired batch '{line.BatchNumber}' (Expiry: {line.ExpiryDate}).");
            }

            if (!string.IsNullOrWhiteSpace(line.ManufacturingDate))
            {
                if (DateTime.TryParse(line.ManufacturingDate.Trim() + (line.ManufacturingDate.Trim().Length == 7 ? "-01" : ""), out var parsedMfg))
                {
                    if (parsedExp < parsedMfg)
                    {
                        throw new InvalidOperationException($"Expiry date ({line.ExpiryDate}) cannot be before manufacturing date ({line.ManufacturingDate}) for batch '{line.BatchNumber}'.");
                    }
                }
            }
        }

        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        try
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            // 1. Process Lines
            foreach (var line in grn.Lines)
            {
                var normBatch = line.BatchNumber.Trim().ToUpperInvariant();
                var totalQtyToInward = (double)(line.ReceivedQuantity + line.FreeQuantity);

                // Check for duplicate / existing batch in cache_batches
                string? existingBatchId = null;
                string? existingExpiry = null;
                double existingQty = 0;

                await using (var checkCmd = connection.CreateCommand())
                {
                    checkCmd.Transaction = tx;
                    checkCmd.CommandText = @"
                        SELECT id, expiry_date, available_quantity
                        FROM cache_batches
                        WHERE business_id = @biz AND store_id = @store AND product_id = @pid AND UPPER(batch_number) = @bnum
                        LIMIT 1;
                    ";
                    checkCmd.Parameters.AddWithValue("@biz", grn.BusinessId);
                    checkCmd.Parameters.AddWithValue("@store", grn.StoreId);
                    checkCmd.Parameters.AddWithValue("@pid", line.ProductId);
                    checkCmd.Parameters.AddWithValue("@bnum", normBatch);

                    await using var r = await checkCmd.ExecuteReaderAsync();
                    if (await r.ReadAsync())
                    {
                        existingBatchId = r.GetString(0);
                        existingExpiry = r.GetString(1);
                        existingQty = r.GetDouble(2);
                    }
                }

                if (existingBatchId != null)
                {
                    // If expiry mismatch, reject
                    if (!string.Equals(existingExpiry, line.ExpiryDate.Trim(), StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException(
                            $"Batch '{normBatch}' already exists with a different expiry date ({existingExpiry}). Incoming expiry ({line.ExpiryDate}) conflicts.");
                    }

                    // Update existing batch
                    await using var updCmd = connection.CreateCommand();
                    updCmd.Transaction = tx;
                    updCmd.CommandText = @"
                        UPDATE cache_batches
                        SET available_quantity = available_quantity + @qty,
                            selling_price = @sprice,
                            mrp = @mrp,
                            purchase_price = @cost
                        WHERE id = @id;
                    ";
                    updCmd.Parameters.AddWithValue("@qty", totalQtyToInward);
                    updCmd.Parameters.AddWithValue("@sprice", (double)line.SellingPrice);
                    updCmd.Parameters.AddWithValue("@mrp", (double)line.Mrp);
                    updCmd.Parameters.AddWithValue("@cost", (double)line.UnitCost);
                    updCmd.Parameters.AddWithValue("@id", existingBatchId);
                    await updCmd.ExecuteNonQueryAsync();

                    line.AssignedBatchId = existingBatchId;
                }
                else
                {
                    // Create new batch
                    var newBatchId = Guid.NewGuid().ToString();
                    await using var insCmd = connection.CreateCommand();
                    insCmd.Transaction = tx;
                    insCmd.CommandText = @"
                        INSERT INTO cache_batches (
                            id, business_id, store_id, product_id, batch_number, expiry_date,
                            available_quantity, selling_price, mrp, purchase_price, manufacturing_date
                        ) VALUES (
                            @id, @biz, @store, @pid, @bnum, @exp,
                            @qty, @sprice, @mrp, @cost, @mfg
                        );
                    ";
                    insCmd.Parameters.AddWithValue("@id", newBatchId);
                    insCmd.Parameters.AddWithValue("@biz", grn.BusinessId);
                    insCmd.Parameters.AddWithValue("@store", grn.StoreId);
                    insCmd.Parameters.AddWithValue("@pid", line.ProductId);
                    insCmd.Parameters.AddWithValue("@bnum", normBatch);
                    insCmd.Parameters.AddWithValue("@exp", line.ExpiryDate.Trim());
                    insCmd.Parameters.AddWithValue("@qty", totalQtyToInward);
                    insCmd.Parameters.AddWithValue("@sprice", (double)line.SellingPrice);
                    insCmd.Parameters.AddWithValue("@mrp", (double)line.Mrp);
                    insCmd.Parameters.AddWithValue("@cost", (double)line.UnitCost);
                    insCmd.Parameters.AddWithValue("@mfg", (object?)line.ManufacturingDate ?? DBNull.Value);
                    await insCmd.ExecuteNonQueryAsync();

                    line.AssignedBatchId = newBatchId;
                }

                // 2. Increase Product aggregate stock in cache_products
                await using (var prodCmd = connection.CreateCommand())
                {
                    prodCmd.Transaction = tx;
                    prodCmd.CommandText = @"
                        UPDATE cache_products
                        SET current_stock = current_stock + @qty,
                            updated_at = @now
                        WHERE id = @pid;
                    ";
                    prodCmd.Parameters.AddWithValue("@qty", totalQtyToInward);
                    prodCmd.Parameters.AddWithValue("@now", now);
                    prodCmd.Parameters.AddWithValue("@pid", line.ProductId);
                    await prodCmd.ExecuteNonQueryAsync();
                }

                // 3. Update Purchase Order line if linked
                if (!string.IsNullOrEmpty(line.PurchaseOrderLineId))
                {
                    await using var poLineCmd = connection.CreateCommand();
                    poLineCmd.Transaction = tx;
                    poLineCmd.CommandText = @"
                        UPDATE local_purchase_lines
                        SET received_qty = received_qty + @rqty
                        WHERE id = @plid;
                    ";
                    poLineCmd.Parameters.AddWithValue("@rqty", (double)line.ReceivedQuantity);
                    poLineCmd.Parameters.AddWithValue("@plid", line.PurchaseOrderLineId);
                    await poLineCmd.ExecuteNonQueryAsync();
                }
            }

            // 4. Update linked Purchase Order status if linked
            if (!string.IsNullOrEmpty(grn.PurchaseOrderId))
            {
                // Check if all lines are fully received
                bool allFullyReceived = true;
                bool anyReceived = false;

                await using (var poCheckCmd = connection.CreateCommand())
                {
                    poCheckCmd.Transaction = tx;
                    poCheckCmd.CommandText = @"
                        SELECT ordered_qty, received_qty
                        FROM local_purchase_lines
                        WHERE purchase_id = @poid;
                    ";
                    poCheckCmd.Parameters.AddWithValue("@poid", grn.PurchaseOrderId);

                    await using var r = await poCheckCmd.ExecuteReaderAsync();
                    while (await r.ReadAsync())
                    {
                        var ord = r.GetDouble(0);
                        var rec = r.GetDouble(1);
                        if (rec > 0) anyReceived = true;
                        if (rec < ord) allFullyReceived = false;
                    }
                }

                var newPoStatus = allFullyReceived ? "COMPLETED" : (anyReceived ? "PARTIALLY_RECEIVED" : "CONFIRMED");

                await using (var updPoCmd = connection.CreateCommand())
                {
                    updPoCmd.Transaction = tx;
                    updPoCmd.CommandText = "UPDATE local_purchases SET status = @st WHERE id = @poid;";
                    updPoCmd.Parameters.AddWithValue("@st", newPoStatus);
                    updPoCmd.Parameters.AddWithValue("@poid", grn.PurchaseOrderId);
                    await updPoCmd.ExecuteNonQueryAsync();
                }
            }

            // 5. Update GRN status to POSTED
            grn.Status = "POSTED";

            await using (var updGrnCmd = connection.CreateCommand())
            {
                updGrnCmd.Transaction = tx;
                updGrnCmd.CommandText = @"
                    INSERT INTO local_goods_receipts (
                        id, business_id, store_id, supplier_id, supplier_name,
                        purchase_id, receipt_number, vendor_delivery_note, received_date,
                        status, notes, total_amount, received_by, sync_status, created_at
                    ) VALUES (
                        @id, @biz, @store, @supp, @sname,
                        @pid, @num, @note, @rdate,
                        @status, @notes, @tot, @rec_by, @sync, @c_at
                    )
                    ON CONFLICT(id) DO UPDATE SET
                        status = excluded.status,
                        notes = excluded.notes,
                        total_amount = excluded.total_amount,
                        sync_status = excluded.sync_status;
                ";

                updGrnCmd.Parameters.AddWithValue("@id", grn.Id);
                updGrnCmd.Parameters.AddWithValue("@biz", grn.BusinessId);
                updGrnCmd.Parameters.AddWithValue("@store", grn.StoreId);
                updGrnCmd.Parameters.AddWithValue("@supp", grn.SupplierId);
                updGrnCmd.Parameters.AddWithValue("@sname", grn.SupplierName);
                updGrnCmd.Parameters.AddWithValue("@pid", (object?)grn.PurchaseOrderId ?? DBNull.Value);
                updGrnCmd.Parameters.AddWithValue("@num", grn.ReceiptNumber);
                updGrnCmd.Parameters.AddWithValue("@note", (object?)grn.VendorDeliveryNote ?? DBNull.Value);
                updGrnCmd.Parameters.AddWithValue("@rdate", grn.ReceivedDate);
                updGrnCmd.Parameters.AddWithValue("@status", grn.Status);
                updGrnCmd.Parameters.AddWithValue("@notes", (object?)grn.Notes ?? DBNull.Value);
                updGrnCmd.Parameters.AddWithValue("@tot", (double)grn.TotalAmount);
                updGrnCmd.Parameters.AddWithValue("@rec_by", grn.ReceivedBy);
                updGrnCmd.Parameters.AddWithValue("@sync", grn.SyncStatus);
                updGrnCmd.Parameters.AddWithValue("@c_at", grn.CreatedAt);

                await updGrnCmd.ExecuteNonQueryAsync();
            }

            // Save line items
            await using (var delCmd = connection.CreateCommand())
            {
                delCmd.Transaction = tx;
                delCmd.CommandText = "DELETE FROM local_goods_receipt_lines WHERE grn_id = @gid;";
                delCmd.Parameters.AddWithValue("@gid", grn.Id);
                await delCmd.ExecuteNonQueryAsync();
            }

            foreach (var line in grn.Lines)
            {
                await using var lCmd = connection.CreateCommand();
                lCmd.Transaction = tx;
                lCmd.CommandText = @"
                    INSERT INTO local_goods_receipt_lines (
                        id, grn_id, purchase_line_id, product_id, product_name,
                        received_qty, rejected_qty, free_qty, batch_number, mfg_date,
                        expiry_date, unit_cost, mrp, selling_price, tax_rate,
                        tax_amount, total_amount, assigned_batch_id
                    ) VALUES (
                        @id, @gid, @plid, @pid, @pname,
                        @rqty, @rejqty, @fqty, @bnum, @mfg,
                        @exp, @cost, @mrp, @sprice, @trate,
                        @tax, @tot, @bid
                    );
                ";

                lCmd.Parameters.AddWithValue("@id", line.Id);
                lCmd.Parameters.AddWithValue("@gid", grn.Id);
                lCmd.Parameters.AddWithValue("@plid", (object?)line.PurchaseOrderLineId ?? DBNull.Value);
                lCmd.Parameters.AddWithValue("@pid", line.ProductId);
                lCmd.Parameters.AddWithValue("@pname", line.ProductName);
                lCmd.Parameters.AddWithValue("@rqty", (double)line.ReceivedQuantity);
                lCmd.Parameters.AddWithValue("@rejqty", (double)line.RejectedQuantity);
                lCmd.Parameters.AddWithValue("@fqty", (double)line.FreeQuantity);
                lCmd.Parameters.AddWithValue("@bnum", line.BatchNumber);
                lCmd.Parameters.AddWithValue("@mfg", (object?)line.ManufacturingDate ?? DBNull.Value);
                lCmd.Parameters.AddWithValue("@exp", line.ExpiryDate);
                lCmd.Parameters.AddWithValue("@cost", (double)line.UnitCost);
                lCmd.Parameters.AddWithValue("@mrp", (double)line.Mrp);
                lCmd.Parameters.AddWithValue("@sprice", (double)line.SellingPrice);
                lCmd.Parameters.AddWithValue("@trate", (double)line.TaxRate);
                lCmd.Parameters.AddWithValue("@tax", (double)line.TaxAmount);
                lCmd.Parameters.AddWithValue("@tot", (double)line.LineTotal);
                lCmd.Parameters.AddWithValue("@bid", (object?)line.AssignedBatchId ?? DBNull.Value);

                await lCmd.ExecuteNonQueryAsync();
            }

            // 6. Enqueue Offline Operation for Sync
            var payloadObj = new
            {
                grnId = grn.Id,
                storeId = grn.StoreId,
                supplierId = grn.SupplierId,
                purchaseOrderId = grn.PurchaseOrderId,
                receiptNumber = grn.ReceiptNumber,
                vendorDeliveryNote = grn.VendorDeliveryNote,
                receivedDate = grn.ReceivedDate,
                notes = grn.Notes,
                totalAmount = grn.TotalAmount,
                lines = grn.Lines.ConvertAll(l => new
                {
                    purchaseOrderLineId = l.PurchaseOrderLineId,
                    productId = l.ProductId,
                    receivedQuantity = l.ReceivedQuantity,
                    purchaseUnit = "STRIP",
                    conversionFactor = 1,
                    rejectedQuantity = l.RejectedQuantity,
                    freeQuantity = l.FreeQuantity,
                    batchNumber = l.BatchNumber,
                    // The screen accepts YYYY-MM; the server's date fields need a full yyyy-MM-dd.
                    manufacturingDate = string.IsNullOrWhiteSpace(l.ManufacturingDate)
                        ? null
                        : (l.ManufacturingDate.Trim().Length == 7 ? l.ManufacturingDate.Trim() + "-01" : l.ManufacturingDate.Trim()),
                    expiryDate = l.ExpiryDate.Length == 7 ? l.ExpiryDate + "-01" : l.ExpiryDate,
                    unitCost = l.UnitCost,
                    mrp = l.Mrp,
                    sellingPrice = l.SellingPrice,
                    taxRate = l.TaxRate
                })
            };

            var payloadJson = JsonSerializer.Serialize(payloadObj);
            var checksum = CanonicalJson.ComputeChecksum(payloadJson);
            // The operation id IS the receipt id. The server derives its receipt idempotency key from the event
            // id ("GRN-" + eventId), and the screen's direct REST post uses "GRN-" + receipt id, so using one id
            // makes the REST post and this queued operation the same receipt: whichever arrives second is a
            // duplicate instead of a second stock receipt.
            var operationId = grn.Id;
            var idempotencyKey = $"GRN-{grn.Id}";

            // Get next device sequence number
            long nextSeq = 1;
            await using (var seqCmd = connection.CreateCommand())
            {
                seqCmd.Transaction = tx;
                seqCmd.CommandText = "SELECT COALESCE(MAX(device_sequence_number), 0) + 1 FROM offline_operations WHERE device_id = @dev;";
                seqCmd.Parameters.AddWithValue("@dev", deviceId);
                var scalar = await seqCmd.ExecuteScalarAsync();
                if (scalar != null && scalar != DBNull.Value)
                {
                    nextSeq = Convert.ToInt64(scalar);
                }
            }

            await using (var opCmd = connection.CreateCommand())
            {
                opCmd.Transaction = tx;
                opCmd.CommandText = @"
                    INSERT INTO offline_operations (
                        operation_id, business_id, store_id, device_id, user_id,
                        device_sequence_number, event_type, event_version,
                        payload_json, payload_checksum, idempotency_key,
                        status, retry_count, created_at
                    ) VALUES (
                        @op_id, @biz, @store, @dev, @user,
                        @seq, 'GOODS_RECEIPT_POSTED', 1,
                        @p_json, @p_check, @idemp,
                        'PENDING', 0, @now
                    );
                ";

                opCmd.Parameters.AddWithValue("@op_id", operationId);
                opCmd.Parameters.AddWithValue("@biz", grn.BusinessId);
                opCmd.Parameters.AddWithValue("@store", grn.StoreId);
                opCmd.Parameters.AddWithValue("@dev", deviceId);
                opCmd.Parameters.AddWithValue("@user", userId);
                opCmd.Parameters.AddWithValue("@seq", nextSeq);
                opCmd.Parameters.AddWithValue("@p_json", payloadJson);
                opCmd.Parameters.AddWithValue("@p_check", checksum);
                opCmd.Parameters.AddWithValue("@idemp", idempotencyKey);
                opCmd.Parameters.AddWithValue("@now", now);

                await opCmd.ExecuteNonQueryAsync();
            }

            await tx.CommitAsync();
            return grn;
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    #endregion
}
