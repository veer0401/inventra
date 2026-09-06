import type { IOfflineStorageDriver } from "../driver/types";
import type { PosProductSearchResponse } from "@inventra/api-types";

export interface CachedProduct {
  id: string;
  businessId: string;
  storeId?: string;
  code?: string;
  name: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  baseUnit: string;
  sellingUnit: string;
  unitsPerSellingUnit: number;
  taxRate: number;
  isTaxInclusive: boolean;
  prescriptionRequired: boolean;
  sellingPrice: number;
  mrp: number;
  currentStock: number;
  updatedAt: number;
}

export interface CachedIdentifier {
  id: string;
  businessId: string;
  productId: string;
  identifierType: string;
  identifierValue: string;
  isPrimary: boolean;
}

export interface CachedBatch {
  id: string;
  businessId: string;
  storeId: string;
  productId: string;
  batchNumber: string;
  expiryDate: string;
  availableQuantity: number;
  sellingPrice: number;
  mrp: number;
}

export class ProductCacheRepository {
  constructor(private driver: IOfflineStorageDriver) {}

  public async upsertProduct(product: CachedProduct): Promise<void> {
    await this.driver.execute(
      `INSERT OR REPLACE INTO cache_products (
        id, business_id, store_id, code, name, generic_name, dosage_form, strength,
        base_unit, selling_unit, units_per_selling_unit, tax_rate, is_tax_inclusive,
        prescription_required, selling_price, mrp, current_stock, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
        product.businessId,
        product.storeId || null,
        product.code || null,
        product.name,
        product.genericName || null,
        product.dosageForm || null,
        product.strength || null,
        product.baseUnit,
        product.sellingUnit,
        product.unitsPerSellingUnit,
        product.taxRate,
        product.isTaxInclusive ? 1 : 0,
        product.prescriptionRequired ? 1 : 0,
        product.sellingPrice,
        product.mrp,
        product.currentStock,
        product.updatedAt || Date.now(),
      ]
    );
  }

  public async upsertIdentifier(identifier: CachedIdentifier): Promise<void> {
    await this.driver.execute(
      `INSERT OR REPLACE INTO cache_product_identifiers (
        id, business_id, product_id, identifier_type, identifier_value, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        identifier.id,
        identifier.businessId,
        identifier.productId,
        identifier.identifierType,
        identifier.identifierValue.trim().toUpperCase(),
        identifier.isPrimary ? 1 : 0,
      ]
    );
  }

