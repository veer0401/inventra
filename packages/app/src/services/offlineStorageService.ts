import {
  IOfflineStorageDriver,
  TauriSqliteDriver,
  MemorySqliteDriver,
  SQL_SCHEMA_STATEMENTS,
  ProductCacheRepository,
  CustomerCacheRepository,
  OfflineQueueRepository,
} from "@inventra/offline-storage";
import { safeLocalStorage, useAuthStore } from "../stores/authStore";

export interface DriverInfo {
  driverName: "Tauri Native SQLite" | "In-Memory Browser SQLite";
  isTauri: boolean;
  dbPath: string;
  isConnected: boolean;
  schemaVersion: string;
}

export interface StorageStats {
  productsCount: number;
  batchesCount: number;
  customersCount: number;
  pendingOperationsCount: number;
  lastSyncAt: string | null;
}

export class OfflineStorageService {
  private driver: IOfflineStorageDriver;
  private isTauri: boolean;
  private isConnected = false;
  private initPromise: Promise<void> | null = null;

  public readonly productRepo: ProductCacheRepository;
  public readonly customerRepo: CustomerCacheRepository;
  public readonly queueRepo: OfflineQueueRepository;

  constructor() {
    this.isTauri =
      typeof window !== "undefined" &&
      Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);

    if (this.isTauri) {
      this.driver = new TauriSqliteDriver("sqlite:inventra_desktop.db");
    } else {
      this.driver = new MemorySqliteDriver();
    }

