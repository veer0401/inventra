using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Inventory;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Data.Repositories;

public interface IProductRepository
{
    Task<IReadOnlyList<ProductItem>> GetAllProductsAsync();
    Task<IReadOnlyList<ProductItem>> GetProductsByBusinessAsync(string businessId, string? storeId = null);
    Task<IReadOnlyList<ProductItem>> SearchProductsAsync(string query);
    Task<IReadOnlyList<ProductItem>> SearchProductsByBusinessAsync(string businessId, string? storeId, string query);
    Task<ProductItem?> GetProductByIdAsync(string id);
    Task<IReadOnlyList<BatchItem>> GetBatchesForProductAsync(string productId);
    Task<IReadOnlyList<BatchItem>> GetAllBatchesAsync(string businessId, string? storeId = null, string? search = null, bool expiringSoonOnly = false, bool expiredOnly = false);
    Task<int> GetProductCountAsync(string? businessId = null);
    Task UpsertProductAsync(ProductItem product);
    Task UpdateProductAsync(ProductItem product);
    Task UpsertBatchAsync(BatchItem batch);
    Task DeductStockForSaleAsync(string productId, string? batchId, double quantity);
    Task AddStockAsync(string productId, string? batchId, double quantity);
}

public sealed class ProductRepository : IProductRepository
{
    private readonly DatabaseContext _dbContext;

    public ProductRepository(DatabaseContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProductItem>> GetAllProductsAsync()
    {
        var list = new List<ProductItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, store_id, code, name, generic_name, dosage_form,
                   strength, base_unit, selling_unit, units_per_selling_unit,
                   tax_rate, is_tax_inclusive, prescription_required,
                   selling_price, mrp, current_stock, updated_at
            FROM cache_products
            ORDER BY name ASC;
        ";

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapProduct(reader));
        }