  public async upsertBatch(batch: CachedBatch): Promise<void> {
    await this.driver.execute(
      `INSERT OR REPLACE INTO cache_batches (
        id, business_id, store_id, product_id, batch_number, expiry_date,
        available_quantity, selling_price, mrp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        batch.id,
        batch.businessId,
        batch.storeId,
        batch.productId,
        batch.batchNumber,
        batch.expiryDate,
        batch.availableQuantity,
        batch.sellingPrice,
        batch.mrp,
      ]
    );
  }

  public async searchProducts(
    businessId: string,
    query: string,
    limit = 24
  ): Promise<PosProductSearchResponse[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const rows = await this.driver.query(
      `SELECT id, name, generic_name, dosage_form, strength, base_unit, selling_unit,
              units_per_selling_unit, tax_rate, is_tax_inclusive, prescription_required,
              selling_price, mrp, current_stock
       FROM cache_products
       WHERE business_id = ? AND (name LIKE ? OR generic_name LIKE ? OR code = ?)
       LIMIT ?`,
      [businessId, `%${cleanQuery}%`, `%${cleanQuery}%`, cleanQuery, limit]
    );

    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      genericName: r.generic_name,
      dosageForm: r.dosage_form,
      strength: r.strength,
      baseUnit: r.base_unit,
      sellingUnit: r.selling_unit,
      unitsPerSellingUnit: r.units_per_selling_unit,
      taxRate: r.tax_rate,
      isTaxInclusive: r.is_tax_inclusive === 1,
      prescriptionRequired: r.prescription_required === 1,
      currentStock: r.current_stock,
      isBatchTracked: true,
      sellingPrice: r.selling_price,
      mrp: r.mrp,
    }));
  }

  public async lookupByBarcode(
    businessId: string,
    barcode: string
  ): Promise<PosProductSearchResponse | null> {
    const cleanBarcode = barcode.trim().toUpperCase();
    if (!cleanBarcode) return null;

    // 1. Check identifier table
    const idRows = await this.driver.query(
      `SELECT product_id FROM cache_product_identifiers
       WHERE business_id = ? AND identifier_value = ?
       LIMIT 1`,
      [businessId, cleanBarcode]
    );

    let productId: string | null = idRows.length > 0 ? idRows[0].product_id : null;

    // 2. If not found in identifiers, check product code
    if (!productId) {
      const prodRows = await this.driver.query(
        `SELECT id FROM cache_products WHERE business_id = ? AND code = ? LIMIT 1`,
        [businessId, cleanBarcode]
      );
      if (prodRows.length > 0) {
        productId = prodRows[0].id;
      }
    }

    if (!productId) return null;

    const products = await this.driver.query(
      `SELECT * FROM cache_products WHERE business_id = ? AND id = ? LIMIT 1`,
      [businessId, productId]
    );

    if (products.length === 0) return null;

    const p = products[0];

    // Find FEFO batch for product
    const batches = await this.getFefoBatches(businessId, p.store_id || "", productId);
    const topBatch = batches.length > 0 ? batches[0] : null;

    return {
      id: p.id,
      name: p.name,
      genericName: p.generic_name,
      dosageForm: p.dosage_form,
      strength: p.strength,
      baseUnit: p.base_unit,
      sellingUnit: p.selling_unit,
      unitsPerSellingUnit: p.units_per_selling_unit,
      taxRate: p.tax_rate,
      isTaxInclusive: p.is_tax_inclusive === 1,
      prescriptionRequired: p.prescription_required === 1,
      currentStock: p.current_stock,
      isBatchTracked: true,
      sellingPrice: topBatch ? topBatch.sellingPrice : p.selling_price,
      mrp: topBatch ? topBatch.mrp : p.mrp,
      fefoBatchNumber: topBatch?.batchNumber,
      fefoExpiryDate: topBatch?.expiryDate,
      fefoSellingPrice: topBatch?.sellingPrice,
      fefoMrp: topBatch?.mrp,
    };
  }

  public async getFefoBatches(
    businessId: string,
    _storeId: string,
    productId: string
  ): Promise<CachedBatch[]> {
    const rows = await this.driver.query(
      `SELECT id, business_id, store_id, product_id, batch_number, expiry_date,
              available_quantity, selling_price, mrp
       FROM cache_batches
       WHERE business_id = ? AND product_id = ? AND available_quantity > 0
       ORDER BY expiry_date ASC`,
      [businessId, productId]
    );

    return rows.map((r: any) => ({
      id: r.id,
      businessId: r.business_id,
      storeId: r.store_id,
      productId: r.product_id,
      batchNumber: r.batch_number,
      expiryDate: r.expiry_date,
      availableQuantity: r.available_quantity,
      sellingPrice: r.selling_price,
      mrp: r.mrp,
    }));
  }

  public async decrementLocalBatchStock(batchId: string, quantity: number): Promise<void> {
    await this.driver.execute(
      `UPDATE cache_batches
       SET available_quantity = available_quantity - ?
       WHERE id = ?`,
      [quantity, batchId]
    );
  }

  public async decrementLocalProductStock(productId: string, quantity: number): Promise<void> {
    await this.driver.execute(
      `UPDATE cache_products
       SET current_stock = current_stock - ?
       WHERE id = ?`,
      [quantity, productId]
    );
  }
}
