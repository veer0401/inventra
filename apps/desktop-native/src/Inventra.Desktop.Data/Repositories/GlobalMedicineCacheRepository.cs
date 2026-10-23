using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Inventra.Desktop.Core.Domain.Catalog;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Data.Repositories;

public interface IGlobalMedicineCacheRepository
{
    Task UpsertCachedMedicinesAsync(IEnumerable<GlobalMedicineItem> items);
    Task<IReadOnlyList<GlobalMedicineItem>> SearchCachedMedicinesAsync(string query, int limit = 50);
    Task<GlobalMedicineItem?> GetCachedMedicineByIdAsync(string id);
    Task<int> GetCachedCountAsync();
}

public sealed class GlobalMedicineCacheRepository : IGlobalMedicineCacheRepository
{
    private readonly DatabaseContext _dbContext;

    public GlobalMedicineCacheRepository(DatabaseContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task UpsertCachedMedicinesAsync(IEnumerable<GlobalMedicineItem> items)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();
        await using var tx = (SqliteTransaction)await connection.BeginTransactionAsync();

        foreach (var item in items)
        {
            await using var cmd = connection.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = @"
                INSERT INTO cache_global_medicines (
                    id, name, generic_name, brand_name, manufacturer, dosage_form,
                    strength, base_unit, selling_unit, units_per_selling_unit,
                    hsn_code, tax_rate, prescription_required, barcode, description, cached_at
                ) VALUES (
                    @id, @name, @generic, @brand, @mfg, @form,
                    @str, @bunit, @sunit, @units,
                    @hsn, @tax, @rx, @bc, @desc, @now
                )
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    generic_name = excluded.generic_name,
                    brand_name = excluded.brand_name,
                    manufacturer = excluded.manufacturer,
                    dosage_form = excluded.dosage_form,
                    strength = excluded.strength,
                    base_unit = excluded.base_unit,
                    selling_unit = excluded.selling_unit,
                    units_per_selling_unit = excluded.units_per_selling_unit,
                    hsn_code = excluded.hsn_code,
                    tax_rate = excluded.tax_rate,
                    prescription_required = excluded.prescription_required,
                    barcode = excluded.barcode,
                    description = excluded.description,
                    cached_at = excluded.cached_at;
            ";
            cmd.Parameters.AddWithValue("@id", item.Id);
            cmd.Parameters.AddWithValue("@name", item.Name);
            cmd.Parameters.AddWithValue("@generic", (object?)item.GenericName ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@brand", (object?)item.BrandName ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@mfg", (object?)item.Manufacturer ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@form", item.DosageForm);
            cmd.Parameters.AddWithValue("@str", (object?)item.Strength ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@bunit", item.BaseUnit);
            cmd.Parameters.AddWithValue("@sunit", item.SellingUnit);
            cmd.Parameters.AddWithValue("@units", item.UnitsPerSellingUnit);
            cmd.Parameters.AddWithValue("@hsn", (object?)item.HsnCode ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@tax", (double)item.TaxRate);
            cmd.Parameters.AddWithValue("@rx", item.PrescriptionRequired ? 1 : 0);
            cmd.Parameters.AddWithValue("@bc", (object?)item.Barcode ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@desc", (object?)item.Description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@now", item.CachedAt);
            await cmd.ExecuteNonQueryAsync();
        }

        await tx.CommitAsync();
    }

    public async Task<IReadOnlyList<GlobalMedicineItem>> SearchCachedMedicinesAsync(string query, int limit = 50)
    {
        var list = new List<GlobalMedicineItem>();
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        if (string.IsNullOrWhiteSpace(query))
        {
            cmd.CommandText = "SELECT * FROM cache_global_medicines ORDER BY name ASC LIMIT @lim;";
        }
        else
        {
            cmd.CommandText = @"
                SELECT * FROM cache_global_medicines
                WHERE name LIKE @q OR generic_name LIKE @q OR brand_name LIKE @q OR barcode = @exact
                ORDER BY name ASC LIMIT @lim;
            ";
            cmd.Parameters.AddWithValue("@q", $"%{query}%");
            cmd.Parameters.AddWithValue("@exact", query.Trim());
        }
        cmd.Parameters.AddWithValue("@lim", limit);

        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(MapGlobalMedicine(reader));
        }

        return list;
    }

    public async Task<GlobalMedicineItem?> GetCachedMedicineByIdAsync(string id)
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT * FROM cache_global_medicines WHERE id = @id LIMIT 1;";
        cmd.Parameters.AddWithValue("@id", id);

        await using var reader = await cmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return MapGlobalMedicine(reader);
        }

        return null;
    }

    public async Task<int> GetCachedCountAsync()
    {
        await using var connection = _dbContext.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM cache_global_medicines;";
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    private static GlobalMedicineItem MapGlobalMedicine(SqliteDataReader reader)
    {
        return new GlobalMedicineItem
        {
            Id = reader.GetString(reader.GetOrdinal("id")),
            Name = reader.GetString(reader.GetOrdinal("name")),
            GenericName = reader.IsDBNull(reader.GetOrdinal("generic_name")) ? null : reader.GetString(reader.GetOrdinal("generic_name")),
            BrandName = reader.IsDBNull(reader.GetOrdinal("brand_name")) ? null : reader.GetString(reader.GetOrdinal("brand_name")),
            Manufacturer = reader.IsDBNull(reader.GetOrdinal("manufacturer")) ? null : reader.GetString(reader.GetOrdinal("manufacturer")),
            DosageForm = reader.IsDBNull(reader.GetOrdinal("dosage_form")) ? "TABLET" : reader.GetString(reader.GetOrdinal("dosage_form")),
            Strength = reader.IsDBNull(reader.GetOrdinal("strength")) ? null : reader.GetString(reader.GetOrdinal("strength")),
            BaseUnit = reader.IsDBNull(reader.GetOrdinal("base_unit")) ? "UNIT" : reader.GetString(reader.GetOrdinal("base_unit")),
            SellingUnit = reader.IsDBNull(reader.GetOrdinal("selling_unit")) ? "STRIP" : reader.GetString(reader.GetOrdinal("selling_unit")),
            UnitsPerSellingUnit = reader.GetInt32(reader.GetOrdinal("units_per_selling_unit")),
            HsnCode = reader.IsDBNull(reader.GetOrdinal("hsn_code")) ? null : reader.GetString(reader.GetOrdinal("hsn_code")),
            TaxRate = Convert.ToDecimal(reader.GetDouble(reader.GetOrdinal("tax_rate"))),
            PrescriptionRequired = reader.GetInt32(reader.GetOrdinal("prescription_required")) == 1,
            Barcode = reader.IsDBNull(reader.GetOrdinal("barcode")) ? null : reader.GetString(reader.GetOrdinal("barcode")),
            Description = reader.IsDBNull(reader.GetOrdinal("description")) ? null : reader.GetString(reader.GetOrdinal("description")),
            CachedAt = reader.GetInt64(reader.GetOrdinal("cached_at"))
        };
    }
}
