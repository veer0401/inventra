import type { IOfflineStorageDriver } from "../driver/types";
import type { CustomerSummaryResponse } from "@inventra/api-types";

export interface CachedCustomer {
  id: string;
  businessId: string;
  customerCode: string;
  fullName: string;
  phone?: string;
  email?: string;
  gstin?: string;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  updatedAt?: number;
}

export class CustomerCacheRepository {
  constructor(private driver: IOfflineStorageDriver) {}

  public async upsertCustomer(customer: CachedCustomer): Promise<void> {
    await this.driver.execute(
      `INSERT OR REPLACE INTO cache_customers (
        id, business_id, customer_code, full_name, phone, email, gstin, status, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.id,
        customer.businessId,
        customer.customerCode,
        customer.fullName,
        customer.phone || null,
        customer.email || null,
        customer.gstin || null,
        customer.status || "ACTIVE",
        customer.updatedAt || Date.now(),
      ]
    );
  }

  public async searchCustomers(
    businessId: string,
    query: string,
    limit = 20
  ): Promise<CustomerSummaryResponse[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const rows = await this.driver.query(
      `SELECT id, customer_code, full_name, phone, email, status
       FROM cache_customers
       WHERE business_id = ? AND (full_name LIKE ? OR phone LIKE ? OR customer_code LIKE ?)
       LIMIT ?`,
      [businessId, `%${cleanQuery}%`, `%${cleanQuery}%`, `%${cleanQuery}%`, limit]
    );

    return rows.map((r: any) => ({
      id: r.id,
      customerCode: r.customer_code,
      fullName: r.full_name,
      phone: r.phone,
      email: r.email,
      status: r.status,
      createdAt: new Date(r.updated_at || Date.now()).toISOString(),
    }));
  }

  public async getByPhone(
    businessId: string,
    phone: string
  ): Promise<CustomerSummaryResponse | null> {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return null;

    const rows = await this.driver.query(
      `SELECT id, customer_code, full_name, phone, email, status, updated_at
       FROM cache_customers
       WHERE business_id = ? AND phone = ?
       LIMIT 1`,
      [businessId, cleanPhone]
    );

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      customerCode: r.customer_code,
      fullName: r.full_name,
      phone: r.phone,
      email: r.email,
      status: r.status,
      createdAt: new Date(r.updated_at || Date.now()).toISOString(),
    };
  }
}
