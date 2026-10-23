using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Sales;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Data.Repositories;

public interface ISalesRepository
{
    Task<SaleRecord> CreateSaleAsync(SaleRecord sale);
    Task<IReadOnlyList<SaleRecord>> GetRecentSalesAsync(string businessId, string? storeId = null, int limit = 50);
    Task<SaleRecord?> GetSaleByIdAsync(string id);
    Task<IReadOnlyList<SaleItemRecord>> GetSaleItemsAsync(string saleId);
    Task UpdateSaleSyncStatusAsync(string saleId, string syncStatus);
    Task<string> GenerateNextInvoiceNumberAsync(string storeCode);
    Task<IReadOnlyList<CustomerItem>> GetCustomersAsync(string businessId, string? search = null);
    Task<CustomerItem?> GetCustomerByIdAsync(string businessId, string id);
    Task UpsertCustomerAsync(CustomerItem customer);
}

public sealed class SalesRepository : ISalesRepository
{
    private readonly DatabaseContext _dbContext;

    public SalesRepository(DatabaseContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<string> GenerateNextInvoiceNumberAsync(string storeCode)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        var today = DateTime.UtcNow.ToString("yyyyMMdd");
        var prefix = string.IsNullOrWhiteSpace(storeCode) ? $"INV-{today}" : $"{storeCode.ToUpperInvariant()}-{today}";

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM local_sales WHERE invoice_number LIKE @prefix;";
        cmd.Parameters.AddWithValue("@prefix", $"{prefix}-%");

        var count = Convert.ToInt32(await cmd.ExecuteScalarAsync());
        return $"{prefix}-{(count + 1):D4}";
    }

    public async Task<SaleRecord> CreateSaleAsync(SaleRecord sale)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        // 1. Insert header
        await using var headerCmd = connection.CreateCommand();
        headerCmd.Transaction = tx;
        headerCmd.CommandText = @"
            INSERT INTO local_sales (
                id, business_id, store_id, device_id, user_id,
                invoice_number, customer_name, customer_phone,
                subtotal, tax_amount, discount_amount, total_amount,
                payment_method, payment_status, sync_status, created_at
            ) VALUES (
                @id, @biz, @store, @device, @user,
                @inv, @cname, @cphone,
                @sub, @tax, @disc, @total,
                @pm, @ps, @ss, @now
            );
        ";
        headerCmd.Parameters.AddWithValue("@id", sale.Id);
        headerCmd.Parameters.AddWithValue("@biz", sale.BusinessId);
        headerCmd.Parameters.AddWithValue("@store", sale.StoreId);
        headerCmd.Parameters.AddWithValue("@device", sale.DeviceId);
        headerCmd.Parameters.AddWithValue("@user", sale.UserId);
        headerCmd.Parameters.AddWithValue("@inv", sale.InvoiceNumber);
        headerCmd.Parameters.AddWithValue("@cname", (object?)sale.CustomerName ?? DBNull.Value);
        headerCmd.Parameters.AddWithValue("@cphone", (object?)sale.CustomerPhone ?? DBNull.Value);
        headerCmd.Parameters.AddWithValue("@sub", (double)sale.Subtotal);
        headerCmd.Parameters.AddWithValue("@tax", (double)sale.TaxAmount);
        headerCmd.Parameters.AddWithValue("@disc", (double)sale.DiscountAmount);
        headerCmd.Parameters.AddWithValue("@total", (double)sale.TotalAmount);
        headerCmd.Parameters.AddWithValue("@pm", sale.PaymentMethod);
        headerCmd.Parameters.AddWithValue("@ps", sale.PaymentStatus);
        headerCmd.Parameters.AddWithValue("@ss", sale.SyncStatus);
        headerCmd.Parameters.AddWithValue("@now", sale.CreatedAt);
        await headerCmd.ExecuteNonQueryAsync();