        return list;
    }

    public async Task<IReadOnlyList<ProductItem>> GetProductsByBusinessAsync(string businessId, string? storeId = null)
    {
        var list = new List<ProductItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        if (string.IsNullOrEmpty(storeId))
        {
            cmd.CommandText = @"
                SELECT id, business_id, store_id, code, name, generic_name, dosage_form,
                       strength, base_unit, selling_unit, units_per_selling_unit,
                       tax_rate, is_tax_inclusive, prescription_required,
                       selling_price, mrp, current_stock, updated_at
                FROM cache_products
                WHERE business_id = @biz
                ORDER BY name ASC;
            ";
            cmd.Parameters.AddWithValue("@biz", businessId);
        }
        else
        {
            cmd.CommandText = @"
                SELECT id, business_id, store_id, code, name, generic_name, dosage_form,
                       strength, base_unit, selling_unit, units_per_selling_unit,
                       tax_rate, is_tax_inclusive, prescription_required,
                       selling_price, mrp, current_stock, updated_at
                FROM cache_products
                WHERE business_id = @biz AND (store_id = @store OR store_id IS NULL)
                ORDER BY name ASC;
            ";
            cmd.Parameters.AddWithValue("@biz", businessId);
            cmd.Parameters.AddWithValue("@store", storeId);
        }

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapProduct(reader));
        }

        return list;
    }

    public async Task<IReadOnlyList<ProductItem>> SearchProductsAsync(string query)
    {
        var list = new List<ProductItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, store_id, code, name, generic_name, dosage_form,
                   strength, base_unit, selling_unit, units_per_selling_unit,
                   tax_rate, is_tax_inclusive, prescription_required,
                   selling_price, mrp, current_stock, updated_at
            FROM cache_products
            WHERE name LIKE @q OR generic_name LIKE @q OR code LIKE @q
            ORDER BY name ASC;
        ";
        cmd.Parameters.AddWithValue("@q", $"%{query}%");

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapProduct(reader));
        }

        return list;
    }

    public async Task<IReadOnlyList<ProductItem>> SearchProductsByBusinessAsync(string businessId, string? storeId, string query)
    {
        var list = new List<ProductItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, store_id, code, name, generic_name, dosage_form,
                   strength, base_unit, selling_unit, units_per_selling_unit,
                   tax_rate, is_tax_inclusive, prescription_required,
                   selling_price, mrp, current_stock, updated_at
            FROM cache_products
            WHERE business_id = @biz
              AND (name LIKE @q OR generic_name LIKE @q OR code LIKE @q)
            ORDER BY name ASC;
        ";
        cmd.Parameters.AddWithValue("@biz", businessId);
        cmd.Parameters.AddWithValue("@q", $"%{query}%");

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapProduct(reader));
        }

        return list;
    }

    public async Task<ProductItem?> GetProductByIdAsync(string id)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, store_id, code, name, generic_name, dosage_form,
                   strength, base_unit, selling_unit, units_per_selling_unit,
                   tax_rate, is_tax_inclusive, prescription_required,
                   selling_price, mrp, current_stock, updated_at
            FROM cache_products
            WHERE id = @id LIMIT 1;
        ";
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapProduct(reader);
        }

        return null;
    }

    public async Task<IReadOnlyList<BatchItem>> GetBatchesForProductAsync(string productId)
    {
        var list = new List<BatchItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT id, business_id, store_id, product_id, batch_number, expiry_date,
                   available_quantity, selling_price, mrp,
                   COALESCE(purchase_price, 0.0), manufacturing_date
            FROM cache_batches
            WHERE product_id = @pid
            ORDER BY expiry_date ASC;
        ";
        cmd.Parameters.AddWithValue("@pid", productId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new BatchItem
            {
                Id = reader.GetString(0),
                BusinessId = reader.GetString(1),
                StoreId = reader.GetString(2),
                ProductId = reader.GetString(3),
                BatchNumber = reader.GetString(4),
                ExpiryDate = reader.GetString(5),
                AvailableQuantity = reader.GetDouble(6),
                SellingPrice = Convert.ToDecimal(reader.GetDouble(7)),
                Mrp = Convert.ToDecimal(reader.GetDouble(8)),
                PurchasePrice = Convert.ToDecimal(reader.GetDouble(9)),
                ManufacturingDate = reader.IsDBNull(10) ? null : reader.GetString(10)
            });
        }

        return list;
    }

    public async Task<int> GetProductCountAsync(string? businessId = null)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        if (string.IsNullOrEmpty(businessId))
        {
            cmd.CommandText = "SELECT COUNT(*) FROM cache_products;";
        }
        else
        {
            cmd.CommandText = "SELECT COUNT(*) FROM cache_products WHERE business_id = @biz;";
            cmd.Parameters.AddWithValue("@biz", businessId);
        }
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    public async Task DeductStockForSaleAsync(string productId, string? batchId, double quantity)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        await DeductStockCoreAsync(connection, tx, productId, batchId, quantity);

        await tx.CommitAsync();
    }

    /// <summary>
    /// Pack size and selling unit of a product, read inside the caller's transaction. Quantities entered on the
    /// screens are in selling units; stock is kept in base units, so they are multiplied by this factor.
    /// An unknown product is treated as 1:1.
    /// </summary>
    internal static async Task<(int Factor, string SellingUnit)> GetPackInfoAsync(
        SqliteConnection connection, SqliteTransaction? tx, string productId)
    {
        await using var cmd = connection.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = "SELECT units_per_selling_unit, selling_unit FROM cache_products WHERE id = @p;";
        cmd.Parameters.AddWithValue("@p", productId);
        await using var r = await cmd.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return (1, "STRIP");
        var unit = r.IsDBNull(1) || string.IsNullOrWhiteSpace(r.GetString(1)) ? "STRIP" : r.GetString(1);
        return (Core.Domain.Inventory.StockUnits.ConversionFactor(r.GetDouble(0)), unit);
    }

    /// <summary>
    /// Stock deduction shared with the atomic "sale + outbox" write in <see cref="SalesRepository"/>, so
    /// both paths apply identical rules inside the caller's transaction.
    /// </summary>
    internal static async Task DeductStockCoreAsync(
        SqliteConnection connection, SqliteTransaction tx, string productId, string? batchId, double quantity)
    {
        // 1. Reduce overall product stock
        await using var pCmd = connection.CreateCommand();
        pCmd.Transaction = tx;
        pCmd.CommandText = "UPDATE cache_products SET current_stock = MAX(0.0, current_stock - @qty) WHERE id = @pid;";
        pCmd.Parameters.AddWithValue("@qty", quantity);
        pCmd.Parameters.AddWithValue("@pid", productId);
        await pCmd.ExecuteNonQueryAsync();

        // 2. Reduce batch stock if batch specified, or deduct from FEFO batches
        if (!string.IsNullOrEmpty(batchId))
        {
            await using var bCmd = connection.CreateCommand();
            bCmd.Transaction = tx;
            bCmd.CommandText = "UPDATE cache_batches SET available_quantity = MAX(0.0, available_quantity - @qty) WHERE id = @bid;";
            bCmd.Parameters.AddWithValue("@qty", quantity);
            bCmd.Parameters.AddWithValue("@bid", batchId);
            await bCmd.ExecuteNonQueryAsync();
        }
        else
        {
            // FEFO fallback: deduct from earliest expiry batch
            await using var bCmd = connection.CreateCommand();
            bCmd.Transaction = tx;
            bCmd.CommandText = @"
                UPDATE cache_batches 
                SET available_quantity = MAX(0.0, available_quantity - @qty) 
                WHERE id = (
                    SELECT id FROM cache_batches 
                    WHERE product_id = @pid AND available_quantity > 0 
                    ORDER BY expiry_date ASC LIMIT 1
                );
            ";
            bCmd.Parameters.AddWithValue("@qty", quantity);
            bCmd.Parameters.AddWithValue("@pid", productId);
            await bCmd.ExecuteNonQueryAsync();
        }
    }

    public async Task AddStockAsync(string productId, string? batchId, double quantity)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        // 1. Add overall product stock
        await using var pCmd = connection.CreateCommand();
        pCmd.Transaction = tx;
        pCmd.CommandText = "UPDATE cache_products SET current_stock = current_stock + @qty WHERE id = @pid;";
        pCmd.Parameters.AddWithValue("@qty", quantity);
        pCmd.Parameters.AddWithValue("@pid", productId);
        await pCmd.ExecuteNonQueryAsync();

        // 2. Add to batch
        if (!string.IsNullOrEmpty(batchId))
        {
            await using var bCmd = connection.CreateCommand();
            bCmd.Transaction = tx;
            bCmd.CommandText = "UPDATE cache_batches SET available_quantity = available_quantity + @qty WHERE id = @bid;";
            bCmd.Parameters.AddWithValue("@qty", quantity);
            bCmd.Parameters.AddWithValue("@bid", batchId);
            await bCmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
    }

    public async Task UpsertProductAsync(ProductItem product)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO cache_products (
                id, business_id, store_id, code, name, generic_name, dosage_form,
                strength, base_unit, selling_unit, units_per_selling_unit,
                tax_rate, is_tax_inclusive, prescription_required,
                selling_price, mrp, current_stock, updated_at
            ) VALUES (
                @id, @biz, @store, @code, @name, @gen, @form,
                @str, @bunit, @sunit, @units,
                @tax, @incl, @rx,
                @price, @mrp, @stock, @upd
            )
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                generic_name = excluded.generic_name,
                dosage_form = excluded.dosage_form,
                strength = excluded.strength,
                selling_price = excluded.selling_price,
                mrp = excluded.mrp,
                current_stock = excluded.current_stock,
                updated_at = excluded.updated_at;
        ";

        cmd.Parameters.AddWithValue("@id", product.Id);
        cmd.Parameters.AddWithValue("@biz", product.BusinessId);
        cmd.Parameters.AddWithValue("@store", (object?)product.StoreId ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@code", product.Code);
        cmd.Parameters.AddWithValue("@name", product.Name);
        cmd.Parameters.AddWithValue("@gen", (object?)product.GenericName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@form", (object?)product.DosageForm ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@str", (object?)product.Strength ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@bunit", product.BaseUnit);
        cmd.Parameters.AddWithValue("@sunit", product.SellingUnit);
        cmd.Parameters.AddWithValue("@units", product.UnitsPerSellingUnit);
        cmd.Parameters.AddWithValue("@tax", (double)product.TaxRate);
        cmd.Parameters.AddWithValue("@incl", product.IsTaxInclusive ? 1 : 0);
        cmd.Parameters.AddWithValue("@rx", product.PrescriptionRequired ? 1 : 0);
        cmd.Parameters.AddWithValue("@price", (double)product.SellingPrice);
        cmd.Parameters.AddWithValue("@mrp", (double)product.Mrp);
        cmd.Parameters.AddWithValue("@stock", product.CurrentStock);
        cmd.Parameters.AddWithValue("@upd", product.UpdatedAt);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task UpsertBatchAsync(BatchItem batch)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO cache_batches (
                id, business_id, store_id, product_id, batch_number, expiry_date,
                available_quantity, selling_price, mrp, purchase_price, manufacturing_date
            ) VALUES (
                @id, @biz, @store, @pid, @bnum, @exp,
                @qty, @price, @mrp, @cost, @mfg
            )
            ON CONFLICT(id) DO UPDATE SET
                available_quantity = excluded.available_quantity,
                selling_price = excluded.selling_price,
                mrp = excluded.mrp,
                purchase_price = excluded.purchase_price,
                manufacturing_date = excluded.manufacturing_date;
        ";

        cmd.Parameters.AddWithValue("@id", batch.Id);
        cmd.Parameters.AddWithValue("@biz", batch.BusinessId);
        cmd.Parameters.AddWithValue("@store", batch.StoreId);
        cmd.Parameters.AddWithValue("@pid", batch.ProductId);
        cmd.Parameters.AddWithValue("@bnum", batch.BatchNumber);
        cmd.Parameters.AddWithValue("@exp", batch.ExpiryDate);
        cmd.Parameters.AddWithValue("@qty", batch.AvailableQuantity);
        cmd.Parameters.AddWithValue("@price", (double)batch.SellingPrice);
        cmd.Parameters.AddWithValue("@mrp", (double)batch.Mrp);
        cmd.Parameters.AddWithValue("@cost", (double)batch.PurchasePrice);
        cmd.Parameters.AddWithValue("@mfg", (object?)batch.ManufacturingDate ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<IReadOnlyList<BatchItem>> GetAllBatchesAsync(
        string businessId,
        string? storeId = null,
        string? search = null,
        bool expiringSoonOnly = false,
        bool expiredOnly = false)
    {
        var list = new List<BatchItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        var sql = @"
            SELECT b.id, b.business_id, b.store_id, b.product_id, b.batch_number, b.expiry_date,
                   b.available_quantity, b.selling_price, b.mrp,
                   COALESCE(b.purchase_price, 0.0), b.manufacturing_date,
                   p.name, p.code
            FROM cache_batches b
            LEFT JOIN cache_products p ON b.product_id = p.id
            WHERE b.business_id = @biz
        ";

        if (!string.IsNullOrEmpty(storeId))
        {
            sql += " AND b.store_id = @store";
            cmd.Parameters.AddWithValue("@store", storeId);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            sql += " AND (b.batch_number LIKE @q OR p.name LIKE @q OR p.code LIKE @q)";
            cmd.Parameters.AddWithValue("@q", $"%{search.Trim()}%");
        }

        sql += " ORDER BY b.expiry_date ASC;";
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("@biz", businessId);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var item = new BatchItem
            {
                Id = reader.GetString(0),
                BusinessId = reader.GetString(1),
                StoreId = reader.GetString(2),
                ProductId = reader.GetString(3),
                BatchNumber = reader.GetString(4),
                ExpiryDate = reader.GetString(5),
                AvailableQuantity = reader.GetDouble(6),
                SellingPrice = Convert.ToDecimal(reader.GetDouble(7)),
                Mrp = Convert.ToDecimal(reader.GetDouble(8)),
                PurchasePrice = Convert.ToDecimal(reader.GetDouble(9)),
                ManufacturingDate = reader.IsDBNull(10) ? null : reader.GetString(10),
                ProductName = reader.IsDBNull(11) ? "Unknown Product" : reader.GetString(11),
                ProductCode = reader.IsDBNull(12) ? string.Empty : reader.GetString(12)
            };

            if (expiredOnly && !item.IsExpired) continue;
            if (expiringSoonOnly && !item.IsNearExpiry) continue;

            list.Add(item);
        }

        return list;
    }

    public async Task UpdateProductAsync(ProductItem product)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE cache_products SET
                name = @name,
                generic_name = @generic,
                dosage_form = @form,
                strength = @str,
                base_unit = @bunit,
                selling_unit = @sunit,
                units_per_selling_unit = @units,
                tax_rate = @tax,
                is_tax_inclusive = @inclusive,
                prescription_required = @rx,
                selling_price = @price,
                mrp = @mrp,
                updated_at = @upd
            WHERE id = @id;
        ";

        cmd.Parameters.AddWithValue("@id", product.Id);
        cmd.Parameters.AddWithValue("@name", product.Name);
        cmd.Parameters.AddWithValue("@generic", (object?)product.GenericName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@form", (object?)product.DosageForm ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@str", (object?)product.Strength ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@bunit", product.BaseUnit);
        cmd.Parameters.AddWithValue("@sunit", product.SellingUnit);
        cmd.Parameters.AddWithValue("@units", product.UnitsPerSellingUnit);
        cmd.Parameters.AddWithValue("@tax", (double)product.TaxRate);
        cmd.Parameters.AddWithValue("@inclusive", product.IsTaxInclusive ? 1 : 0);
        cmd.Parameters.AddWithValue("@rx", product.PrescriptionRequired ? 1 : 0);
        cmd.Parameters.AddWithValue("@price", (double)product.SellingPrice);
        cmd.Parameters.AddWithValue("@mrp", (double)product.Mrp);
        cmd.Parameters.AddWithValue("@upd", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

        await cmd.ExecuteNonQueryAsync();
    }

    private static ProductItem MapProduct(SqliteDataReader reader)
    {
        return new ProductItem
        {
            Id = reader.GetString(0),
            BusinessId = reader.GetString(1),
            StoreId = reader.IsDBNull(2) ? null : reader.GetString(2),
            Code = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
            Name = reader.GetString(4),
            GenericName = reader.IsDBNull(5) ? null : reader.GetString(5),
            DosageForm = reader.IsDBNull(6) ? null : reader.GetString(6),
            Strength = reader.IsDBNull(7) ? null : reader.GetString(7),
            BaseUnit = reader.GetString(8),
            SellingUnit = reader.GetString(9),
            UnitsPerSellingUnit = reader.GetDouble(10),
            TaxRate = Convert.ToDecimal(reader.GetDouble(11)),
            IsTaxInclusive = reader.GetInt32(12) == 1,
            PrescriptionRequired = reader.GetInt32(13) == 1,
            SellingPrice = Convert.ToDecimal(reader.GetDouble(14)),
            Mrp = Convert.ToDecimal(reader.GetDouble(15)),
            CurrentStock = reader.GetDouble(16),
            UpdatedAt = reader.GetInt64(17)
        };
    }
}
