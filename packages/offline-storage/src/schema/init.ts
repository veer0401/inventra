import type { IOfflineStorageDriver } from "../driver/types";

export const SQL_SCHEMA_STATEMENTS = [
  // 1. Products Master Cache
  `CREATE TABLE IF NOT EXISTS cache_products (
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_cache_products_biz_name ON cache_products(business_id, name);`,
  `CREATE INDEX IF NOT EXISTS idx_cache_products_generic ON cache_products(business_id, generic_name);`,

  // 2. Product Identifiers (Barcodes & SKUs) Cache
  `CREATE TABLE IF NOT EXISTS cache_product_identifiers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    identifier_type TEXT NOT NULL,
    identifier_value TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS idx_cache_identifiers_val ON cache_product_identifiers(business_id, identifier_value);`,

  // 3. Batches Cache (FEFO Lots)
  `CREATE TABLE IF NOT EXISTS cache_batches (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    batch_number TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    available_quantity REAL NOT NULL,
    selling_price REAL NOT NULL,
    mrp REAL NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_cache_batches_fefo ON cache_batches(business_id, store_id, product_id, expiry_date ASC);`,

  // 4. Customers Directory Cache
  `CREATE TABLE IF NOT EXISTS cache_customers (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    customer_code TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    updated_at INTEGER NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_cache_customers_phone ON cache_customers(business_id, phone);`,
  `CREATE INDEX IF NOT EXISTS idx_cache_customers_name ON cache_customers(business_id, full_name);`,

  // 5. Durable Offline Operation Queue
  `CREATE TABLE IF NOT EXISTS offline_operations (
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
  );`,
  `CREATE INDEX IF NOT EXISTS idx_offline_ops_status ON offline_operations(status, device_sequence_number ASC);`,
  `CREATE INDEX IF NOT EXISTS idx_offline_ops_biz_seq ON offline_operations(business_id, device_id, device_sequence_number ASC);`,

  // 6. Sync Metadata & Checkpoints
  `CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );`,

  // 7. Sync Conflict Records
  `CREATE TABLE IF NOT EXISTS sync_conflicts (
    conflict_id TEXT PRIMARY KEY,
    operation_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    conflict_details_json TEXT,
    resolution_status TEXT NOT NULL DEFAULT 'UNRESOLVED',
    created_at INTEGER NOT NULL
  );`,

  // 8. Print Job Queue
  `CREATE TABLE IF NOT EXISTS print_jobs (
    job_id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    document_type TEXT NOT NULL,
    source_entity_id TEXT NOT NULL,
    receipt_data_json TEXT NOT NULL,
    printer_name TEXT,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    last_attempt_at INTEGER
  );`,
  `CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status, created_at ASC);`,
];

export async function initializeOfflineSchema(driver: IOfflineStorageDriver): Promise<void> {
  for (const sql of SQL_SCHEMA_STATEMENTS) {
    await driver.execute(sql);
  }
}