        // 2. Insert items
        foreach (var item in sale.Items)
        {
            await using var itemCmd = connection.CreateCommand();
            itemCmd.Transaction = tx;
            itemCmd.CommandText = @"
                INSERT INTO local_sale_items (
                    id, sale_id, product_id, product_name, batch_id, batch_number,
                    quantity, unit_price, tax_rate, taxable_amount, tax_amount, total_amount
                ) VALUES (
                    @id, @sid, @pid, @pname, @bid, @bnum,
                    @qty, @price, @tr, @txa, @tax, @total
                );
            ";
            itemCmd.Parameters.AddWithValue("@id", item.Id);
            itemCmd.Parameters.AddWithValue("@sid", sale.Id);
            itemCmd.Parameters.AddWithValue("@pid", item.ProductId);
            itemCmd.Parameters.AddWithValue("@pname", item.ProductName);
            itemCmd.Parameters.AddWithValue("@bid", (object?)item.BatchId ?? DBNull.Value);
            itemCmd.Parameters.AddWithValue("@bnum", (object?)item.BatchNumber ?? DBNull.Value);
            itemCmd.Parameters.AddWithValue("@qty", item.Quantity);
            itemCmd.Parameters.AddWithValue("@price", (double)item.UnitPrice);
            itemCmd.Parameters.AddWithValue("@tr", (double)item.TaxRate);
            itemCmd.Parameters.AddWithValue("@txa", (double)item.TaxableAmount);
            itemCmd.Parameters.AddWithValue("@tax", (double)item.TaxAmount);
            itemCmd.Parameters.AddWithValue("@total", (double)item.TotalAmount);
            await itemCmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
        return sale;
    }

