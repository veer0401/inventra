import { describe, it, expect } from "vitest";
import {
  createSupplierSchema,
  updateSupplierSchema,
  createSupplierProductSchema,
  createGoodsReceiptSchema,
  createGoodsReceiptLineSchema,
  createPurchaseOrderSchema,
  createPurchaseInvoiceSchema,
  supplierTypeSchema,
  supplierStatusSchema,
} from "./purchasing";

describe("Purchasing Validation Schemas", () => {
  const validUUID = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";

  describe("createSupplierSchema", () => {
    it("validates valid supplier creation payload", () => {
      const valid = {
        supplierCode: "SUP-001",
        legalName: "Cipla Pharmaceuticals Ltd",
        tradeName: "Cipla Health",
        supplierType: "MANUFACTURER",
        gstin: "29AABCC1234D1Z5",
        drugLicenseNumber: "DL-KA-2024-9988",
        email: "orders@cipla.com",
        phoneNumber: "+91 9876543210",
        contactPersonName: "Rajesh Sharma",
        addressLine1: "Plot 45, Peenya Industrial Area",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560058",
        paymentTermsDays: 30,
        creditLimit: 500000,
      };
      const result = createSupplierSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects supplier when required fields are missing", () => {
      const invalid = {
        supplierCode: "",
        legalName: "",
        supplierType: "UNKNOWN",
      };
      const result = createSupplierSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid email address format", () => {
      const invalid = {
        supplierCode: "SUP-002",
        legalName: "Sun Pharma",
        supplierType: "DISTRIBUTOR",
        email: "not-an-email",
      };
      const result = createSupplierSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createSupplierProductSchema", () => {
    it("validates supplier product mapping", () => {
      const valid = {
        productId: validUUID,
        supplierProductCode: "CIP-PCM-500",
        supplierProductName: "Paracetamol 500mg Strip of 10",
        purchaseUnit: "BOX",
        conversionFactor: 10,
        lastPurchasePrice: 85.5,
        isPreferred: true,
        minOrderQuantity: 5,
        leadTimeDays: 3,
      };
      const result = createSupplierProductSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects conversionFactor less than 1", () => {
      const invalid = {
        productId: validUUID,
        purchaseUnit: "BOX",
        conversionFactor: 0,
      };
      const result = createSupplierProductSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createGoodsReceiptSchema", () => {
    it("validates complete Goods Receipt with lines", () => {
      const valid = {
        storeId: validUUID,
        supplierId: validUUID,
        vendorDeliveryNote: "DC-2026-9912",
        receivedDate: "2026-08-25",
        notes: "Received in good condition",
        lines: [
          {
            productId: validUUID,
            receivedQuantity: 20,
            purchaseUnit: "BOX",
            conversionFactor: 10,
            batchNumber: "LOT-AUG-01",
            manufacturingDate: "2025-06-01",
            expiryDate: "2027-06-01",
            unitCost: 120.0,
            mrp: 180.0,
            sellingPrice: 160.0,
            taxRate: 12.0,
          },
        ],
      };
      const result = createGoodsReceiptSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects Goods Receipt with empty lines array", () => {
      const invalid = {
        storeId: validUUID,
        supplierId: validUUID,
        lines: [],
      };
      const result = createGoodsReceiptSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects line item with non-positive receivedQuantity", () => {
      const line = {
        productId: validUUID,
        receivedQuantity: 0,
        purchaseUnit: "BOX",
        conversionFactor: 1,
        unitCost: 50,
      };
      const result = createGoodsReceiptLineSchema.safeParse(line);
      expect(result.success).toBe(false);
    });
  });

  describe("createPurchaseOrderSchema", () => {
    it("validates valid purchase order payload with lines", () => {
      const valid = {
        storeId: validUUID,
        supplierId: validUUID,
        orderDate: "2026-08-26",
        expectedDeliveryDate: "2026-09-02",
        discountAmount: 500,
        notes: "Urgent replenishment order",
        lines: [
          {
            productId: validUUID,
            purchaseUnit: "BOX",
            conversionFactor: 10,
            orderedQuantity: 50,
            unitCost: 120,
            discountPercentage: 5,
            taxRate: 12,
          },
        ],
      };
      const result = createPurchaseOrderSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects purchase order with 0 orderedQuantity", () => {
      const invalid = {
        storeId: validUUID,
        supplierId: validUUID,
        lines: [
          {
            productId: validUUID,
            purchaseUnit: "BOX",
            conversionFactor: 10,
            orderedQuantity: 0,
            unitCost: 100,
          },
        ],
      };
      const result = createPurchaseOrderSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createPurchaseInvoiceSchema", () => {
    it("validates valid purchase invoice payload", () => {
      const valid = {
        storeId: validUUID,
        supplierId: validUUID,
        supplierInvoiceNumber: "INV-2026-8877",
        invoiceDate: "2026-08-26",
        dueDate: "2026-09-25",
        discountAmount: 100,
        roundOffAmount: 0.5,
        lines: [
          {
            productId: validUUID,
            invoicedQuantity: 20,
            unitPrice: 150,
            taxRate: 18,
            discountAmount: 0,
          },
        ],
      };
      const result = createPurchaseInvoiceSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invoice missing supplierInvoiceNumber", () => {
      const invalid = {
        storeId: validUUID,
        supplierId: validUUID,
        supplierInvoiceNumber: "",
        lines: [
          {
            productId: validUUID,
            invoicedQuantity: 10,
            unitPrice: 100,
          },
        ],
      };
      const result = createPurchaseInvoiceSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

