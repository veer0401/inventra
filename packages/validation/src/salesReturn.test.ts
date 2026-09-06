import { describe, it, expect } from "vitest";
import { createSaleReturnSchema, createSaleRefundSchema, createSaleReturnLineSchema } from "./salesReturn";

describe("Sales Return Validation Schemas", () => {
  describe("createSaleReturnSchema", () => {
    it("accepts valid sale return input", () => {
      const valid = {
        reason: "Customer changed mind",
        lines: [
          {
            saleLineId: "11111111-1111-1111-1111-111111111111",
            quantity: 2,
          },
        ],
        refunds: [
          {
            refundMethod: "CASH",
            amount: 150.0,
          },
        ],
      };
      const result = createSaleReturnSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty reason", () => {
      const invalid = {
        reason: "   ",
        lines: [
          {
            saleLineId: "11111111-1111-1111-1111-111111111111",
            quantity: 2,
          },
        ],
        refunds: [
          {
            refundMethod: "CASH",
            amount: 150.0,
          },
        ],
      };
      const result = createSaleReturnSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects empty lines list", () => {
      const invalid = {
        reason: "Wrong item",
        lines: [],
        refunds: [
          {
            refundMethod: "CASH",
            amount: 150.0,
          },
        ],
      };
      const result = createSaleReturnSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects non-positive quantity", () => {
      const invalidLine = {
        saleLineId: "11111111-1111-1111-1111-111111111111",
        quantity: 0,
      };
      expect(createSaleReturnLineSchema.safeParse(invalidLine).success).toBe(false);
    });

    it("accepts valid batch allocation in return line", () => {
      const validLineWithBatch = {
        saleLineId: "11111111-1111-1111-1111-111111111111",
        quantity: 1,
        batchAllocations: [
          {
            saleLineBatchAllocationId: "22222222-2222-2222-2222-222222222222",
            returnedBaseQuantity: 1,
            stockCondition: "RESTOCKABLE",
          },
        ],
      };
      expect(createSaleReturnLineSchema.safeParse(validLineWithBatch).success).toBe(true);
    });

    it("validates refund payment method and amount", () => {
      const validRefund = {
        refundMethod: "UPI",
        amount: 250.5,
        transactionReference: "UPI-REF-123456",
      };
      expect(createSaleRefundSchema.safeParse(validRefund).success).toBe(true);

      const invalidRefund = {
        refundMethod: "INVALID_METHOD",
        amount: -10,
      };
      expect(createSaleRefundSchema.safeParse(invalidRefund).success).toBe(false);
    });
  });
});