    public async Task<IReadOnlyList<SaleRecord>> GetRecentSalesAsync(string businessId, string? storeId = null, int limit = 50)
    {
        var list = new List<SaleRecord>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        if (string.IsNullOrEmpty(storeId))
        {
            cmd.CommandText = @"
                SELECT id, business_id, store_id, device_id, user_id,
                       invoice_number, customer_name, customer_phone,
                       subtotal, tax_amount, discount_amount, total_amount,
                       payment_method, payment_status, sync_status, created_at
                FROM local_sales
                WHERE business_id = @biz
                ORDER BY created_at DESC
                LIMIT @lim;
            ";
            cmd.Parameters.AddWithValue("@biz", businessId);
        }
        else
        {
            cmd.CommandText = @"
                SELECT id, business_id, store_id, device_id, user_id,
                       invoice_number, customer_name, customer_phone,
                       subtotal, tax_amount, discount_amount, total_amount,
                       payment_method, payment_status, sync_status, created_at
                FROM local_sales
                WHERE business_id = @biz AND store_id = @store
                ORDER BY created_at DESC
                LIMIT @lim;
            ";
            cmd.Parameters.AddWithValue("@biz", businessId);
            cmd.Parameters.AddWithValue("@store", storeId);
        }
        cmd.Parameters.AddWithValue("@lim", limit);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapSale(reader));
        }

        // Load items for each sale
        foreach (var sale in list)
        {
            sale.Items.AddRange(await GetSaleItemsInternalAsync(connection, sale.Id));
        }

        return list;
    }

    public async Task<SaleRecord?> GetSaleByIdAsync(string id)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, store_id, device_id, user_id,
                   invoice_number, customer_name, customer_phone,
                   subtotal, tax_amount, discount_amount, total_amount,
                   payment_method, payment_status, sync_status, created_at
            FROM local_sales
            WHERE id = @id LIMIT 1;
        ";
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            var sale = MapSale(reader);
            sale.Items.AddRange(await GetSaleItemsInternalAsync(connection, sale.Id));
            return sale;
        }

        return null;
    }

    public async Task<IReadOnlyList<SaleItemRecord>> GetSaleItemsAsync(string saleId)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        return await GetSaleItemsInternalAsync(connection, saleId);
    }

    private static async Task<List<SaleItemRecord>> GetSaleItemsInternalAsync(SqliteConnection connection, string saleId)
    {
        var items = new List<SaleItemRecord>();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, sale_id, product_id, product_name, batch_id, batch_number,
                   quantity, unit_price, tax_rate, taxable_amount, tax_amount, total_amount
            FROM local_sale_items
            WHERE sale_id = @sid;
        ";
        cmd.Parameters.AddWithValue("@sid", saleId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            items.Add(new SaleItemRecord
            {
                Id = reader.GetString(0),
                SaleId = reader.GetString(1),
                ProductId = reader.GetString(2),
                ProductName = reader.GetString(3),
                BatchId = reader.IsDBNull(4) ? null : reader.GetString(4),
                BatchNumber = reader.IsDBNull(5) ? null : reader.GetString(5),
                Quantity = reader.GetDouble(6),
                UnitPrice = Convert.ToDecimal(reader.GetDouble(7)),
                TaxRate = Convert.ToDecimal(reader.GetDouble(8)),
                TaxableAmount = Convert.ToDecimal(reader.GetDouble(9)),
                TaxAmount = Convert.ToDecimal(reader.GetDouble(10)),
                TotalAmount = Convert.ToDecimal(reader.GetDouble(11))
            });
        }

        return items;
    }

    public async Task UpdateSaleSyncStatusAsync(string saleId, string syncStatus)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "UPDATE local_sales SET sync_status = @ss WHERE id = @id;";
        cmd.Parameters.AddWithValue("@ss", syncStatus);
        cmd.Parameters.AddWithValue("@id", saleId);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<IReadOnlyList<CustomerItem>> GetCustomersAsync(string businessId, string? search = null)
    {
        var list = new List<CustomerItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        var sql = @"
            SELECT id, business_id, customer_code, full_name, phone, email, gstin, status, updated_at
            FROM cache_customers
            WHERE business_id = @biz
        ";

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (full_name LIKE @q OR phone LIKE @q OR customer_code LIKE @q OR gstin LIKE @q)";
            cmd.Parameters.AddWithValue("@q", $"%{search.Trim()}%");
        }

        sql += " ORDER BY full_name ASC;";
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("@biz", businessId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new CustomerItem
            {
                Id = reader.GetString(0),
                BusinessId = reader.GetString(1),
                CustomerCode = reader.GetString(2),
                FullName = reader.GetString(3),
                Phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                Email = reader.IsDBNull(5) ? null : reader.GetString(5),
                Gstin = reader.IsDBNull(6) ? null : reader.GetString(6),
                Status = reader.GetString(7),
                UpdatedAt = reader.GetInt64(8)
            });
        }

        return list;
    }

    public async Task<CustomerItem?> GetCustomerByIdAsync(string businessId, string id)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, customer_code, full_name, phone, email, gstin, status, updated_at
            FROM cache_customers
            WHERE business_id = @biz AND id = @id LIMIT 1;
        ";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new CustomerItem
            {
                Id = reader.GetString(0),
                BusinessId = reader.GetString(1),
                CustomerCode = reader.GetString(2),
                FullName = reader.GetString(3),
                Phone = reader.IsDBNull(4) ? null : reader.GetString(4),
                Email = reader.IsDBNull(5) ? null : reader.GetString(5),
                Gstin = reader.IsDBNull(6) ? null : reader.GetString(6),
                Status = reader.GetString(7),
                UpdatedAt = reader.GetInt64(8)
            };
        }

        return null;
    }

    public async Task UpsertCustomerAsync(CustomerItem customer)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO cache_customers (
                id, business_id, customer_code, full_name, phone, email, gstin, status, updated_at
            ) VALUES (
                @id, @biz, @code, @name, @phone, @email, @gstin, @status, @upd
            )
            ON CONFLICT(id) DO UPDATE SET
                customer_code = excluded.customer_code,
                full_name = excluded.full_name,
                phone = excluded.phone,
                email = excluded.email,
                gstin = excluded.gstin,
                status = excluded.status,
                updated_at = excluded.updated_at;
        ";

        cmd.Parameters.AddWithValue("@id", customer.Id);
        cmd.Parameters.AddWithValue("@biz", customer.BusinessId);
        cmd.Parameters.AddWithValue("@code", customer.CustomerCode);
        cmd.Parameters.AddWithValue("@name", customer.FullName);
        cmd.Parameters.AddWithValue("@phone", (object?)customer.Phone ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@email", (object?)customer.Email ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@gstin", (object?)customer.Gstin ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@status", customer.Status);
        cmd.Parameters.AddWithValue("@upd", customer.UpdatedAt > 0 ? customer.UpdatedAt : DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        await cmd.ExecuteNonQueryAsync();
    }

    private static SaleRecord MapSale(SqliteDataReader reader)
    {
        return new SaleRecord
        {
            Id = reader.GetString(0),
            BusinessId = reader.GetString(1),
            StoreId = reader.GetString(2),
            DeviceId = reader.GetString(3),
            UserId = reader.GetString(4),
            InvoiceNumber = reader.GetString(5),
            CustomerName = reader.IsDBNull(6) ? null : reader.GetString(6),
            CustomerPhone = reader.IsDBNull(7) ? null : reader.GetString(7),
            Subtotal = Convert.ToDecimal(reader.GetDouble(8)),
            TaxAmount = Convert.ToDecimal(reader.GetDouble(9)),
            DiscountAmount = Convert.ToDecimal(reader.GetDouble(10)),
            TotalAmount = Convert.ToDecimal(reader.GetDouble(11)),
            PaymentMethod = reader.GetString(12),
            PaymentStatus = reader.GetString(13),
            SyncStatus = reader.GetString(14),
            CreatedAt = reader.GetInt64(15)
        };
    }
}
