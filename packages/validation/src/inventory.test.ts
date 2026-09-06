import { describe, it, expect } from "vitest";
import {
  stockAdjustmentSchema,
  batchAdjustmentSchema,
  stockMovementTypeSchema,
  batchStatusSchema,
} from "./inventory";

describe("Inventory Validation Schemas", () => {
  const validUUID = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";

  describe("stockMovementTypeSchema", () => {
    it("accepts valid backend movement types", () => {
      expect(stockMovementTypeSchema.safeParse("INITIAL_STOCK").success).toBe(true);
      expect(stockMovementTypeSchema.safeParse("PURCHASE_RECEIPT").success).toBe(true);
      expect(stockMovementTypeSchema.safeParse("ADJUSTMENT_IN").success).toBe(true);
      expect(stockMovementTypeSchema.safeParse("ADJUSTMENT_OUT").success).toBe(true);
      expect(stockMovementTypeSchema.safeParse("DAMAGE_WRITE_OFF").success).toBe(true);
      expect(stockMovementTypeSchema.safeParse("EXPIRY_WRITE_OFF").success).toBe(true);
      expect(stockMovementTypeSchema.safeParse("STOCK_AUDIT").success).toBe(true);
    });

    it("rejects unknown movement types", () => {
      expect(stockMovementTypeSchema.safeParse("MAGIC_INCREASE").success).toBe(false);
      expect(stockMovementTypeSchema.safeParse("").success).toBe(false);
    });
  });

  describe("batchStatusSchema", () => {
    it("accepts valid batch statuses", () => {
      expect(batchStatusSchema.safeParse("ACTIVE").success).toBe(true);
      expect(batchStatusSchema.safeParse("EXPIRED").success).toBe(true);
      expect(batchStatusSchema.safeParse("DEPLETED").success).toBe(true);
      expect(batchStatusSchema.safeParse("QUARANTINED").success).toBe(true);
      expect(batchStatusSchema.safeParse("RECALLED").success).toBe(true);
    });

    it("rejects invalid batch statuses", () => {
      expect(batchStatusSchema.safeParse("PENDING").success).toBe(false);
    });
  });

  describe("batchAdjustmentSchema", () => {
    it("validates a complete batch adjustment payload", () => {
      const valid = {
        batchId: validUUID,
        batchNumber: "LOT-2026-X1",
        manufacturingDate: "2025-01-15",
        expiryDate: "2027-01-15",
        purchasePrice: 120.5,
        mrp: 180.0,
        sellingPrice: 165.0,
        quantityDelta: -5,
      };
      const result = batchAdjustmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects zero quantity delta", () => {
      const invalid = {
        batchNumber: "LOT-ZERO",
        quantityDelta: 0,
      };
      const result = batchAdjustmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid date formats", () => {
      const invalid = {
        expiryDate: "15/01/2027",
        quantityDelta: 10,
      };
      const result = batchAdjustmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("stockAdjustmentSchema", () => {
    it("validates item-level quantity adjustment", () => {
      const payload = {
        productId: validUUID,
        movementType: "ADJUSTMENT_IN",
        quantityDelta: 25,
        reason: "Physical inventory count adjustment",
      };
      const result = stockAdjustmentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("validates batch-level quantity adjustment", () => {
      const payload = {
        productId: validUUID,
        movementType: "DAMAGE_WRITE_OFF",
        batchAdjustment: {
          batchId: validUUID,
          batchNumber: "LOT-DAMAGED",
          quantityDelta: -3,
        },
        reason: "Water damage during transit",
      };
      const result = stockAdjustmentSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects adjustment when no quantity delta is specified at either item or batch level", () => {
      const payload = {
        productId: validUUID,
        movementType: "STOCK_AUDIT",
        reason: "Audit without delta",
      };
      const result = stockAdjustmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejects invalid productId format", () => {
      const payload = {
        productId: "not-a-uuid",
        movementType: "ADJUSTMENT_IN",
        quantityDelta: 10,
      };
      const result = stockAdjustmentSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });
});
