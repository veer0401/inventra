import { describe, it, expect } from "vitest";
import {
  createSaleLineSchema,
  createSalePaymentSchema,
  createSaleSchema,
  posSearchQuerySchema,
  salesFilterSchema,
  voidSaleSchema,
} from "./sales";

describe("Sales Validation Schemas", () => {
  const validUuid = "0194eb84-a4f6-7b81-a982-123456789abc";
  const validBatchUuid = "0194eb84-a4f6-7b81-a982-987654321def";

  describe("createSaleLineSchema", () => {
    it("validates a valid line item", () => {
      const valid = {
        productId: validUuid,
        batchId: validBatchUuid,
        sellingUnit: "STRIP",
        quantity: 2.5,
        discountPercentage: 10,
      };
      const result = createSaleLineSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects zero or negative quantity", () => {
      const invalid = {
        productId: validUuid,
        quantity: 0,
      };
      const result = createSaleLineSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid discount percentage > 100", () => {
      const invalid = {
        productId: validUuid,
        quantity: 1,
        discountPercentage: 105,
      };
      const result = createSaleLineSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createSalePaymentSchema", () => {
    it("validates valid CASH payment with tendered amount", () => {
      const valid = {
        paymentMethod: "CASH",
        amount: 250.5,
        tenderedAmount: 300,
        notes: "Cash counter",
      };
      const result = createSalePaymentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("validates valid UPI payment", () => {
      const valid = {
        paymentMethod: "UPI",
        amount: 150.0,
        transactionReference: "UPI-REF-99238",
      };
      const result = createSalePaymentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects zero or negative amount", () => {
      const invalid = {
        paymentMethod: "CARD",
        amount: 0,
      };
      const result = createSalePaymentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("createSaleSchema", () => {
    it("validates a complete checkout sale request", () => {
      const valid = {
        storeId: validUuid,
        saleDate: "2026-08-27",
        customerName: "Jane Doe",
        customerPhone: "9876543210",
        discountAmount: 10.0,
        roundOffAmount: 0.0,
        idempotencyKey: "POS-IDEMP-001",
        lines: [
          {
            productId: validUuid,
            quantity: 2,
            sellingUnit: "STRIP",
          },
        ],
        payments: [
          {
            paymentMethod: "CASH",
            amount: 190.0,
            tenderedAmount: 200.0,
          },
        ],
      };
      const result = createSaleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty lines array", () => {
      const invalid = {
        storeId: validUuid,
        lines: [],
        payments: [
          {
            paymentMethod: "CASH",
            amount: 100,
          },
        ],
      };
      const result = createSaleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects empty payments array", () => {
      const invalid = {
        storeId: validUuid,
        lines: [
          {
            productId: validUuid,
            quantity: 1,
          },
        ],
        payments: [],
      };
      const result = createSaleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("posSearchQuerySchema", () => {
    it("validates search query string", () => {
      const valid = { q: "Paracetamol" };
      const result = posSearchQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty query", () => {
      const invalid = { q: "   " };
      const result = posSearchQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("salesFilterSchema", () => {
    it("validates date range and status filters", () => {
      const valid = {
        status: "COMPLETED",
        startDate: "2026-08-01",
        endDate: "2026-08-27",
        page: 0,
        size: 20,
      };
      const result = salesFilterSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("voidSaleSchema", () => {
    it("validates reason with at least 3 characters", () => {
      const valid = { reason: "Customer returned order immediately" };
      const result = voidSaleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects short reason", () => {
      const invalid = { reason: "No" };
      const result = voidSaleSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
