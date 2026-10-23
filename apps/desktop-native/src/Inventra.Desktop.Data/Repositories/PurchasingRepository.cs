using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Purchasing;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Data.Repositories;

public interface IPurchasingRepository
{
    // Supplier Management
    Task<IReadOnlyList<SupplierItem>> GetSuppliersAsync(string businessId);
    Task<SupplierItem?> GetSupplierByIdAsync(string businessId, string id);
    Task UpsertSupplierAsync(SupplierItem supplier);

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

    public async Task<IReadOnlyList<SupplierItem>> GetSuppliersAsync(string businessId)
    {
        var list = new List<SupplierItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, supplier_code, legal_name, trade_name, gstin,
                   contact_person, phone, email, address, city, state, postal_code,
                   payment_terms_days, status, updated_at
            FROM cache_suppliers
            WHERE business_id = @biz
            ORDER BY legal_name ASC;
        ";
        cmd.Parameters.AddWithValue("@biz", businessId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new SupplierItem
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
                UpdatedAt = reader.GetInt64(15)
            });
        }

        return list;
    }

    public async Task<SupplierItem?> GetSupplierByIdAsync(string businessId, string id)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, supplier_code, legal_name, trade_name, gstin,
                   contact_person, phone, email, address, city, state, postal_code,
                   payment_terms_days, status, updated_at
            FROM cache_suppliers
            WHERE business_id = @biz AND id = @id LIMIT 1;
        ";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new SupplierItem
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
                UpdatedAt = reader.GetInt64(15)
            };
        }

        return null;
    }

    public async Task UpsertSupplierAsync(SupplierItem supplier)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO cache_suppliers (
                id, business_id, supplier_code, legal_name, trade_name, gstin,
                contact_person, phone, email, address, city, state, postal_code,
                payment_terms_days, status, updated_at
            ) VALUES (
                @id, @biz, @code, @name, @trade, @gstin,
                @contact, @phone, @email, @addr, @city, @state, @zip,
                @terms, @status, @upd
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
                updated_at = excluded.updated_at;
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

        await cmd.ExecuteNonQueryAsync();
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
                    manufacturingDate = l.ManufacturingDate,
                    expiryDate = l.ExpiryDate.Length == 7 ? l.ExpiryDate + "-01" : l.ExpiryDate,
                    unitCost = l.UnitCost,
                    mrp = l.Mrp,
                    sellingPrice = l.SellingPrice,
                    taxRate = l.TaxRate
                })
            };

            var payloadJson = JsonSerializer.Serialize(payloadObj);
            var checksum = DatabaseContext.ComputeSha256(payloadJson);
            var operationId = Guid.NewGuid().ToString();
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