    this.productRepo = new ProductCacheRepository(this.driver);
    this.customerRepo = new CustomerCacheRepository(this.driver);
    this.queueRepo = new OfflineQueueRepository(this.driver);
  }

  public async initialize(): Promise<void> {
    if (this.isConnected) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await this.driver.connect();
        this.isConnected = true;

        // Run DDL schema migration statements
        for (const statement of SQL_SCHEMA_STATEMENTS) {
          await this.driver.execute(statement);
        }
      } catch (err) {
        // In browser webview if Tauri SQL plugin isn't active, fallback to MemorySqliteDriver
        if (this.isTauri) {
          console.warn(
            "[OfflineStorage] Failed to initialize Tauri SQLite driver, falling back to Memory driver",
            err
          );
          this.driver = new MemorySqliteDriver();
          await this.driver.connect();
          this.isConnected = true;
          for (const statement of SQL_SCHEMA_STATEMENTS) {
            await this.driver.execute(statement);
          }
        } else {
          throw err;
        }
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  public getDriverInfo(): DriverInfo {
    return {
      driverName: this.isTauri ? "Tauri Native SQLite" : "In-Memory Browser SQLite",
      isTauri: this.isTauri,
      dbPath: this.isTauri ? "sqlite:inventra_desktop.db" : "memory://inventra_virtual.db",
      isConnected: this.isConnected,
      schemaVersion: "v1.0-sqlite-core",
    };
  }

  public isOfflineDebugMode(): boolean {
    return safeLocalStorage.getItem("inventra_debug_offline_mode") === "true";
  }

  public setOfflineDebugMode(enabled: boolean): void {
    if (enabled) {
      safeLocalStorage.setItem("inventra_debug_offline_mode", "true");
    } else {
      safeLocalStorage.removeItem("inventra_debug_offline_mode");
    }

    // Update authStore online state
    useAuthStore.getState().setOnlineStatus(!enabled);

    // Notify listeners across app
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("inventra_offline_debug_change", {
          detail: { enabled },
        })
      );
    }
  }

  public async getStats(): Promise<StorageStats> {
    await this.initialize();

    try {
      const pRows = await this.driver.query<{ count: number }>(
        "SELECT count(*) as count FROM cache_products;"
      );
      const bRows = await this.driver.query<{ count: number }>(
        "SELECT count(*) as count FROM cache_batches;"
      );
      const cRows = await this.driver.query<{ count: number }>(
        "SELECT count(*) as count FROM cache_customers;"
      );
      const qRows = await this.driver.query<{ count: number }>(
        "SELECT count(*) as count FROM offline_operations WHERE status = 'PENDING';"
      );

      let lastSyncAt: string | null = null;
      try {
        const metaRows = await this.driver.query<{ meta_value: string }>(
          "SELECT meta_value FROM sync_metadata WHERE meta_key = 'last_sync_at' LIMIT 1;"
        );
        if (metaRows.length > 0 && metaRows[0]?.meta_value) {
          lastSyncAt = metaRows[0].meta_value;
        }
      } catch {
        // Table might be empty
      }

      return {
        productsCount: Number(pRows[0]?.count ?? 0),
        batchesCount: Number(bRows[0]?.count ?? 0),
        customersCount: Number(cRows[0]?.count ?? 0),
        pendingOperationsCount: Number(qRows[0]?.count ?? 0),
        lastSyncAt,
      };
    } catch {
      return {
        productsCount: 0,
        batchesCount: 0,
        customersCount: 0,
        pendingOperationsCount: 0,
        lastSyncAt: null,
      };
    }
  }

  public async seedSampleData(businessId = "01a037d5-b001-72eb-81f6-ad0a91e7fa21", storeId = "01a037d5-s001-72eb-81f6-ad0a91e7fa22"): Promise<void> {
    await this.initialize();

    const sampleProducts = [
      {
        id: "prod-pcm-500",
        business_id: businessId,
        store_id: storeId,
        code: "MED-PCM-500",
        name: "Paracetamol 500mg Tablet",
        generic_name: "Acetaminophen / Paracetamol",
        dosage_form: "TABLET",
        strength: "500mg",
        base_unit: "TABLET",
        selling_unit: "STRIP",
        units_per_selling_unit: 10,
        tax_rate: 12.0,
        is_tax_inclusive: 1,
        prescription_required: 0,
        selling_price: 25.0,
        mrp: 30.0,
        current_stock: 120.0,
        updated_at: Date.now(),
      },
      {
        id: "prod-amx-500",
        business_id: businessId,
        store_id: storeId,
        code: "MED-AMX-500",
        name: "Amoxicillin 500mg Capsule",
        generic_name: "Amoxicillin Trihydrate",
        dosage_form: "CAPSULE",
        strength: "500mg",
        base_unit: "CAPSULE",
        selling_unit: "STRIP",
        units_per_selling_unit: 10,
        tax_rate: 12.0,
        is_tax_inclusive: 1,
        prescription_required: 1,
        selling_price: 75.0,
        mrp: 90.0,
        current_stock: 80.0,
        updated_at: Date.now(),
      },
      {
        id: "prod-cet-10",
        business_id: businessId,
        store_id: storeId,
        code: "MED-CET-10",
        name: "Cetirizine 10mg Tablet",
        generic_name: "Cetirizine Dihydrochloride",
        dosage_form: "TABLET",
        strength: "10mg",
        base_unit: "TABLET",
        selling_unit: "STRIP",
        units_per_selling_unit: 10,
        tax_rate: 12.0,
        is_tax_inclusive: 1,
        prescription_required: 0,
        selling_price: 18.0,
        mrp: 22.0,
        current_stock: 150.0,
        updated_at: Date.now(),
      },
      {
        id: "prod-azi-500",
        business_id: businessId,
        store_id: storeId,
        code: "MED-AZI-500",
        name: "Azithromycin 500mg Tablet",
        generic_name: "Azithromycin",
        dosage_form: "TABLET",
        strength: "500mg",
        base_unit: "TABLET",
        selling_unit: "STRIP",
        units_per_selling_unit: 3,
        tax_rate: 12.0,
        is_tax_inclusive: 1,
        prescription_required: 1,
        selling_price: 115.0,
        mrp: 132.0,
        current_stock: 45.0,
        updated_at: Date.now(),
      },
      {
        id: "prod-ome-20",
        business_id: businessId,
        store_id: storeId,
        code: "MED-OME-20",
        name: "Omeprazole 20mg Capsule",
        generic_name: "Omeprazole",
        dosage_form: "CAPSULE",
        strength: "20mg",
        base_unit: "CAPSULE",
        selling_unit: "STRIP",
        units_per_selling_unit: 15,
        tax_rate: 12.0,
        is_tax_inclusive: 1,
        prescription_required: 0,
        selling_price: 45.0,
        mrp: 55.0,
        current_stock: 60.0,
        updated_at: Date.now(),
      },
      {
        id: "prod-met-500",
        business_id: businessId,
        store_id: storeId,
        code: "MED-MET-500",
        name: "Metformin 500mg Tablet",
        generic_name: "Metformin Hydrochloride",
        dosage_form: "TABLET",
        strength: "500mg",
        base_unit: "TABLET",
        selling_unit: "STRIP",
        units_per_selling_unit: 20,
        tax_rate: 12.0,
        is_tax_inclusive: 1,
        prescription_required: 1,
        selling_price: 38.0,
        mrp: 46.0,
        current_stock: 90.0,
        updated_at: Date.now(),
      },
    ];

    for (const p of sampleProducts) {
      await this.driver.execute(
        `INSERT OR REPLACE INTO cache_products (
          id, business_id, store_id, code, name, generic_name, dosage_form,
          strength, base_unit, selling_unit, units_per_selling_unit, tax_rate,
          is_tax_inclusive, prescription_required, selling_price, mrp, current_stock, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          p.id,
          p.business_id,
          p.store_id,
          p.code,
          p.name,
          p.generic_name,
          p.dosage_form,
          p.strength,
          p.base_unit,
          p.selling_unit,
          p.units_per_selling_unit,
          p.tax_rate,
          p.is_tax_inclusive,
          p.prescription_required,
          p.selling_price,
          p.mrp,
          p.current_stock,
          p.updated_at,
        ]
      );
    }

    const sampleBatches = [
      {
        id: "batch-pcm-01",
        business_id: businessId,
        product_id: "prod-pcm-500",
        store_id: storeId,
        batch_number: "PCM-2026-A1",
        expiry_date: "2027-12-31",
        available_quantity: 70.0,
        selling_price: 25.0,
        mrp: 30.0,
      },
      {
        id: "batch-pcm-02",
        business_id: businessId,
        product_id: "prod-pcm-500",
        store_id: storeId,
        batch_number: "PCM-2027-B2",
        expiry_date: "2028-06-30",
        available_quantity: 50.0,
        selling_price: 25.0,
        mrp: 30.0,
      },
      {
        id: "batch-amx-01",
        business_id: businessId,
        product_id: "prod-amx-500",
        store_id: storeId,
        batch_number: "AMX-2026-X1",
        expiry_date: "2027-08-31",
        available_quantity: 80.0,
        selling_price: 75.0,
        mrp: 90.0,
      },
      {
        id: "batch-cet-01",
        business_id: businessId,
        product_id: "prod-cet-10",
        store_id: storeId,
        batch_number: "CET-2026-C1",
        expiry_date: "2028-03-31",
        available_quantity: 150.0,
        selling_price: 18.0,
        mrp: 22.0,
      },
    ];

    for (const b of sampleBatches) {
      await this.driver.execute(
        `INSERT OR REPLACE INTO cache_batches (
          id, business_id, product_id, store_id, batch_number, expiry_date,
          available_quantity, selling_price, mrp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          b.id,
          b.business_id,
          b.product_id,
          b.store_id,
          b.batch_number,
          b.expiry_date,
          b.available_quantity,
          b.selling_price,
          b.mrp,
        ]
      );
    }

    const sampleCustomers = [
      {
        id: "cust-walkin",
        business_id: businessId,
        customer_code: "WALK-IN",
        full_name: "Walk-in Counter Customer",
        phone: "+910000000000",
        email: "walkin@counter.local",
        outstanding_balance: 0.0,
        credit_limit: 0.0,
        updated_at: Date.now(),
      },
      {
        id: "cust-ind-01",
        business_id: businessId,
        customer_code: "CUST-1001",
        full_name: "Rajesh Kumar",
        phone: "+919876543210",
        email: "rajesh.kumar@example.com",
        outstanding_balance: 0.0,
        credit_limit: 5000.0,
        updated_at: Date.now(),
      },
    ];

    for (const c of sampleCustomers) {
      await this.driver.execute(
        `INSERT OR REPLACE INTO cache_customers (
          id, business_id, customer_code, full_name, phone, email,
          outstanding_balance, credit_limit, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          c.id,
          c.business_id,
          c.customer_code,
          c.full_name,
          c.phone,
          c.email,
          c.outstanding_balance,
          c.credit_limit,
          c.updated_at,
        ]
      );
    }
  }

  public async clearLocalData(): Promise<void> {
    await this.initialize();
    await this.driver.execute("DELETE FROM cache_products;");
    await this.driver.execute("DELETE FROM cache_batches;");
    await this.driver.execute("DELETE FROM cache_customers;");
    await this.driver.execute("DELETE FROM offline_operations;");
    await this.driver.execute("DELETE FROM cache_product_identifiers;");
  }

  public async executeTestQuery<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    await this.initialize();
    return await this.driver.query<T>(sql, params);
  }
}

export const offlineStorageService = new OfflineStorageService();
