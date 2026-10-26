using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Data.Sqlite;

namespace Inventra.Desktop.Data;

public sealed class DatabaseContext
{
    private readonly string _connectionString;
    private readonly string _databasePath;

    public DatabaseContext(string? dbPath = null)
    {
        if (string.IsNullOrWhiteSpace(dbPath))
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var folder = Path.Combine(appData, "Inventra", "Data");
            Directory.CreateDirectory(folder);
            _databasePath = Path.Combine(folder, "inventra_local.db");
        }
        else
        {
            var directory = Path.GetDirectoryName(dbPath);
            if (!string.IsNullOrEmpty(directory))
            {
                Directory.CreateDirectory(directory);
            }
            _databasePath = dbPath;
        }

        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _databasePath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared
        }.ToString();
    }

    public string DatabasePath => _databasePath;

    public SqliteConnection CreateConnection() => new(_connectionString);

    public async Task InitializeAsync()
    {
        await using var connection = CreateConnection();
        await connection.OpenAsync();

        // 1. Enable WAL mode and foreign keys for high-performance concurrent local ERP operation
        await using (var pragmaCmd = connection.CreateCommand())
        {
            pragmaCmd.CommandText = @"
                PRAGMA journal_mode = WAL;
                PRAGMA synchronous = NORMAL;
                PRAGMA foreign_keys = ON;
            ";
            await pragmaCmd.ExecuteNonQueryAsync();
        }

        // 2. Create Schema
        await using (var schemaCmd = connection.CreateCommand())
        {
            schemaCmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS cache_products (
                    id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    store_id TEXT,
                    code TEXT,
                    name TEXT NOT NULL,
                    generic_name TEXT,
                    dosage_form TEXT,
                    strength TEXT,
                    base_unit TEXT NOT NULL,
                    selling_unit TEXT NOT NULL,
                    units_per_selling_unit REAL NOT NULL DEFAULT 1.0,
                    tax_rate REAL NOT NULL DEFAULT 0.0,
                    is_tax_inclusive INTEGER NOT NULL DEFAULT 0,
                    prescription_required INTEGER NOT NULL DEFAULT 0,
                    selling_price REAL NOT NULL,
                    mrp REAL NOT NULL,
                    current_stock REAL NOT NULL DEFAULT 0.0,
                    updated_at INTEGER NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_products_name ON cache_products(business_id, name);
                CREATE INDEX IF NOT EXISTS idx_products_code ON cache_products(business_id, code);
                CREATE INDEX IF NOT EXISTS idx_products_generic ON cache_products(business_id, generic_name);

                CREATE TABLE IF NOT EXISTS cache_batches (
                    id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    store_id TEXT NOT NULL,
                    product_id TEXT NOT NULL,
                    batch_number TEXT NOT NULL,
                    expiry_date TEXT NOT NULL,
                    available_quantity REAL NOT NULL,
                    selling_price REAL NOT NULL,
                    mrp REAL NOT NULL,
                    FOREIGN KEY (product_id) REFERENCES cache_products(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_batches_fefo ON cache_batches(business_id, store_id, product_id, expiry_date ASC);

                CREATE TABLE IF NOT EXISTS cache_customers (
                    id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    customer_code TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    gstin TEXT,
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    updated_at INTEGER NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_customers_phone ON cache_customers(business_id, phone);

                CREATE TABLE IF NOT EXISTS offline_operations (
                    operation_id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    store_id TEXT NOT NULL,
                    device_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    device_sequence_number INTEGER NOT NULL,
                    event_type TEXT NOT NULL,
                    event_version INTEGER NOT NULL DEFAULT 1,
                    payload_json TEXT NOT NULL,
                    payload_checksum TEXT NOT NULL,
                    idempotency_key TEXT NOT NULL UNIQUE,
                    status TEXT NOT NULL,
                    retry_count INTEGER NOT NULL DEFAULT 0,
                    last_attempt_at INTEGER,
                    server_entity_id TEXT,
                    error_code TEXT,
                    error_message TEXT,
                    created_at INTEGER NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_offline_ops_status ON offline_operations(status, device_sequence_number ASC);

                CREATE TABLE IF NOT EXISTS sync_metadata (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    updated_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS device_identity (
                    device_id TEXT PRIMARY KEY,
                    device_name TEXT NOT NULL,
                    device_code TEXT NOT NULL,
                    business_id TEXT,
                    store_id TEXT,
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    registered_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS local_sales (
                    id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    store_id TEXT NOT NULL,
                    device_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    invoice_number TEXT NOT NULL,
                    customer_name TEXT,
                    customer_phone TEXT,
                    subtotal REAL NOT NULL,
                    tax_amount REAL NOT NULL,
                    discount_amount REAL NOT NULL DEFAULT 0.0,
                    total_amount REAL NOT NULL,
                    payment_method TEXT NOT NULL DEFAULT 'CASH',
                    payment_status TEXT NOT NULL DEFAULT 'COMPLETED',
                    sync_status TEXT NOT NULL DEFAULT 'PENDING',
                    created_at INTEGER NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_sales_business_date ON local_sales(business_id, store_id, created_at DESC);
                CREATE INDEX IF NOT EXISTS idx_sales_sync ON local_sales(sync_status);

                CREATE TABLE IF NOT EXISTS local_sale_items (
                    id TEXT PRIMARY KEY,
                    sale_id TEXT NOT NULL,
                    product_id TEXT NOT NULL,
                    product_name TEXT NOT NULL,
                    batch_id TEXT,
                    batch_number TEXT,
                    quantity REAL NOT NULL,
                    unit_price REAL NOT NULL,
                    tax_rate REAL NOT NULL,
                    taxable_amount REAL NOT NULL,
                    tax_amount REAL NOT NULL,
                    total_amount REAL NOT NULL,
                    FOREIGN KEY (sale_id) REFERENCES local_sales(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON local_sale_items(sale_id);

                CREATE TABLE IF NOT EXISTS auth_session (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    business_id TEXT NOT NULL,
                    business_name TEXT NOT NULL,
                    store_id TEXT NOT NULL,
                    store_name TEXT NOT NULL,
                    gstin TEXT,
                    encrypted_refresh_token TEXT,
                    permissions_json TEXT NOT NULL DEFAULT '[]',
                    authorized_at INTEGER NOT NULL DEFAULT 0,
                    last_cloud_validation_at INTEGER NOT NULL DEFAULT 0,
                    offline_policy_max_days INTEGER NOT NULL DEFAULT 14,
                    token_expires_at INTEGER,
                    updated_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS cache_global_medicines (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    generic_name TEXT,
                    brand_name TEXT,
                    manufacturer TEXT,
                    dosage_form TEXT,
                    strength TEXT,
                    base_unit TEXT,
                    selling_unit TEXT,
                    units_per_selling_unit INTEGER NOT NULL DEFAULT 1,
                    hsn_code TEXT,
                    tax_rate REAL NOT NULL DEFAULT 0.0,
                    prescription_required INTEGER NOT NULL DEFAULT 0,
                    barcode TEXT,
                    description TEXT,
                    cached_at INTEGER NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_cache_global_name ON cache_global_medicines(name);
                CREATE INDEX IF NOT EXISTS idx_cache_global_generic ON cache_global_medicines(generic_name);
                CREATE INDEX IF NOT EXISTS idx_cache_global_barcode ON cache_global_medicines(barcode);

                CREATE TABLE IF NOT EXISTS cache_suppliers (
                    id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    supplier_code TEXT NOT NULL,
                    legal_name TEXT NOT NULL,
                    trade_name TEXT,
                    gstin TEXT,
                    contact_person TEXT,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    city TEXT,
                    state TEXT,
                    postal_code TEXT,
                    payment_terms_days INTEGER NOT NULL DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    updated_at INTEGER NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_suppliers_biz ON cache_suppliers(business_id, legal_name);

                CREATE TABLE IF NOT EXISTS local_purchases (
                    id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    store_id TEXT NOT NULL,
                    supplier_id TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    order_number TEXT NOT NULL,
                    supplier_invoice_no TEXT,
                    order_date TEXT NOT NULL,
                    expected_delivery_date TEXT,
                    status TEXT NOT NULL DEFAULT 'DRAFT',
                    payment_terms_days INTEGER NOT NULL DEFAULT 0,
                    notes TEXT,
                    subtotal REAL NOT NULL DEFAULT 0.0,
                    discount_amount REAL NOT NULL DEFAULT 0.0,
                    tax_amount REAL NOT NULL DEFAULT 0.0,
                    total_amount REAL NOT NULL DEFAULT 0.0,
                    sync_status TEXT NOT NULL DEFAULT 'PENDING',
                    created_at INTEGER NOT NULL,
                    created_by TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_purchases_biz ON local_purchases(business_id, store_id, order_date DESC);

                CREATE TABLE IF NOT EXISTS local_purchase_lines (
                    id TEXT PRIMARY KEY,
                    purchase_id TEXT NOT NULL,
                    product_id TEXT NOT NULL,
                    product_name TEXT NOT NULL,
                    ordered_qty REAL NOT NULL,
                    free_qty REAL NOT NULL DEFAULT 0.0,
                    received_qty REAL NOT NULL DEFAULT 0.0,
                    purchase_unit TEXT NOT NULL DEFAULT 'STRIP',
                    unit_price REAL NOT NULL,
                    discount_amount REAL NOT NULL DEFAULT 0.0,
                    tax_rate REAL NOT NULL DEFAULT 0.0,
                    tax_amount REAL NOT NULL DEFAULT 0.0,
                    total_amount REAL NOT NULL,
                    FOREIGN KEY (purchase_id) REFERENCES local_purchases(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_purchase_lines_pid ON local_purchase_lines(purchase_id);

                CREATE TABLE IF NOT EXISTS local_goods_receipts (
                    id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    store_id TEXT NOT NULL,
                    supplier_id TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    purchase_id TEXT,
                    receipt_number TEXT NOT NULL,
                    vendor_delivery_note TEXT,
                    received_date TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'DRAFT',
                    notes TEXT,
                    total_amount REAL NOT NULL DEFAULT 0.0,
                    received_by TEXT NOT NULL,
                    sync_status TEXT NOT NULL DEFAULT 'PENDING',
                    created_at INTEGER NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_grn_biz ON local_goods_receipts(business_id, store_id, received_date DESC);

                CREATE TABLE IF NOT EXISTS local_goods_receipt_lines (
                    id TEXT PRIMARY KEY,
                    grn_id TEXT NOT NULL,
                    purchase_line_id TEXT,
                    product_id TEXT NOT NULL,
                    product_name TEXT NOT NULL,
                    received_qty REAL NOT NULL,
                    rejected_qty REAL NOT NULL DEFAULT 0.0,
                    free_qty REAL NOT NULL DEFAULT 0.0,
                    batch_number TEXT NOT NULL,
                    mfg_date TEXT,
                    expiry_date TEXT NOT NULL,
                    unit_cost REAL NOT NULL,
                    mrp REAL NOT NULL,
                    selling_price REAL NOT NULL,
                    tax_rate REAL NOT NULL DEFAULT 0.0,
                    tax_amount REAL NOT NULL DEFAULT 0.0,
                    total_amount REAL NOT NULL,
                    assigned_batch_id TEXT,
                    FOREIGN KEY (grn_id) REFERENCES local_goods_receipts(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_grn_lines_gid ON local_goods_receipt_lines(grn_id);
            ";
            await schemaCmd.ExecuteNonQueryAsync();
        }

        // 3. Schema Migrations (ensure existing DB has Phase 4 and Phase 5 columns)
        await TryAddColumnAsync(connection, "auth_session", "permissions_json", "TEXT DEFAULT '[]'");
        await TryAddColumnAsync(connection, "auth_session", "authorized_at", "INTEGER DEFAULT 0");
        await TryAddColumnAsync(connection, "auth_session", "last_cloud_validation_at", "INTEGER DEFAULT 0");
        await TryAddColumnAsync(connection, "auth_session", "offline_policy_max_days", "INTEGER DEFAULT 14");

        await using (var importCmd = connection.CreateCommand())
        {
            // The medicine-import queue (separate from the sync outbox: it can be paused and calls REST directly).
            importCmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS import_jobs (
                    id TEXT PRIMARY KEY,
                    business_id TEXT NOT NULL,
                    global_medicine_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    generic_name TEXT,
                    status TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    message TEXT,
                    product_id TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ux_import_jobs_active
                    ON import_jobs(business_id, global_medicine_id) WHERE status IN ('QUEUED', 'RUNNING');
                CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(business_id, status, created_at);";
            await importCmd.ExecuteNonQueryAsync();
        }

        await TryAddColumnAsync(connection, "local_purchase_lines", "conversion_factor", "INTEGER NOT NULL DEFAULT 1");
        await TryAddColumnAsync(connection, "local_sales", "server_sale_id", "TEXT");
        await TryAddColumnAsync(connection, "local_sales", "sync_error", "TEXT");

        await TryAddColumnAsync(connection, "cache_suppliers", "sync_state", "TEXT NOT NULL DEFAULT 'SYNCED'");
        await TryAddColumnAsync(connection, "cache_suppliers", "sync_error", "TEXT");

        await TryAddColumnAsync(connection, "cache_batches", "purchase_price", "REAL DEFAULT 0.0");
        await TryAddColumnAsync(connection, "cache_batches", "manufacturing_date", "TEXT");

        // Backfill existing session timestamps from updated_at if they were defaulted to 0
        try
        {
            await using var backfillCmd = connection.CreateCommand();
            backfillCmd.CommandText = @"
                UPDATE auth_session
                SET authorized_at = updated_at,
                    last_cloud_validation_at = updated_at
                WHERE (authorized_at = 0 OR last_cloud_validation_at = 0) AND updated_at > 0;
            ";
            await backfillCmd.ExecuteNonQueryAsync();
        }
        catch
        {
            // Ignore if auth_session is empty
        }
    }

    private static async Task TryAddColumnAsync(SqliteConnection connection, string table, string column, string typeDefinition)
    {
        try
        {
            await using var cmd = connection.CreateCommand();
            cmd.CommandText = $"ALTER TABLE {table} ADD COLUMN {column} {typeDefinition};";
            await cmd.ExecuteNonQueryAsync();
        }
        catch (SqliteException ex) when (ex.Message.Contains("duplicate column name", StringComparison.OrdinalIgnoreCase))
        {
            // Column already exists, safe to ignore
        }
        catch
        {
            // Ignore if column cannot be added or already present
        }
    }

    public static string ComputeSha256(string content)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
